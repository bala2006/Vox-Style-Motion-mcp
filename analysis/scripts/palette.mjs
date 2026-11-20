// Full-resolution palette sampling for selected frames.
// Usage: node palette.mjs 0 72 150 ...  -> prints background, vignette ramp and dominant colours.
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const ffmpeg = path.join(root, ".tools", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const video = path.join(root, "Vox Style Reference video.mp4");
const W = 1920, H = 1080;
const frames = process.argv.slice(2).map(Number);
const hex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

for (const f of frames) {
  const out = spawnSync(ffmpeg, ["-v", "error", "-i", video, "-vf", `select=eq(n\\,${f})`, "-vsync", "0", "-frames:v", "1",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: W * H * 4 });
  const px = out.stdout;
  const at = (x, y) => { const i = (y * W + x) * 3; return [px[i], px[i + 1], px[i + 2]]; };
  const patch = (cx, cy, r = 6) => {
    const acc = [[], [], []];
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) at(x, y).forEach((v, k) => acc[k].push(v));
    return acc.map(a => a.sort((p, q) => p - q)[a.length >> 1]);
  };
  // vignette ramp along the horizontal centre line and the diagonal
  const ramp = [0.5, 0.35, 0.2, 0.08, 0.02].map(t => hex(...patch(Math.round(W * t) + 6, Math.round(H * t) + 6)));
  // dominant colours (quantised to 8 levels per channel), ignoring near-background
  const bg = patch(960, 540, 20);
  const hist = new Map();
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const [r, g, b] = at(x, y);
    if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) < 60) continue;
    const k = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    const e = hist.get(k) || [0, 0, 0, 0]; e[0] += r; e[1] += g; e[2] += b; e[3]++; hist.set(k, e);
  }
  const top = [...hist.values()].sort((a, b) => b[3] - a[3]).slice(0, 8)
    .map(e => `${hex(e[0] / e[3], e[1] / e[3], e[2] / e[3])}:${(e[3] / (W * H / 4) * 100).toFixed(2)}%`);
  console.log(`f${f} centre ${hex(...bg)} diag-ramp ${ramp.join(">")} | ${top.join(" ")}`);
}
