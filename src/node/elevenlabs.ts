import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { VideoSpec, Word } from "../spec/schema";

const API = "https://api.elevenlabs.io";
export const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
export const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
// Tuned toward the reference read: fast, confident, dry.
export const DEFAULT_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 1.08 };

export class MissingKeyError extends Error {
  constructor() {
    super("ELEVENLABS_API_KEY is not set. Add it to the MCP server's environment (or a .env file in the project root) and restart the server. Until then, render with estimated timings: omit `voiceover` from the spec and set `wpm` if needed.");
  }
}

export function apiKey(): string {
  const k = process.env.ELEVENLABS_API_KEY?.trim();
  if (!k) throw new MissingKeyError();
  return k;
}

async function call(pathname: string, init: RequestInit & { query?: Record<string, string> } = {}) {
  const url = new URL(API + pathname);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, { ...init, headers: { "xi-api-key": apiKey(), "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status} ${res.statusText} on ${pathname}: ${body.slice(0, 600)}`);
  }
  return res.json() as Promise<any>;
}

export async function listVoices() {
  const j = await call("/v1/voices");
  return (j.voices ?? []).map((v: any) => ({ voice_id: v.voice_id, name: v.name, category: v.category, labels: v.labels, description: v.description }));
}

/** Group character alignment into words (whitespace-separated, punctuation kept with the word). */
export function alignmentToWords(al: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }): Word[] {
  const words: Word[] = [];
  let cur = "", start = 0, end = 0;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push({ text: cur, start, end });
      cur = "";
      return;
    }
    if (!cur) start = al.character_start_times_seconds[i];
    cur += ch;
    end = al.character_end_times_seconds[i];
  });
  if (cur) words.push({ text: cur, start, end });
  return words;
}

export async function ttsWithTimestamps(opts: { text: string; voiceId?: string; modelId?: string; previousText?: string; nextText?: string; settings?: Record<string, unknown>; seed?: number }) {
  const j = await call(`/v1/text-to-speech/${encodeURIComponent(opts.voiceId ?? DEFAULT_VOICE)}/with-timestamps`, {
    method: "POST",
    query: { output_format: "mp3_44100_128" },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId ?? DEFAULT_MODEL,
      voice_settings: { ...DEFAULT_SETTINGS, ...(opts.settings ?? {}) },
      previous_text: opts.previousText || undefined,
      next_text: opts.nextText || undefined,
      seed: opts.seed,
    }),
  });
  const audio = Buffer.from(j.audio_base64, "base64");
  const al = j.alignment ?? j.normalized_alignment;
  const words = al ? alignmentToWords(al) : [];
  const duration = al?.character_end_times_seconds?.length ? al.character_end_times_seconds[al.character_end_times_seconds.length - 1] + 0.12 : 0;
  return { audio, words, duration };
}

/** Generate one narration clip per scene; returns the spec with `voiceover` filled in. */
export async function voiceSpec(spec: VideoSpec, outDir: string, opts: { voiceId?: string; modelId?: string; settings?: Record<string, unknown>; scenes?: string[]; seed?: number }) {
  apiKey();
  mkdirSync(outDir, { recursive: true });
  const voiceover = { ...(spec.voiceover ?? {}) };
  const narrated = spec.scenes.filter((s) => s.narration);
  const done: { scene: string; file: string; duration: number; words: number }[] = [];
  for (let i = 0; i < narrated.length; i++) {
    const s = narrated[i];
    if (opts.scenes && !opts.scenes.includes(s.id)) continue;
    const r = await ttsWithTimestamps({
      text: s.narration!, voiceId: opts.voiceId, modelId: opts.modelId, settings: opts.settings, seed: opts.seed,
      previousText: narrated.slice(Math.max(0, i - 2), i).map((x) => x.narration).join(" "),
      nextText: narrated[i + 1]?.narration,
    });
    const file = path.join(outDir, `${s.id.replace(/[^\w-]+/g, "_")}.mp3`);
    writeFileSync(file, r.audio);
    voiceover[s.id] = { audio: file, duration: +r.duration.toFixed(3), words: r.words.map((w) => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) })) };
    done.push({ scene: s.id, file, duration: +r.duration.toFixed(2), words: r.words.length });
  }
  return { spec: { ...spec, voiceover }, done };
}
