// Builds original background sound (ambient drone, scene whooshes, low impacts) with ffmpeg, then mixes it
// under the rendered narration: the bed ducks while the narrator speaks, and the final track is loudness-
// normalised to -14 LUFS (YouTube's target). Every sound is synthesised here, so there is no licensed
// sample library involved.
// Run from the project root:
//   FFMPEG=/path/to/ffmpeg node --import tsx examples/india-5t-model/mix-audio.ts <rendered.mp4> <spec.voiced.json> <final.mp4>
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileSpec } from "../../src/spec/compile";

const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const [video, specPath, out] = process.argv.slice(2);
if (!video || !specPath || !out) throw new Error("usage: mix-audio.ts <rendered.mp4> <spec.voiced.json> <final.mp4>");

const ff = (args: string[]) => execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

// 1. Generate the sound beds once.
const audioDir = path.join(here, "audio");
mkdirSync(audioDir, { recursive: true });
const bed = path.join(audioDir, "bed.wav");
const whoosh = path.join(audioDir, "whoosh.wav");
const impact = path.join(audioDir, "impact.wav");
if (!existsSync(bed)) {
  ff(["-f", "lavfi", "-i", "sine=f=55:d=600", "-f", "lavfi", "-i", "sine=f=82.5:d=600",
    "-f", "lavfi", "-i", "anoisesrc=d=600:c=brown:a=0.4",
    "-filter_complex",
    "[0:a]volume=0.20[a];[1:a]volume=0.10[b];[2:a]lowpass=f=260,volume=0.5[c];" +
    "[a][b][c]amix=inputs=3:normalize=0,tremolo=f=0.1:d=0.35,aecho=0.6:0.5:420:0.15," +
    "afade=t=in:d=4,afade=t=out:st=592:d=8,volume=0.5",
    "-ac", "2", "-ar", "48000", bed]);
}
if (!existsSync(whoosh)) {
  ff(["-f", "lavfi", "-i", "anoisesrc=d=1.2:c=white:a=0.5",
    "-af", "highpass=f=350,lowpass=f=3200,afade=t=in:d=0.45,afade=t=out:st=0.55:d=0.65,volume=0.5",
    "-ac", "2", "-ar", "48000", whoosh]);
}
if (!existsSync(impact)) {
  ff(["-f", "lavfi", "-i", "sine=f=62:d=1.2",
    "-af", "afade=t=out:st=0.05:d=1.1,volume=0.9", "-ac", "2", "-ar", "48000", impact]);
}

// 2. Scene start times in seconds, from the compiled timeline (frames / fps).
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const compiled = compileSpec(spec);
if (!compiled.ok) throw new Error(compiled.errors.join("\n"));
const fps = compiled.resolved.fps;
const sfx: { t: number; file: "whoosh" | "impact" }[] = [];
compiled.resolved.scenes.forEach((s: any, i: number) => {
  if (i === 0) return; // the opening cut has no whoosh
  const t = s.from / fps;
  sfx.push({ t, file: "whoosh" });
  const big = spec.scenes.find((x: any) => x.id === s.id)?.elements?.some((e: any) => e.type === "bigNumber" || e.type === "stamp");
  if (big) sfx.push({ t: t + 0.12, file: "impact" });
});

// 3. Build the filter graph: duck the bed under the narration, drop in SFX at scene starts.
const nW = sfx.filter((x) => x.file === "whoosh").length;
const nI = sfx.filter((x) => x.file === "impact").length;
const parts: string[] = [];
parts.push("[0:a]asplit=2[vo][key]");
parts.push("[1:a]volume=0.9[bed]");
parts.push(`[2:a]asplit=${Math.max(1, nW)}${Array.from({ length: Math.max(1, nW) }, (_, i) => `[w${i}]`).join("")}`);
parts.push(`[3:a]asplit=${Math.max(1, nI)}${Array.from({ length: Math.max(1, nI) }, (_, i) => `[i${i}]`).join("")}`);
const labels: string[] = [];
let wi = 0, ii = 0;
for (const e of sfx) {
  const ms = Math.round(e.t * 1000);
  const label = `s${labels.length}`;
  if (e.file === "whoosh") parts.push(`[w${wi++}]adelay=${ms}|${ms},volume=0.55[${label}]`);
  else parts.push(`[i${ii++}]adelay=${ms}|${ms},volume=0.5[${label}]`);
  labels.push(label);
}
const musicIn = ["[bed]", ...labels.map((l) => `[${l}]`)].join("");
parts.push(`${musicIn}amix=inputs=${labels.length + 1}:duration=first:normalize=0[music]`);
parts.push("[music][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[ducked]");
parts.push("[vo][ducked]amix=inputs=2:duration=first:normalize=0[mix]");
parts.push("[mix]loudnorm=I=-14:TP=-1.5:LRA=11[aout]");

ff([
  "-i", video, "-i", bed, "-i", whoosh, "-i", impact,
  "-filter_complex", parts.join(";"),
  "-map", "0:v", "-map", "[aout]",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out,
]);
console.log(JSON.stringify({ out, whooshes: nW, impacts: nI, fps }));
