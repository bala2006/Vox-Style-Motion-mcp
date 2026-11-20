// Record real software for screen boxes: a scripted Chromium session captured with the CDP screencast,
// with a visible cursor and click pulses injected into the page, encoded to a constant 30 fps H.264 MP4.
// Returns the recording time of every step so specs can time-remap the footage onto the narration.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ensureBrowser } from "@remotion/renderer";
import { ROOT, OUT } from "./render";

const log = (...a: unknown[]) => console.error("[vox capture]", ...a);

export type CaptureStep = {
  do: "goto" | "click" | "type" | "press" | "hover" | "scroll" | "wait" | "waitFor" | "screenshot" | "mark";
  url?: string; selector?: string; text?: string; key?: string; y?: number; ms?: number; delay?: number;
  name?: string; fullPage?: boolean; timeout?: number;
  /** Record this step's start time under this name (also set automatically for `mark` steps). */
  mark?: string;
};

export type CaptureInput = {
  steps: CaptureStep[];
  out_path?: string;
  viewport?: { width: number; height: number };
  tail_ms?: number;
  cursor?: boolean;
};

// Injected into every page: a visible pointer (headless pages draw none) and a yellow click ring.
const CURSOR_SCRIPT = `(() => {
  const install = () => {
    if (document.getElementById("__vox_cursor")) return;
    const c = document.createElement("div");
    c.id = "__vox_cursor";
    c.style.cssText = "position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:transform .45s cubic-bezier(.22,1,.36,1);transform:translate(-40px,-40px)";
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
  };
  // Coordinates arrive in screen pixels; the root may carry CSS zoom, so convert to its CSS pixels.
  const z = () => parseFloat(document.documentElement.style.zoom || "1") || 1;
  window.__voxMove = (x, y) => { install(); document.getElementById("__vox_cursor").style.transform = "translate(" + (x / z() - 3) + "px," + (y / z() - 2) + "px)"; };
  window.__voxPulse = (sx, sy) => {
    const x = sx / z(), y = sy / z();
    const r = document.createElement("div");
    r.style.cssText = "position:fixed;left:" + (x - 18) + "px;top:" + (y - 18) + "px;width:36px;height:36px;border-radius:50%;border:2px solid #F1D01A;z-index:2147483646;pointer-events:none;transition:all .5s ease-out;opacity:1";
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
    setTimeout(() => r.remove(), 600);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

async function browserPath(): Promise<string> {
  if (process.env.VOX_BROWSER_PATH) return process.env.VOX_BROWSER_PATH;
  const st = await ensureBrowser();
  if ("path" in st && st.path) return st.path;
  throw new Error("No browser for capture. Set VOX_BROWSER_PATH to a Chrome/Chromium executable.");
}

function toUrl(u: string) {
  if (/^[a-z]+:/i.test(u)) return u;
  const abs = path.resolve(u);
  if (existsSync(abs)) return pathToFileURL(abs).href;
  return u;
}

function ffmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js"), "ffmpeg", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1500)}`))));
  });
}

