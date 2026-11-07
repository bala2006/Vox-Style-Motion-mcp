// Pure TypeScript (no Node APIs): used by the MCP server and safe to import in the Remotion bundle.
import { VideoSpec, type Anchor, type Word, type Scene } from "./schema";

export type Transition = "pushRight" | "pushBottom" | "blur" | "cut";
export const TRANSITION_FRAMES: Record<Transition, number> = { pushRight: 10, pushBottom: 9, blur: 3, cut: 0 };

export type TimedWord = { text: string; norm: string; frame: number; endFrame: number };

export type ResolvedScene = {
  id: string;
  index: number;
  from: number;          // global frame where the scene starts
  duration: number;      // frames until the next scene starts
  overlap: number;       // extra frames this scene keeps rendering under the next scene's transition
  background: "paper" | "black";
  transition: Transition;
  transitionFrames: number;
  leadIn: number;        // frames from scene start to the first spoken word
  source?: string;
  sourceAt: number;
  audio?: { src: string; from: number };
  words: TimedWord[];
  // Elements with every anchor replaced by a scene-local frame number.
  elements: Array<Record<string, any> & { type: string; at: number }>;
};

export type ResolvedCounter = {
  label: string;
  ratePerSecond: number;
  prefix: string;
  bigUntil: number;      // global frame where the big counter starts flying to the corner (-1 = never big)
  flash?: [number, number];
  hideFrom?: number;
  y: number;
};

export type ResolvedSpec = {
  title: string;
  fps: number;
  width: number;
  height: number;
  cadence: "on-threes" | "smooth";
  durationInFrames: number;
  counter?: ResolvedCounter;
  scenes: ResolvedScene[];
  warnings: string[];
};

export const normWord = (w: string) => w.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9%]/g, "");

/** Strip **bold** and ==highlight== markers and split into words. */
export function headlineWords(text: string): { word: string; bold: boolean; hl: boolean }[] {
  const out: { word: string; bold: boolean; hl: boolean }[] = [];
  let bold = false, hl = false;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    let w = raw;
    let b = bold, h = hl;
    // opening markers
    while (w.startsWith("**") || w.startsWith("==")) {
      if (w.startsWith("**")) { bold = true; b = true; w = w.slice(2); }
      else { hl = true; h = true; w = w.slice(2); }
    }
    // closing markers (may be followed by punctuation)
    let closeB = false, closeH = false;
    for (;;) {
      const m = w.match(/(\*\*|==)([^*=]*)$/);
      if (!m) break;
      if (m[1] === "**") closeB = true; else closeH = true;
      w = w.slice(0, m.index) + m[2];
    }
    out.push({ word: w, bold: b || h, hl: h });
    if (closeB) bold = false;
    if (closeH) hl = false;
  }
  return out;
}

