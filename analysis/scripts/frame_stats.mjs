// Per-frame statistics for every frame of the reference video.
// Decodes at 480x270 RGB through ffmpeg and writes analysis/raw/frame_stats.csv.
// Coordinates in the CSV are scaled back to 1920x1080 source pixels (x4).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const ffmpeg = path.join(root, ".tools", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const video = path.join(root, "Vox Style Reference video.mp4");
const W = 480, H = 270, S = 4, FRAME = W * H * 3;

const classes = {
  red: (r, g, b) => r > 150 && g < 90 && b < 90,
  yellow: (r, g, b) => r > 200 && g > 160 && b < 100,
  green: (r, g, b) => g > r + 20 && g > b + 10,
  dark: (r, g, b) => r + g + b < 180,
};

const rows = [];
let prev = null, buf = Buffer.alloc(0), n = 0;

function bbox() { return { x0: W, y0: H, x1: -1, y1: -1, n: 0 }; }
function grow(b, x, y) { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.n++; }
function fmt(b) { return b.n ? [b.x0 * S, b.y0 * S, (b.x1 + 1) * S, (b.y1 + 1) * S] : ["", "", "", ""]; }

function analyse(f) {
  const diff = bbox(), boxes = Object.fromEntries(Object.keys(classes).map(k => [k, bbox()]));
  let luma = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = f[i], g = f[i + 1], b = f[i + 2];
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (const k in classes) if (classes[k](r, g, b)) grow(boxes[k], x, y);
    if (prev && Math.abs(r - prev[i]) + Math.abs(g - prev[i + 1]) + Math.abs(b - prev[i + 2]) > 45) grow(diff, x, y);
  }
  const px = W * H;
  rows.push([n, (n / 30).toFixed(3), (luma / px).toFixed(1), (diff.n / px * 100).toFixed(2), ...fmt(diff),
    ...Object.keys(classes).flatMap(k => [(boxes[k].n / px * 100).toFixed(2), ...fmt(boxes[k])])].join(","));
  prev = Buffer.from(f); n++;
}

const p = spawn(ffmpeg, ["-v", "error", "-i", video, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
p.stdout.on("data", d => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= FRAME) { analyse(buf.subarray(0, FRAME)); buf = buf.subarray(FRAME); }
});
p.stderr.pipe(process.stderr);
p.on("close", () => {
  const head = ["frame", "time", "luma", "changed_pct", "chg_x0", "chg_y0", "chg_x1", "chg_y1",
    ...Object.keys(classes).flatMap(k => [`${k}_pct`, `${k}_x0`, `${k}_y0`, `${k}_x1`, `${k}_y1`])].join(",");
  mkdirSync(path.join(root, "analysis", "raw"), { recursive: true });
  writeFileSync(path.join(root, "analysis", "raw", "frame_stats.csv"), head + "\n" + rows.join("\n") + "\n");
  console.log(`frames analysed: ${n}`);
});
