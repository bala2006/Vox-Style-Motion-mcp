import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { compileSpec, type ResolvedSpec } from "../spec/compile";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = path.join(ROOT, "out");
const log = (...a: unknown[]) => console.error("[vox]", ...a);

function hashDir(dir: string, h = createHash("sha1")) {
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) hashDir(p, h);
    else h.update(name).update(readFileSync(p));
  }
  return h;
}

let bundlePromise: Promise<string> | null = null;

/** Bundle the Remotion project once per source revision (cached on disk in out/.bundles). */
export function getBundle(): Promise<string> {
  if (bundlePromise) return bundlePromise;
  bundlePromise = (async () => {
    const h = hashDir(path.join(ROOT, "src", "remotion"));
    hashDir(path.join(ROOT, "src", "spec"), h);
    const key = h.digest("hex").slice(0, 12);
    const outDir = path.join(OUT, ".bundles", key);
    if (existsSync(path.join(outDir, "index.html"))) return outDir;
    const publicDir = path.join(ROOT, "public");
    mkdirSync(publicDir, { recursive: true });
    log("bundling Remotion project…");
    const loc = await bundle({ entryPoint: path.join(ROOT, "src", "remotion", "index.tsx"), outDir, publicDir, enableCaching: true });
    log("bundle ready:", loc);
    return loc;
  })();
  bundlePromise.catch(() => { bundlePromise = null; });
  return bundlePromise;
}

/** Copy local files referenced by the spec (audio, images) into the bundle's public dir. */
function stageAssets(resolved: ResolvedSpec, bundleDir: string, baseDir: string): ResolvedSpec {
  const pubAssets = path.join(bundleDir, "public", "assets");
  mkdirSync(pubAssets, { recursive: true });
  const stage = (src: string) => {
    if (/^(https?:|data:|blob:)/.test(src) || src.startsWith("assets/")) return src;
    const abs = path.isAbsolute(src) ? src : path.resolve(baseDir, src);
    if (!existsSync(abs)) throw new Error(`Asset not found: ${src} (resolved to ${abs})`);
    const name = createHash("sha1").update(readFileSync(abs)).digest("hex").slice(0, 16) + path.extname(abs).toLowerCase();
    const dest = path.join(pubAssets, name);
    if (!existsSync(dest)) copyFileSync(abs, dest);
    return `assets/${name}`;
  };
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) o[k] = k === "src" && typeof val === "string" ? stage(val) : walk(val);
      return o;
    }
    return v;
  };
  return walk(resolved);
}

export type SpecInput = { spec?: unknown; spec_path?: string };

