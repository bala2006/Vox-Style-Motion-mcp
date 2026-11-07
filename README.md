# Vox-Style-Motion-mcp

An MCP server that lets any text-generation agent make Vox-style explainer videos from code.
Visuals are rendered by **Remotion**; narration comes from **ElevenLabs**. No video-generation models are used.

The style was measured from `Vox Style Reference video.mp4` (943 frames, 30 fps). The analysis lives in `analysis/`, the measured specs in `specs/`, and the agent-facing guide in `skill/SKILL.md`.

## Setup

Requires Node 22+.

```powershell
npm install
npm run typecheck
```

The first render downloads Chrome Headless Shell (~130 MB) and bundles the project (about a minute). Fonts load from Google Fonts at render time, so rendering needs network access.

## Connect an MCP client

```json
{
  "mcpServers": {
    "vox-style-motion": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "C:\\Users\\balac\\Desktop\\Vox-Style-Motion-mcp",
      "env": { "ELEVENLABS_API_KEY": "" }
    }
  }
}
```

The key can also go in a `.env` file in the project root (see `.env.example`). Without a key, everything except `list_voices` and `generate_voiceover` works; those two return `ELEVENLABS_KEY_NOT_SET`, and videos render silent with timing estimated at 205 words per minute.

## Tools

| Tool | Purpose |
|---|---|
| `get_style_guide` | The skill, design tokens, effect specs, reference timeline, audio profile |
| `get_spec_schema` | JSON Schema of the video spec plus two complete examples |
| `validate_spec` | Schema check, resolves word anchors to frames, warns on unmatched anchors |
| `list_voices` | ElevenLabs voices on the account |
| `generate_voiceover` | One MP3 per scene via ElevenLabs text-to-speech with timestamps; writes `spec.voiced.json` with word timings |
| `render_still` | PNG of one frame, returned inline so the agent can look at it |
| `render_video` | H.264/AAC MP4, optionally a frame range |

## Without an MCP client

```powershell
npx tsx src/cli/render-example.ts validate examples/reference-recreation.json
npx tsx src/cli/render-example.ts still examples/quickstart.json 120 out/check/f120.png
npx tsx src/cli/render-example.ts video examples/reference-recreation.json out/videos/recreation.mp4
npx tsx src/cli/mcp-smoke.ts --video      # calls every MCP tool over stdio
npm run studio                            # Remotion Studio with a placeholder spec
```

## Layout

```
analysis/   per-frame stats, audio analysis, frame notes, scripts
specs/      design-tokens.json, audio.json, timeline.json, effects/*.json
skill/      SKILL.md (served by get_style_guide)
examples/   reference-recreation.json (all 8 shots), quickstart.json
src/spec    zod schema + compiler (narration words -> frames)
src/remotion components and composition
src/node    rendering and ElevenLabs client
src/mcp     the stdio MCP server
```

## Known gaps

- **Photo cutouts.** The reference uses photographic cutouts (Capitol, money stacks, jet, hourglass). The built-in assets are drawn SVG stand-ins. Pass `src` with your own licensed transparent PNGs for the photo look.
- **Narration text** for the reference was reconstructed from on-screen words and phrase timing, not transcribed.
- **Canvas** is laid out for 1920×1080.
- **Remotion licence.** Remotion is free for individuals and companies with up to 3 employees; larger companies need a company licence.