export async function captureScreen(input: CaptureInput) {
  const { chromium } = await import("playwright-core");
  const out = path.resolve(input.out_path ?? path.join(OUT, "captures", `capture-${Date.now()}.mp4`));
  const work = out.replace(/\.[^.]+$/, "") + ".frames";
  rmSync(work, { recursive: true, force: true });
  mkdirSync(path.join(work, "f"), { recursive: true });
  const vp = input.viewport ?? { width: 1440, height: 810 };
  // The headless shell's screencast captures at CSS-pixel size and ignores deviceScaleFactor. Landscape captures
  // therefore lay out at 1920 px wide with CSS zoom on the root (a 1440 px layout fills native 1920x1080 frames).
  // Portrait captures (phones) keep their real viewport for media queries and use 3x for crisp screenshots.
  const landscape = vp.width >= vp.height;
  const zoom = landscape ? 1920 / vp.width : 1;

  const browser = await chromium.launch({ executablePath: await browserPath(), headless: true });
  const shots: Record<string, string> = {};
  const marks: Record<string, number> = {};
  const stepTimes: { i: number; do: string; t: number }[] = [];
  const frames: { ts: number; file: string }[] = [];
  let t0 = 0;
  try {
    const ctx = await browser.newContext(landscape
      ? { viewport: { width: 1920, height: Math.round(vp.height * zoom) }, deviceScaleFactor: 1 }
      : { viewport: vp, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    if (zoom !== 1) {
      await ctx.addInitScript(`(() => { const z = () => { if (document.documentElement) document.documentElement.style.zoom = "${zoom}"; };
        z(); document.addEventListener("DOMContentLoaded", z); })();`);
    }
    if (input.cursor !== false) await ctx.addInitScript(CURSOR_SCRIPT);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    let n = 0;
    cdp.on("Page.screencastFrame", async (ev: any) => {
      const file = `f/${String(++n).padStart(6, "0")}.jpg`;
      writeFileSync(path.join(work, file), Buffer.from(ev.data, "base64"));
      frames.push({ ts: ev.metadata.timestamp, file });
      try { await cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }); } catch { /* page closing */ }
    });
    await page.goto("about:blank");
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    t0 = Date.now() / 1000;
    const now = () => +(Date.now() / 1000 - t0).toFixed(3);

    const target = async (s: CaptureStep) => {
      const loc = s.selector ? page.locator(s.selector).first() : s.text ? page.getByText(s.text, { exact: false }).first() : null;
      if (!loc) throw new Error(`step "${s.do}" needs selector or text`);
      await loc.waitFor({ state: "visible", timeout: s.timeout ?? 15000 });
      await loc.scrollIntoViewIfNeeded();
      const b = await loc.boundingBox();
      if (!b) throw new Error(`no box for ${s.selector ?? s.text}`);
      return { loc, x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const moveTo = async (x: number, y: number) => {
      if (input.cursor === false) return;
      await page.evaluate(([a, b]) => (window as any).__voxMove?.(a, b), [x, y]);
      await page.waitForTimeout(450);
    };

    for (let i = 0; i < input.steps.length; i++) {
      const s = input.steps[i];
      const at = now();
      stepTimes.push({ i, do: s.do, t: at });
      if (s.mark) marks[s.mark] = at;
      switch (s.do) {
        case "goto": await page.goto(toUrl(s.url!), { waitUntil: "load" }); break;
        case "click": {
          const { x, y } = await target(s);
          await moveTo(x, y);
          await page.evaluate(([a, b]) => (window as any).__voxPulse?.(a, b), [x, y]);
          await page.mouse.click(x, y);
          break;
        }
        case "hover": { const { x, y } = await target(s); await moveTo(x, y); await page.mouse.move(x, y); break; }
        case "type": {
          if (s.selector) { const { x, y } = await target(s); await moveTo(x, y); await page.mouse.click(x, y); }
          await page.keyboard.type(s.text ?? "", { delay: s.delay ?? 45 });
          break;
        }
        case "press": await page.keyboard.press(s.key!); break;
        case "scroll":
          if (s.selector) await page.locator(s.selector).first().evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" }));
          else await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "smooth" }), s.y ?? 600);
          await page.waitForTimeout(s.ms ?? 900);
          break;
        case "wait": await page.waitForTimeout(s.ms ?? 1000); break;
        case "waitFor": await page.locator(s.selector!).first().waitFor({ state: "visible", timeout: s.timeout ?? 30000 }); break;
        case "screenshot": {
          const name = s.name ?? `shot-${i}`;
          const file = out.replace(/\.[^.]+$/, "") + `.${name}.png`;
          await page.screenshot({ path: file, fullPage: s.fullPage ?? false });
          shots[name] = file;
          break;
        }
        case "mark": marks[s.name ?? `mark-${i}`] = at; break;
      }
    }
    await page.waitForTimeout(input.tail_ms ?? 1200);
    await cdp.send("Page.stopScreencast");
  } finally {
    await browser.close();
  }
  const end = Date.now() / 1000;
  if (!frames.length) throw new Error("The screencast produced no frames.");

  // Frames arrive only when the page repaints; hold each one until the next so time stays real.
  frames.sort((a, b) => a.ts - b.ts);
  const first = frames[0].ts;
  const lines = ["ffconcat version 1.0"];
  frames.forEach((fr, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].ts : end;
    lines.push(`file '${fr.file}'`, `duration ${Math.max(0.001, next - fr.ts).toFixed(4)}`);
  });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(path.join(work, "list.ffconcat"), lines.join("\n") + "\n");
  mkdirSync(path.dirname(out), { recursive: true });
  log(`encoding ${frames.length} frames…`);
  // Remotion's bundled ffmpeg has a minimal filter set (scale, format, crop; no fps/pad), so the constant
  // frame rate comes from the output options and the size is only rounded to even numbers.
  await ffmpeg(["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(work, "list.ffconcat"),
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-r", "30", "-fps_mode", "cfr",
    "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", out]);
  rmSync(work, { recursive: true, force: true });

  // Recording time 0 is the first frame; shift step times onto it.
  const shift = first - t0;
  const fix = (v: number) => +Math.max(0, v - shift).toFixed(2);
  const result = {
    video: out,
    duration: +(end - first).toFixed(2),
    marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, fix(v)])),
    steps: stepTimes.map((s) => ({ ...s, t: fix(s.t) })),
    screenshots: shots,
    frames: frames.length,
  };
  // The file on disk sits next to the media, so it stores bare file names (portable, no machine paths).
  const onDisk = {
    ...result,
    video: path.basename(out),
    screenshots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, path.basename(v)])),
  };
  writeFileSync(out.replace(/\.[^.]+$/, "") + ".marks.json", JSON.stringify(onDisk, null, 2) + "\n");
  return result;
}
