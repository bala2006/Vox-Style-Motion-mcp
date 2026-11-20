// stdio MCP server. Never write to stdout except through the transport.
console.log = (...a: unknown[]) => console.error(...a);
console.info = (...a: unknown[]) => console.error(...a);

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VideoSpec } from "../spec/schema";
import { compileSpec, describeTimeline } from "../spec/compile";
import { ROOT, OUT, compileOrThrow, loadSpec, renderStillFrame, renderStillSweep, renderVideoFile, writeJson } from "../node/render";
import { DEFAULT_MODEL, DEFAULT_VOICE, MissingKeyError, listVoices, voiceSpec } from "../node/elevenlabs";
import { SARVAM_DEFAULTS, SARVAM_TESTED_SPEAKERS, SarvamKeyError, sarvamVoiceSpec } from "../node/sarvam";
import { captureScreen } from "../node/capture";

const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) { try { process.loadEnvFile(envFile); } catch { /* ignore malformed .env */ } }

const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{
    type: "text" as const,
    text: e instanceof MissingKeyError ? `ELEVENLABS_KEY_NOT_SET: ${e.message}` : e instanceof SarvamKeyError ? `SARVAM_KEY_NOT_SET: ${e.message}` : String((e as Error)?.stack ?? e),
  }],
});
/** Rewrite relative `src`/`audio` paths from one folder to another (skipping the freshly written audio). */
function rebaseSrc(v: any, fromDir: string, toDir: string, keep: Set<string>): any {
  const fix = (p: string) => (/^(https?:|data:|blob:)/.test(p) || path.isAbsolute(p) || keep.has(p) ? p : path.relative(toDir, path.resolve(fromDir, p)).split(path.sep).join("/"));
  if (Array.isArray(v)) return v.map((x) => rebaseSrc(x, fromDir, toDir, keep));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (k === "src" || k === "audio") && typeof x === "string" ? fix(x) : rebaseSrc(x, fromDir, toDir, keep)]));
  return v;
}
const defaultProvider = () => (process.env.ELEVENLABS_API_KEY?.trim() ? "elevenlabs" : process.env.SARVAM_API_KEY?.trim() ? "sarvam" : "elevenlabs");
const safe = <A,>(fn: (a: A) => Promise<any>) => async (a: A) => { try { return await fn(a); } catch (e) { return fail(e); } };

const specArgs = {
  spec: z.any().optional().describe("The video spec object (or a JSON string). See get_spec_schema."),
  spec_path: z.string().optional().describe("Path to a spec JSON file. Relative asset paths resolve from its folder."),
};

const server = new McpServer({ name: "vox-style-motion", version: "0.2.0" });

server.registerTool("get_style_guide", {
  title: "Get the Vox-style guide",
  description: "Read this first. Returns the skill (how to write and time a video in this style), measured design tokens, effect specs and the reference timeline. For product demos with real software in boxes, also read section \"box\".",
  inputSchema: { section: z.enum(["skill", "box", "tokens", "effects", "timeline", "audio", "all"]).optional().describe("Default: skill. box = the box-style playbook for software demos (screen recordings, camera, marks, privacy).") },
}, safe(async ({ section = "skill" }: { section?: string }) => {
  const parts: string[] = [];
  if (section === "skill" || section === "all") parts.push(read("skill/SKILL.md"));
  if (section === "box" || section === "all") parts.push(read("skill/box-style.md"));
  if (section === "tokens" || section === "all") parts.push("# design-tokens.json\n" + read("specs/design-tokens.json"));
  if (section === "effects" || section === "all") for (const f of readdirSync(path.join(ROOT, "specs", "effects"))) parts.push(`# effects/${f}\n` + read(`specs/effects/${f}`));
  if (section === "timeline" || section === "all") parts.push("# timeline.json\n" + read("specs/timeline.json"));
  if (section === "audio" || section === "all") parts.push("# audio.json\n" + read("specs/audio.json"));
  return { content: [{ type: "text" as const, text: parts.join("\n\n") }] };
}));

server.registerTool("get_spec_schema", {
  title: "Get the video spec JSON schema",
  description: "JSON Schema of the video spec plus a complete example (the reference recreation) and a short quickstart example.",
  inputSchema: { include_examples: z.boolean().optional().describe("Default true") },
}, safe(async ({ include_examples = true }: { include_examples?: boolean }) => {
  const out: Record<string, unknown> = { schema: z.toJSONSchema(VideoSpec, { unrepresentable: "any" }) };
  if (include_examples) {
    out.quickstart = JSON.parse(read("examples/quickstart.json"));
    out.reference_recreation = JSON.parse(read("examples/reference-recreation.json"));
    out.box_demo = JSON.parse(read("examples/box-demo/spec.json"));
  }
  return json(out);
}));

