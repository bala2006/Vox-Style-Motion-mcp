// End-to-end check: spawn the MCP server over stdio and call every tool.
// Usage: npx tsx src/cli/mcp-smoke.ts [--video]
import { writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== "ELEVENLABS_API_KEY") env[k] = v;
const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "src/mcp/server.ts"], env, stderr: "inherit" });
const client = new Client({ name: "smoke", version: "0.0.1" });
await client.connect(transport);

const text = (r: any) => r.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

const guide = await client.callTool({ name: "get_style_guide", arguments: {} });
console.log("get_style_guide chars:", text(guide).length);

const schema = await client.callTool({ name: "get_spec_schema", arguments: { include_examples: false } });
console.log("get_spec_schema has schema:", text(schema).includes("\"scenes\""));

const val = await client.callTool({ name: "validate_spec", arguments: { spec_path: "examples/reference-recreation.json" } });
const v = JSON.parse(text(val));
console.log("validate_spec ok:", v.ok, "frames:", v.durationInFrames, "warnings:", v.warnings.length);

const bad = await client.callTool({ name: "validate_spec", arguments: { spec: { scenes: [{ id: "x", elements: [{ type: "bigNumber" }] }] } } });
console.log("validate_spec bad spec ->", text(bad).replace(/\s+/g, " ").slice(0, 160));

const vo = await client.callTool({ name: "generate_voiceover", arguments: { spec_path: "examples/quickstart.json" } });
console.log("generate_voiceover isError:", vo.isError, "->", text(vo).slice(0, 70));

const still = await client.callTool({ name: "render_still", arguments: { spec_path: "examples/quickstart.json", scene: "trend" } });
const img = (still.content as any[]).find((c) => c.type === "image");
console.log("render_still:", text(still).replace(/\s+/g, " "), "image bytes:", img ? Buffer.from(img.data, "base64").length : 0);
if (img) writeFileSync("out/check/mcp_still.png", Buffer.from(img.data, "base64"));

if (process.argv.includes("--video")) {
  const vid = await client.callTool({ name: "render_video", arguments: { spec_path: "examples/quickstart.json", out_path: "out/videos/quickstart.mp4" } });
  console.log("render_video:", text(vid).replace(/\s+/g, " "));
}
await client.close();