/** Estimate word timings (seconds) from a speaking rate when no voiceover exists. */
export function estimateWords(text: string, wpm = 205): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const base = 60 / wpm;
  const weights = tokens.map((tok) => {
    const digits = (tok.match(/\d/g) || []).length;
    const letters = tok.replace(/[^A-Za-z]/g, "").length;
    const len = digits ? digits * 2.6 + 2 : letters;
    return 0.45 + 0.55 * Math.min(len, 16) / 4.7;
  });
  const mean = weights.reduce((a, b) => a + b, 0) / Math.max(1, weights.length);
  const out: Word[] = [];
  let t = 0;
  tokens.forEach((tok, i) => {
    const d = base * weights[i] / mean;
    out.push({ text: tok, start: t, end: t + d });
    t += d;
    if (/[.!?]["”)]?$/.test(tok)) t += 0.26;
    else if (/[,;:—–]$/.test(tok)) t += 0.2;
  });
  return out;
}

const ANCHOR_KEYS = new Set([
  "at", "exitAt", "dimAt", "shrinkAt", "highlightAt", "focusAt", "circleAt", "pullBackAt",
  "reorderAt", "dockAt", "freezeAt", "valueAt", "moveAt",
]);

type Resolver = (a: Anchor | undefined, fallback: number) => number;

function makeResolver(words: TimedWord[], leadIn: number, duration: number, where: string, warnings: string[]): Resolver {
  return (a, fallback) => {
    if (a === undefined || a === null) return fallback;
    if (typeof a === "number") return Math.round(a);
    const m = String(a).trim().match(/^(.*?)(?:#(\d+))?\s*([+-]\s*\d+)?$/);
    if (!m) { warnings.push(`${where}: cannot parse anchor "${a}"`); return fallback; }
    const key = m[1].trim();
    const nth = m[2] ? parseInt(m[2], 10) : 1;
    const off = m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0;
    if (key === "start" || key === "") return off;
    if (key === "end") return duration + off;
    if (key === "voice") return leadIn + off;
    const n = normWord(key);
    let count = 0;
    for (const w of words) {
      if (w.norm === n || (n.length >= 4 && w.norm.startsWith(n))) {
        count++;
        if (count === nth) return w.frame + off;
      }
    }
    warnings.push(`${where}: anchor "${a}" does not match a narration word; using frame ${fallback + off}`);
    return fallback + off;
  };
}

function resolveDeep(v: any, r: Resolver, fallback: number): any {
  if (Array.isArray(v)) return v.map((x) => resolveDeep(x, r, fallback));
  if (v && typeof v === "object") {
    const o: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (ANCHOR_KEYS.has(k)) o[k] = r(val as Anchor, fallback);
      else o[k] = resolveDeep(val, r, fallback);
    }
    return o;
  }
  return v;
}

export type CompileResult = { ok: true; resolved: ResolvedSpec } | { ok: false; errors: string[] };

export function compileSpec(input: unknown): CompileResult {
  const parsed = VideoSpec.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }
  const spec = parsed.data;
  const fps = spec.fps ?? 30;
  const warnings: string[] = [];
  const scenes: ResolvedScene[] = [];
  let cursor = 0;

  spec.scenes.forEach((sc: Scene, index) => {
    const transition: Transition = sc.transition ?? (index === 0 ? "cut" : index % 2 === 1 ? "pushRight" : "pushBottom");
    const transitionFrames = TRANSITION_FRAMES[transition];
    const leadIn = index === 0 ? 1 : transition === "blur" || transition === "cut" ? 2 : Math.max(6, transitionFrames - 2);
    const voice = spec.voiceover?.[sc.id];
    const rawWords: Word[] = voice ? voice.words : sc.narration ? estimateWords(sc.narration, spec.wpm ?? 205) : [];
    const words: TimedWord[] = rawWords.map((w) => ({
      text: w.text, norm: normWord(w.text),
      frame: leadIn + Math.round(w.start * fps),
      endFrame: leadIn + Math.round(w.end * fps),
    }));
    const speechFrames = voice ? Math.ceil(voice.duration * fps) : words.length ? words[words.length - 1].endFrame - leadIn : 0;
    const tail = 6;
    let duration = sc.duration ?? leadIn + speechFrames + tail;
    duration = Math.max(duration, sc.minDuration ?? 0, transitionFrames + 6, 12);

    const where = `scene "${sc.id}"`;
    const r = makeResolver(words, leadIn, duration, where, warnings);
    const elements = sc.elements.map((el, ei) => {
      const res = resolveDeep(el, makeResolver(words, leadIn, duration, `${where} element ${ei} (${el.type})`, warnings), leadIn);
      if (el.type === "headline") {
        const hw = headlineWords(el.text);
        const frames: number[] = [];
        let wi = 0;
        let last = el.at !== undefined ? r(el.at, leadIn) : leadIn;
        hw.forEach((h, k) => {
          if (el.wordAt && el.wordAt[k] !== undefined) { last = r(el.wordAt[k], last); frames.push(last); return; }
          const n = normWord(h.word);
          let found = -1;
          for (let j = wi; j < words.length; j++) if (words[j].norm === n) { found = j; break; }
          if (found >= 0 && n) { last = words[found].frame; wi = found + 1; }
          else if (k > 0) last = last + 6;
          frames.push(last);
        });
        res._words = hw;
        res._wordFrames = frames;
        if (el.at === undefined) res.at = frames[0] ?? leadIn;
      }
      if (el.type === "moneyStacks") res.rows = el.rows.map((a) => r(a, leadIn));
      if (res.at === undefined) res.at = leadIn;
      return res;
    });
    const firstStat = elements.find((e) => e.type === "bigNumber" || e.type === "lineChart" || e.type === "card" || e.type === "hbarChart");
    scenes.push({
      id: sc.id, index, from: cursor, duration, overlap: 0,
      background: sc.background ?? "paper",
      transition, transitionFrames, leadIn,
      source: sc.source, sourceAt: firstStat ? firstStat.at : leadIn,
      audio: voice ? { src: voice.audio, from: leadIn } : undefined,
      words, elements,
    });
    cursor += duration;
  });

  for (let i = 0; i < scenes.length - 1; i++) scenes[i].overlap = scenes[i + 1].transitionFrames;
  const durationInFrames = Math.max(1, cursor);

  let counter: ResolvedCounter | undefined;
  if (spec.counter) {
    const big = spec.counter.bigInFirstScene ?? true;
    const s0 = scenes[0];
    const r0 = makeResolver(s0.words, s0.leadIn, s0.duration, "counter", warnings);
    let hideFrom: number | undefined;
    for (const s of scenes) for (const e of s.elements) if (e.type === "totalCounter") hideFrom = s.from + e.at - 5;
    counter = {
      label: spec.counter.label,
      ratePerSecond: spec.counter.ratePerSecond,
      prefix: spec.counter.prefix ?? "$",
      bigUntil: big && scenes.length > 1 ? scenes[1].from - 2 : big ? durationInFrames : -1,
      flash: spec.counter.flash ? [r0(spec.counter.flash.from, 0), r0(spec.counter.flash.to, 0)] : undefined,
      hideFrom,
      y: spec.counter.y ?? 360,
    };
  }

  return {
    ok: true,
    resolved: {
      title: spec.title ?? "Untitled",
      fps, width: spec.width ?? 1920, height: spec.height ?? 1080,
      cadence: spec.cadence ?? "on-threes",
      durationInFrames, counter, scenes, warnings,
    },
  };
}

/** Human-readable timing table for agents. */
export function describeTimeline(r: ResolvedSpec) {
  return {
    durationInFrames: r.durationInFrames,
    durationSeconds: +(r.durationInFrames / r.fps).toFixed(2),
    fps: r.fps,
    scenes: r.scenes.map((s) => ({
      id: s.id, from: s.from, duration: s.duration, transition: s.transition,
      voiced: !!s.audio,
      words: s.words.map((w) => `${w.text}@${w.frame}`).join(" "),
      elements: s.elements.map((e) => `${e.type}${e.id ? `#${e.id}` : ""}@${e.at}`).join(", "),
    })),
    warnings: r.warnings,
  };
}
