// Audio envelope + onset analysis for analysis/audio/ref_16k.wav (mono 16 kHz PCM16).
// Writes analysis/audio/envelope.csv (20 ms windows) and prints a summary.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const buf = readFileSync(path.join(root, "analysis", "audio", "ref_16k.wav"));
// find "data" chunk
let off = 12, dataOff = -1, dataLen = 0;
while (off < buf.length) {
  const id = buf.toString("ascii", off, off + 4), len = buf.readUInt32LE(off + 4);
  if (id === "data") { dataOff = off + 8; dataLen = len; break; }
  off += 8 + len;
}
const N = dataLen / 2, sr = 16000, win = 320; // 20 ms
const s = new Float32Array(N);
for (let i = 0; i < N; i++) s[i] = buf.readInt16LE(dataOff + i * 2) / 32768;

const rows = [], db = [], hf = [];
for (let w = 0; w * win < N; w++) {
  let e = 0, h = 0;
  for (let i = w * win; i < Math.min(N, (w + 1) * win); i++) {
    e += s[i] * s[i];
    const d = i ? s[i] - s[i - 1] : 0; h += d * d;
  }
  const rms = 10 * Math.log10(e / win + 1e-12), hrms = 10 * Math.log10(h / win + 1e-12);
  db.push(rms); hf.push(hrms);
  rows.push(`${(w * 0.02).toFixed(2)},${rms.toFixed(1)},${hrms.toFixed(1)}`);
}
writeFileSync(path.join(root, "analysis", "audio", "envelope.csv"), "time,rms_db,hf_db\n" + rows.join("\n") + "\n");

// noise floor in the quietest 5% of windows
const sorted = [...db].sort((a, b) => a - b);
console.log("floor p5 dB:", sorted[Math.floor(sorted.length * 0.05)].toFixed(1),
  "median dB:", sorted[Math.floor(sorted.length * 0.5)].toFixed(1),
  "p95 dB:", sorted[Math.floor(sorted.length * 0.95)].toFixed(1));

// speech segments: rms above -35 dB, merge gaps < 120 ms
const segs = []; let st = null;
db.forEach((v, i) => {
  const on = v > -35;
  if (on && st === null) st = i;
  if (!on && st !== null) { segs.push([st, i]); st = null; }
});
if (st !== null) segs.push([st, db.length]);
const merged = [];
for (const g of segs) {
  const last = merged[merged.length - 1];
  if (last && g[0] - last[1] < 6) last[1] = g[1]; else merged.push([...g]);
}
console.log("phrases (s):", merged.filter(g => g[1] - g[0] > 5).map(g => `${(g[0] * .02).toFixed(2)}-${(g[1] * .02).toFixed(2)}`).join(" "));

// transient onsets: HF energy jump > 9 dB over previous 60 ms average
const on = [];
for (let i = 3; i < hf.length; i++) {
  const prev = (hf[i - 1] + hf[i - 2] + hf[i - 3]) / 3;
  if (hf[i] - prev > 9 && hf[i] > -40 && (!on.length || i - on[on.length - 1] > 5)) on.push(i);
}
console.log("onsets (s / frame@30):", on.map(i => `${(i * .02).toFixed(2)}/f${Math.round(i * .02 * 30)}`).join(" "));

// level inside the silencedetect gaps (music bed check)
const gaps = [[1.48, 1.69], [4.22, 4.43], [6.81, 7.02], [11.40, 11.63], [13.92, 14.35], [24.87, 25.26], [29.03, 29.75]];
for (const [a, b] of gaps) {
  const sl = db.slice(Math.round(a / .02), Math.round(b / .02));
  console.log(`gap ${a}-${b}: mean ${(sl.reduce((x, y) => x + y, 0) / sl.length).toFixed(1)} dB, min ${Math.min(...sl).toFixed(1)}`);
}
