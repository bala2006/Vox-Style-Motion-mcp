// Sarvam AI narration (bulbul TTS, natural Indian-English voices). Ported from the Octopus demo's voice.py:
// one TTS call per sentence, cached on disk, silence trimmed, joined with measured gaps, word timings spread
// by syllable weight, and an optional saaras speech-to-text round trip that flags lines the voice misread.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { VideoSpec, Word } from "../spec/schema";
import { OUT } from "./render";

const API = "https://api.sarvam.ai";
export const SARVAM_DEFAULTS = {
  model: process.env.SARVAM_MODEL || "bulbul:v4-flash",
  speaker: process.env.SARVAM_SPEAKER || "shubh_en_narration",
  language_code: process.env.SARVAM_LANGUAGE || "en-IN",
  pace: Number(process.env.SARVAM_PACE || 1.07),
  sample_rate: 48000,
};
/** Speakers tried on the Octopus demo (bulbul:v4-flash, en-IN). shubh_en_narration was the pick: calm, clear, male. */
export const SARVAM_TESTED_SPEAKERS = [
  { speaker: "shubh_en_narration", note: "Male, Indian English, warm narration. Used for the Octopus demo." },
  { speaker: "sarang_en_narration", note: "Male, Indian English, narration; a little flatter." },
  { speaker: "girish_en_documentary", note: "Male, documentary read; slower and heavier." },
];
const GAP_SENTENCE = 0.28;
const TAIL = 0.12;

export class SarvamKeyError extends Error {
  constructor() {
    super("SARVAM_API_KEY is not set. Add it to the MCP server's environment (or the project .env) and restart the server.");
  }
}
const key = () => {
  const k = process.env.SARVAM_API_KEY?.trim();
  if (!k) throw new SarvamKeyError();
  return k;
};

type Voice = typeof SARVAM_DEFAULTS;

async function tts(text: string, v: Voice): Promise<Buffer> {
  const body = JSON.stringify({ text, language_code: v.language_code, model: v.model, speaker: v.speaker, pace: v.pace, speech_sample_rate: v.sample_rate, enable_preprocessing: true });
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${API}/text-to-speech`, { method: "POST", headers: { "api-subscription-key": key(), "Content-Type": "application/json" }, body });
      if (!res.ok) {
        const msg = (await res.text()).slice(0, 500);
        if (res.status === 429 || res.status >= 500) throw new Error(`Sarvam ${res.status}: ${msg}`);
        throw Object.assign(new Error(`Sarvam ${res.status}: ${msg}`), { fatal: true });
      }
      const j: any = await res.json();
      return Buffer.from((j.audios as string[]).join(""), "base64");
    } catch (e: any) {
      if (e?.fatal || e instanceof SarvamKeyError) throw e;
      last = e;
      await new Promise((r) => setTimeout(r, 2000 + attempt * 3000));
    }
  }
  throw new Error(`Sarvam TTS failed for "${text.slice(0, 60)}": ${String(last)}`);
}

async function stt(wav: Buffer, language: string): Promise<string> {
  const form = new FormData();
  form.append("model", "saaras:v4");
  form.append("language_code", language);
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "line.wav");
  const res = await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "api-subscription-key": key() }, body: form });
  if (!res.ok) throw new Error(`Sarvam STT ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()) as any).transcript ?? "";
}

/** 16-bit PCM samples (first channel) and the sample rate of a WAV file. */
function readPcm(buf: Buffer): { pcm: Int16Array; rate: number } {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Sarvam returned audio that is not WAV");
  let off = 12, rate = 0, ch = 1, bits = 16;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") { ch = buf.readUInt16LE(off + 10); rate = buf.readUInt32LE(off + 12); bits = buf.readUInt16LE(off + 22); }
    if (id === "data") {
      if (bits !== 16) throw new Error(`expected 16-bit audio, got ${bits}-bit`);
      const end = Math.min(buf.length, off + 8 + size);
      const all = new Int16Array(buf.buffer.slice(buf.byteOffset + off + 8, buf.byteOffset + end - ((end - off - 8) % 2)));
      if (ch === 1) return { pcm: all, rate };
      const mono = new Int16Array(Math.floor(all.length / ch));
      for (let i = 0; i < mono.length; i++) mono[i] = all[i * ch];
      return { pcm: mono, rate };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

function writeWav(file: string, pcm: Int16Array, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length * 2, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length * 2, 40);
  writeFileSync(file, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]));
}

/** Cut leading/trailing silence (10 ms windows, peak > 500), keeping `pad` seconds. */
function trim(a: Int16Array, rate: number, thresh = 500, pad = 0.04) {
  const win = Math.round(rate * 0.01);
  const loud = (i: number) => { for (let k = i; k < Math.min(a.length, i + win); k++) if (Math.abs(a[k]) > thresh) return true; return false; };
  let s = 0; while (s < a.length && !loud(s)) s += win;
  let e = a.length; while (e > s && !loud(Math.max(0, e - win))) e -= win;
  const p = Math.round(rate * pad);
  return a.subarray(Math.max(0, s - p), Math.min(a.length, e + p));
}

