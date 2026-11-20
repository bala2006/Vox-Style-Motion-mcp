// Generates ElevenLabs narration for spec.json and writes spec.voiced.json (exact word timings).
// Run from the project root: node --env-file=.env --import tsx examples/india-5t-model/voice.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { voiceSpec, DEFAULT_VOICE } from "../../src/node/elevenlabs";
import type { VideoSpec } from "../../src/spec/schema";

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(path.join(here, "spec.json"), "utf8")) as VideoSpec;
const outDir = path.join(here, "voice");

const { spec: voiced, done } = await voiceSpec(spec, outDir, {
  voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE,
  // Pace set by the user: 1.0.
  settings: { speed: 1.0, stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
});
writeFileSync(path.join(outDir, "spec.voiced.json"), JSON.stringify(voiced, null, 2) + "\n");
const total = done.reduce((a, d) => a + d.duration, 0);
console.log(JSON.stringify({ scenes: done.length, total_seconds: +total.toFixed(1), minutes: +(total / 60).toFixed(2) }));
