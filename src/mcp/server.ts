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
import { ROOT, OUT, compileOrThrow, loadSpec, renderStillFrame, renderVideoFile, writeJson } from "../node/render";
import { DEFAULT_MODEL, DEFAULT_VOICE, MissingKeyError, listVoices, voiceSpec } from "../node/elevenlabs";

const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) { try { process.loadEnvFile(envFile); } catch { /* ignore malformed .env */ } }

const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof MissingKeyError ? `ELEVENLABS_KEY_NOT_SET: ${e.message}` : String((e as Error)?.stack ?? e) }],
});
const safe = <A,>(fn: (a: A) => Promise<any>) => async (a: A) => { try { return await fn(a); } catch (e) { return fail(e); } };

const specArgs = {
  spec: z.any().optional().describe("The video spec object (or a JSON string). See get_spec_schema."),
  spec_path: z.string().optional().describe("Path to a spec JSON file. Relative asset paths resolve from its folder."),
};

const server = new McpServer({ name: "vox-style-motion", version: "0.1.0" });

server.registerTool("get_style_guide", {
  title: "Get the Vox-style guide",
  description: "Read this first. Returns the skill (how to write and time a video in this style), measured design tokens, effect specs and the reference timeline.",
  inputSchema: { section: z.enum(["skill", "tokens", "effects", "timeline", "audio", "all"]).optional().describe("Default: skill") },
}, safe(async ({ section = "skill" }: { section?: string }) => {
  const parts: string[] = [];
  if (section === "skill" || section === "all") parts.push(read("skill/SKILL.md"));
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
  title: "List ElevenLabs voices",
  description: "Lists voices available to the configured ElevenLabs account. Needs ELEVENLABS_API_KEY.",
  inputSchema: {},
}, safe(async () => json({ default_voice: DEFAULT_VOICE, voices: await listVoices() })));

server.registerTool("generate_voiceover", {
  title: "Generate narration with ElevenLabs",
  description: "Generates one MP3 per narrated scene with ElevenLabs text-to-speech (with character timestamps), converts the alignment to word timings and writes a voiced spec (spec.voiced.json) next to the audio. Render that file to get frame-accurate word sync. Needs ELEVENLABS_API_KEY; without it this returns ELEVENLABS_KEY_NOT_SET and you can still render with estimated timing.",
  inputSchema: {
    ...specArgs,
    out_dir: z.string().optional().describe("Folder for MP3s and spec.voiced.json. Default out/voice/<timestamp>"),
    voice_id: z.string().optional().describe(`Default ${DEFAULT_VOICE} (or ELEVENLABS_VOICE_ID)`),
    model_id: z.string().optional().describe(`Default ${DEFAULT_MODEL}`),
    voice_settings: z.record(z.string(), z.any()).optional().describe("stability, similarity_boost, style, use_speaker_boost, speed"),
    scenes: z.array(z.string()).optional().describe("Only (re)generate these scene ids"),
    seed: z.number().int().optional(),
  },
}, safe(async (a: any) => {
  const { spec } = loadSpec(a);
  const parsed = VideoSpec.parse(spec);
  const outDir = path.resolve(a.out_dir ?? path.join(OUT, "voice", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)));
  const r = await voiceSpec(parsed, outDir, { voiceId: a.voice_id, modelId: a.model_id, settings: a.voice_settings, scenes: a.scenes, seed: a.seed });
  const specPath = path.join(outDir, "spec.voiced.json");
  writeJson(specPath, r.spec);
  const timeline = describeTimeline(compileOrThrow(r.spec));
  return json({ ok: true, spec_path: specPath, clips: r.done, durationSeconds: timeline.durationSeconds, warnings: timeline.warnings });
}));

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

server.registerTool("render_video", {
  title: "Render the video to MP4",
  description: "Renders the spec (H.264 + AAC) with Remotion. Use from_frame/to_frame for a quick partial render. First call downloads Chrome Headless Shell and bundles the project (~1 min).",
  inputSchema: {
    ...specArgs,
    out_path: z.string().optional(),
    from_frame: z.number().int().optional(),
    to_frame: z.number().int().optional(),
    concurrency: z.number().int().optional(),
    crf: z.number().int().optional().describe("Quality, lower is better. Default 18"),
  },
}, safe(async (a: any) => json({ ok: true, ...(await renderVideoFile(a)) })));

await server.connect(new StdioServerTransport());
console.error("[vox] MCP server ready (stdio). ElevenLabs key", process.env.ELEVENLABS_API_KEY ? "set" : "NOT set");