/** Spread words over a clip by a syllable-ish weight; punctuation adds a short pause. */
function wordTimes(text: string, dur: number, offset: number): Word[] {
  const words = text.split(/\s+/).filter(Boolean);
  const weight = (w: string) => {
    const core = w.replace(/[^A-Za-z0-9]/g, "");
    const digits = (core.match(/\d/g) || []).length;
    const vowels = (core.toLowerCase().match(/[aeiouy]+/g) || []).length;
    return Math.max(1, vowels + digits * 1.4) + core.length * 0.08;
  };
  const pause = words.map((w) => (/[.,?!;:]$/.test(w) ? 0.35 : 0));
  const total = words.reduce((a, w, i) => a + weight(w) + pause[i], 0) || 1;
  let acc = 0;
  return words.map((w, i) => {
    const start = (acc / total) * dur;
    acc += weight(w);
    const end = (acc / total) * dur;
    acc += pause[i];
    return { text: w, start: +(offset + start).toFixed(3), end: +(offset + end).toFixed(3) };
  });
}

export const splitSentences = (text: string) =>
  text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“'₹$])/).filter(Boolean);

// STT writes numbers as digits ("forty two" -> "42"), so numbers are dropped from both sides before comparing.
const NUMBER_WORDS = new Set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand lakh lakhs crore crores million billion point and".split(" "));
const normWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^\d+$/.test(w) && !NUMBER_WORDS.has(w));

/** Generate one WAV per narrated scene with Sarvam; returns the spec with `voiceover` filled in. */
export async function sarvamVoiceSpec(spec: VideoSpec, outDir: string, opts: { speaker?: string; model?: string; language?: string; pace?: number; scenes?: string[]; check?: boolean }) {
  key();
  const v: Voice = { ...SARVAM_DEFAULTS, ...(opts.speaker ? { speaker: opts.speaker } : {}), ...(opts.model ? { model: opts.model } : {}), ...(opts.language ? { language_code: opts.language } : {}), ...(opts.pace ? { pace: opts.pace } : {}) };
  const cache = path.join(OUT, "voice-cache", "sarvam");
  mkdirSync(cache, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const voiceover = { ...(spec.voiceover ?? {}) };
  const done: { scene: string; file: string; duration: number; words: number; sentences: number }[] = [];
  const problems: { scene: string; sentence: string; heard: string; match: number }[] = [];
  for (const s of spec.scenes) {
    if (!s.narration) continue;
    if (opts.scenes && !opts.scenes.includes(s.id)) continue;
    const parts: Int16Array[] = [];
    const words: Word[] = [];
    let cursor = 0;
    for (const [i, sentence] of splitSentences(s.narration).entries()) {
      const h = createHash("sha1").update(JSON.stringify([sentence, v])).digest("hex").slice(0, 16);
      const file = path.join(cache, `${h}.wav`);
      if (!existsSync(file)) writeFileSync(file, await tts(sentence, v));
      const raw = readFileSync(file);
      const { pcm, rate } = readPcm(raw);
      if (rate !== v.sample_rate) throw new Error(`Sarvam returned ${rate} Hz, expected ${v.sample_rate}`);
      if (i > 0) { parts.push(new Int16Array(Math.round(v.sample_rate * GAP_SENTENCE))); cursor += GAP_SENTENCE; }
      const clip = trim(pcm, rate);
      const dur = clip.length / rate;
      parts.push(clip);
      words.push(...wordTimes(sentence, dur, cursor));
      cursor += dur;
      if (opts.check) {
        const heard = await stt(raw, v.language_code);
        const exp = new Set(normWords(sentence)), got = new Set(normWords(heard));
        const match = [...exp].filter((w) => got.has(w)).length / Math.max(1, exp.size);
        if (match <= 0.8) problems.push({ scene: s.id, sentence, heard, match: +match.toFixed(2) });
      }
    }
    parts.push(new Int16Array(Math.round(v.sample_rate * TAIL)));
    const total = parts.reduce((a, p) => a + p.length, 0);
    const pcm = new Int16Array(total);
    let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length; }
    const name = `${s.id.replace(/[^\w-]+/g, "_")}.wav`;
    writeWav(path.join(outDir, name), pcm, v.sample_rate);
    const duration = +(total / v.sample_rate).toFixed(3);
    // Relative path: the voiced spec sits next to its audio, and asset paths resolve from the spec's folder.
    voiceover[s.id] = { audio: name, duration, words };
    done.push({ scene: s.id, file: path.join(outDir, name), duration: +duration.toFixed(2), words: words.length, sentences: splitSentences(s.narration).length });
  }
  return { spec: { ...spec, voiceover }, done, problems, voice: v };
}