export function loadSpec(input: SpecInput): { spec: unknown; baseDir: string } {
  if (input.spec_path) {
    const p = path.resolve(input.spec_path);
    return { spec: JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")), baseDir: path.dirname(p) };
  }
  if (input.spec === undefined) throw new Error("Provide either `spec` (object) or `spec_path` (path to a JSON file).");
  const spec = typeof input.spec === "string" ? JSON.parse(input.spec) : input.spec;
  return { spec, baseDir: process.cwd() };
}

export function compileOrThrow(spec: unknown): ResolvedSpec {
  const r = compileSpec(spec);
  if (!r.ok) throw new Error("Spec is invalid:\n" + r.errors.join("\n"));
  return r.resolved;
}

/** OffthreadVideo needs Remotion's compositor binary, which needs glibc 2.35+ on Linux. VOX_VIDEO_ENGINE overrides. */
function videoEngine(): "offthread" | "html5" {
  const forced = process.env.VOX_VIDEO_ENGINE;
  if (forced === "html5" || forced === "offthread") return forced;
  if (process.platform !== "linux") return "offthread";
  const glibc = String((process.report?.getReport() as any)?.header?.glibcVersionRuntime ?? "");
  const [maj, min] = glibc.split(".").map(Number);
  if (!glibc || (maj === 2 && min < 35)) { log(`glibc ${glibc || "unknown"}: using Html5Video for screen recordings`); return "html5"; }
  return "offthread";
}

async function prepare(input: SpecInput) {
  const { spec, baseDir } = loadSpec(input);
  const resolved = { ...compileOrThrow(spec), videoEngine: videoEngine() };
  await ensureBrowser();
  const serveUrl = await getBundle();
  const staged = stageAssets(resolved, serveUrl, baseDir);
  const inputProps = { resolved: staged };
  const composition = await selectComposition({ serveUrl, id: "VoxVideo", inputProps, logLevel: "error" });
  return { resolved: staged, serveUrl, composition, inputProps };
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export async function renderStillFrame(input: SpecInput & { frame?: number; scene?: string; offset?: number; out_path?: string; scale?: number }) {
  const { resolved, serveUrl, composition, inputProps } = await prepare(input);
  let frame = input.frame ?? 0;
  if (input.scene) {
    const s = resolved.scenes.find((x) => x.id === input.scene);
    if (!s) throw new Error(`No scene with id "${input.scene}". Scenes: ${resolved.scenes.map((x) => x.id).join(", ")}`);
    frame = s.from + (input.offset ?? Math.floor(s.duration * 0.8));
  }
  frame = Math.max(0, Math.min(resolved.durationInFrames - 1, Math.round(frame)));
  const output = path.resolve(input.out_path ?? path.join(OUT, "stills", `still-${stamp()}-f${frame}.png`));
  mkdirSync(path.dirname(output), { recursive: true });
  await renderStill({ composition, serveUrl, inputProps, frame, output, imageFormat: "png", scale: input.scale ?? 1, logLevel: "error", offthreadVideoCacheSizeInBytes: 512 * 1024 ** 2 });
  return { output, frame, durationInFrames: resolved.durationInFrames };
}

/** Render many frames with one bundle/composition: an explicit list, or every `step` frames across a scene. */
export async function renderStillSweep(input: SpecInput & { frames?: number[]; scene?: string; step?: number; out_dir?: string; scale?: number }) {
  const { resolved, serveUrl, composition, inputProps } = await prepare(input);
  let frames = input.frames ?? [];
  if (!frames.length) {
    const s = input.scene ? resolved.scenes.find((x) => x.id === input.scene) : undefined;
    if (input.scene && !s) throw new Error(`No scene with id "${input.scene}". Scenes: ${resolved.scenes.map((x) => x.id).join(", ")}`);
    const from = s ? s.from : 0, to = s ? s.from + s.duration - 1 : resolved.durationInFrames - 1;
    const step = Math.max(1, input.step ?? (s ? 45 : 90));
    for (let fr = from; fr <= to; fr += step) frames.push(fr);
    if (frames[frames.length - 1] !== to) frames.push(to);
  }
  frames = frames.map((fr) => Math.max(0, Math.min(resolved.durationInFrames - 1, Math.round(fr))));
  const dir = path.resolve(input.out_dir ?? path.join(OUT, "stills", `sweep-${stamp()}`));
  mkdirSync(dir, { recursive: true });
  const outputs: { frame: number; scene: string; output: string }[] = [];
  for (const frame of frames) {
    const output = path.join(dir, `f${String(frame).padStart(5, "0")}.png`);
    await renderStill({ composition, serveUrl, inputProps, frame, output, imageFormat: "png", scale: input.scale ?? 0.3, logLevel: "error", offthreadVideoCacheSizeInBytes: 512 * 1024 ** 2 });
    const sc = [...resolved.scenes].reverse().find((x) => x.from <= frame);
    outputs.push({ frame, scene: sc?.id ?? "", output });
  }
  return { dir, stills: outputs, durationInFrames: resolved.durationInFrames };
}

export async function renderVideoFile(input: SpecInput & { out_path?: string; from_frame?: number; to_frame?: number; concurrency?: number; crf?: number }) {
  const { resolved, serveUrl, composition, inputProps } = await prepare(input);
  const output = path.resolve(input.out_path ?? path.join(OUT, "videos", `${(resolved.title || "video").replace(/[^\w-]+/g, "_")}-${stamp()}.mp4`));
  mkdirSync(path.dirname(output), { recursive: true });
  const last = resolved.durationInFrames - 1;
  const range: [number, number] | null = input.from_frame !== undefined || input.to_frame !== undefined
    ? [Math.max(0, input.from_frame ?? 0), Math.min(last, input.to_frame ?? last)] : null;
  let lastPct = -10;
  const started = Date.now();
  await renderMedia({
    composition, serveUrl, inputProps, codec: "h264", audioCodec: "aac", audioBitrate: "192k", crf: input.crf ?? 17,
    x264Preset: "medium", pixelFormat: "yuv420p", outputLocation: output,
    frameRange: range, concurrency: input.concurrency ?? null, logLevel: "error",
    offthreadVideoCacheSizeInBytes: 2 * 1024 ** 3,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= lastPct + 10) { lastPct = pct; log(`render ${pct}%`); }
    },
  });
  const frames = range ? range[1] - range[0] + 1 : resolved.durationInFrames;
  return { output, frames, seconds: +(frames / resolved.fps).toFixed(2), renderSeconds: +((Date.now() - started) / 1000).toFixed(1) };
}

export function writeJson(p: string, data: unknown) {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}