server.registerTool("validate_spec", {
  title: "Validate a spec and show its timing",
  description: "Checks the spec against the schema, resolves every word anchor to a frame and returns the timeline (scene start frames, word frames, element start frames) plus warnings for anchors that matched no narration word. Use before rendering.",
  inputSchema: specArgs,
}, safe(async (a: { spec?: unknown; spec_path?: string }) => {
  const { spec } = loadSpec(a);
  const r = compileSpec(spec);
  if (!r.ok) return json({ ok: false, errors: r.errors });
  return json({ ok: true, ...describeTimeline(r.resolved) });
}));

server.registerTool("list_voices", {
  title: "List narration voices",
  description: "ElevenLabs: lists the account's voices (needs ELEVENLABS_API_KEY). Sarvam: lists the speakers tested for Indian-English narration and the defaults.",
  inputSchema: { provider: z.enum(["elevenlabs", "sarvam"]).optional().describe("Default: whichever key is set (ElevenLabs first)") },
}, safe(async ({ provider }: { provider?: string }) => {
  if ((provider ?? defaultProvider()) === "sarvam") return json({ provider: "sarvam", defaults: SARVAM_DEFAULTS, tested_speakers: SARVAM_TESTED_SPEAKERS, note: "Any bulbul speaker id works; these were compared by ear and by STT round trip." });
  return json({ provider: "elevenlabs", default_voice: DEFAULT_VOICE, voices: await listVoices() });
}));

server.registerTool("generate_voiceover", {
  title: "Generate narration (ElevenLabs or Sarvam)",
  description: "Generates one audio clip per narrated scene and writes a voiced spec (spec.voiced.json) next to the audio, with word timings. Render that file for word-synced visuals. provider \"elevenlabs\" uses character timestamps (needs ELEVENLABS_API_KEY). provider \"sarvam\" uses bulbul TTS for natural Indian-English voices (needs SARVAM_API_KEY): one call per sentence, cached, silence-trimmed, word timings estimated by syllable weight; set check: true to transcribe every sentence with saaras STT and get back any sentence the voice misread. Without a key it returns *_KEY_NOT_SET and you can still render with estimated timing.",
  inputSchema: {
    ...specArgs,
    provider: z.enum(["elevenlabs", "sarvam"]).optional().describe("Default: whichever key is set (ElevenLabs first)"),
    out_dir: z.string().optional().describe("Folder for audio and spec.voiced.json. Default out/voice/<timestamp>"),
    voice_id: z.string().optional().describe(`ElevenLabs voice (default ${DEFAULT_VOICE}) or Sarvam speaker (default ${SARVAM_DEFAULTS.speaker})`),
    model_id: z.string().optional().describe(`ElevenLabs default ${DEFAULT_MODEL}; Sarvam default ${SARVAM_DEFAULTS.model}`),
    voice_settings: z.record(z.string(), z.any()).optional().describe("ElevenLabs: stability, similarity_boost, style, use_speaker_boost, speed"),
    language: z.string().optional().describe(`Sarvam language code, default ${SARVAM_DEFAULTS.language_code}`),
    pace: z.number().optional().describe(`Sarvam pace, default ${SARVAM_DEFAULTS.pace}`),
    check: z.boolean().optional().describe("Sarvam: speech-to-text round trip on every sentence; mismatches are returned as `problems`"),
    scenes: z.array(z.string()).optional().describe("Only (re)generate these scene ids"),
    seed: z.number().int().optional(),
  },
}, safe(async (a: any) => {
  const { spec } = loadSpec(a);
  const parsed = VideoSpec.parse(spec);
  const outDir = path.resolve(a.out_dir ?? path.join(OUT, "voice", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)));
  const provider = a.provider ?? defaultProvider();
  let voiced: unknown, clips: unknown, extra: Record<string, unknown> = {};
  if (provider === "sarvam") {
    const r = await sarvamVoiceSpec(parsed, outDir, { speaker: a.voice_id, model: a.model_id, language: a.language, pace: a.pace, scenes: a.scenes, check: a.check });
    voiced = r.spec; clips = r.done; extra = { voice: r.voice, problems: r.problems };
  } else {
    const r = await voiceSpec(parsed, outDir, { voiceId: a.voice_id, modelId: a.model_id, settings: a.voice_settings, scenes: a.scenes, seed: a.seed });
    voiced = r.spec; clips = r.done;
  }
  const specPath = path.join(outDir, "spec.voiced.json");
  // The voiced spec lives next to the audio; keep the original spec's relative media paths pointing at the same files.
  const { baseDir } = loadSpec(a);
  voiced = rebaseSrc(voiced, baseDir, outDir, new Set(Object.values((voiced as any).voiceover ?? {}).map((v: any) => v.audio)));
  writeJson(specPath, voiced);
  const timeline = describeTimeline(compileOrThrow(voiced));
  return json({ ok: true, provider, spec_path: specPath, clips, durationSeconds: timeline.durationSeconds, warnings: timeline.warnings, ...extra });
}));

server.registerTool("capture_screen", {
  title: "Record real software for a screen box",
  description: "Drives a headless Chromium through scripted steps (goto, click, type, press, hover, scroll, wait, waitFor, screenshot, mark) with a visible cursor and yellow click rings, records it with the CDP screencast and encodes a constant 30 fps 1920x1080 MP4. Returns the recording second of every step and named mark, so a screen's media.timeMap can freeze, play or time-lapse the footage onto narration words. Also writes <video>.marks.json. Never record pages that show secrets you cannot cover with `redact`.",
  inputSchema: {
    steps: z.array(z.object({
      do: z.enum(["goto", "click", "type", "press", "hover", "scroll", "wait", "waitFor", "screenshot", "mark"]),
      url: z.string().optional().describe("goto: URL or local HTML path"),
      selector: z.string().optional().describe("CSS/Playwright selector for click, hover, type, scroll, waitFor"),
      text: z.string().optional().describe("type: text to type; click/hover: visible text to target when no selector"),
      key: z.string().optional().describe("press: e.g. Enter"),
      y: z.number().optional().describe("scroll: pixels (default 600)"),
      ms: z.number().optional().describe("wait / scroll settle time"),
      delay: z.number().optional().describe("type: ms per key, default 45"),
      name: z.string().optional().describe("mark / screenshot name"),
      fullPage: z.boolean().optional().describe("screenshot: whole page (for phone or report scrolls)"),
      timeout: z.number().optional(),
      mark: z.string().optional().describe("Record this step's start time under this name"),
    })).min(1),
    out_path: z.string().optional().describe("MP4 path. Default out/captures/capture-<ts>.mp4"),
    viewport: z.object({ width: z.number(), height: z.number() }).optional().describe("CSS viewport, default 1440x810 (scaled to 1920x1080). Use 390x844 for a phone."),
    tail_ms: z.number().optional().describe("Keep recording after the last step, default 1200"),
    cursor: z.boolean().optional().describe("Draw the cursor and click rings, default true"),
  },
}, safe(async (a: any) => json({ ok: true, ...(await captureScreen(a)) })));

server.registerTool("render_still", {
  title: "Render a preview frame",
  description: "Renders one frame to PNG and returns it as an image so you can check layout. Pick `frame` (global) or `scene` + `offset` (frames into that scene; default 80% through).",
  inputSchema: {
    ...specArgs,
    frame: z.number().int().optional(),
    scene: z.string().optional(),
    offset: z.number().int().optional(),
    out_path: z.string().optional(),
    scale: z.number().min(0.1).max(1).optional().describe("Output scale. Default 0.5 (960x540)"),
    include_image: z.boolean().optional().describe("Return the PNG inline. Default true"),
  },
}, safe(async (a: any) => {
  const r = await renderStillFrame({ ...a, scale: a.scale ?? 0.5 });
  const content: any[] = [{ type: "text", text: JSON.stringify(r, null, 2) }];
  if (a.include_image !== false) content.push({ type: "image", data: readFileSync(r.output).toString("base64"), mimeType: "image/png" });
  return { content };
}));

server.registerTool("render_stills", {
  title: "Render a sweep of preview frames",
  description: "Renders many frames in one go and returns them as images: an explicit `frames` list, or every `step` frames across one `scene` (default 45) or the whole video (default 90). Use it to check a scene end to end: overlaps, glyphs that render as boxes, marks that miss after a camera move, and above all that nothing private is readable at any moment of a screen recording.",
  inputSchema: {
    ...specArgs,
    frames: z.array(z.number().int()).optional(),
    scene: z.string().optional(),
    step: z.number().int().optional(),
    out_dir: z.string().optional(),
    scale: z.number().min(0.1).max(1).optional().describe("Default 0.3 (576x324)"),
    include_images: z.boolean().optional().describe("Return PNGs inline. Default true (max 24 images)"),
  },
}, safe(async (a: any) => {
  const r = await renderStillSweep(a);
  const content: any[] = [{ type: "text", text: JSON.stringify(r, null, 2) }];
  if (a.include_images !== false) for (const s of r.stills.slice(0, 24)) content.push({ type: "image", data: readFileSync(s.output).toString("base64"), mimeType: "image/png" });
  return { content };
}));

server.registerTool("render_video", {
  title: "Render the video to MP4",
  description: "Renders the spec (H.264 + AAC) with Remotion. Use from_frame/to_frame for a quick partial render. First call downloads Chrome Headless Shell and bundles the project (~1 min).",
  inputSchema: {
    ...specArgs,
    out_path: z.string().optional(),
    from_frame: z.number().int().optional(),
    to_frame: z.number().int().optional(),
    concurrency: z.number().int().optional(),
    crf: z.number().int().optional().describe("Quality, lower is better. Default 17"),
  },
}, safe(async (a: any) => json({ ok: true, ...(await renderVideoFile(a)) })));

await server.connect(new StdioServerTransport());
console.error("[vox] MCP server ready (stdio). ElevenLabs key", process.env.ELEVENLABS_API_KEY ? "set" : "NOT set", "· Sarvam key", process.env.SARVAM_API_KEY ? "set" : "NOT set");
