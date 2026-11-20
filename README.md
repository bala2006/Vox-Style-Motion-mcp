# Vox-Style-Motion-mcp

An MCP server that lets any text-generation agent make Vox-style explainer videos from code.
Visuals are rendered by **Remotion**; narration comes from **ElevenLabs** or **Sarvam** (Indian-English voices). No video-generation models are used.

Two looks share one spec format:

- **Vox explainer.** Paper, typewriter kickers, word-synced serif headlines, giant numbers, torn cutouts and charts.
- **Box style.** Product demos with real software recorded into framed screen boxes. The footage is time-remapped onto the narration, with camera pushes, marker marks, redaction of secrets, paper cards, terminals, step lists and a phone frame. The playbook is `skill/box-style.md`. The worked example is `examples/box-demo/`.

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
      "env": { "ELEVENLABS_API_KEY": "", "SARVAM_API_KEY": "" }
    }
  }
}
```

Keys can also go in a `.env` file in the project root (see `.env.example`). Without a key, everything except voice generation works: `generate_voiceover` returns `ELEVENLABS_KEY_NOT_SET` or `SARVAM_KEY_NOT_SET`, and videos render silent with timing estimated at 205 words per minute.

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` | ElevenLabs voice. The default provider when the key is set |
| `SARVAM_API_KEY` | Sarvam bulbul TTS and saaras STT. Used when only this key is set, or with `provider: "sarvam"` |
| `SARVAM_MODEL`, `SARVAM_SPEAKER`, `SARVAM_LANGUAGE`, `SARVAM_PACE` | Sarvam defaults: `bulbul:v4-flash`, `shubh_en_narration`, `en-IN`, `1.07` |
| `VOX_BROWSER_PATH` | Browser for `capture_screen` (default: Remotion's Chrome Headless Shell) |
| `VOX_VIDEO_ENGINE` | `offthread` or `html5` for screen footage. The default is automatic: `html5` on Linux with glibc older than 2.35, where Remotion's compositor cannot run |

## Tools

| Tool | Purpose |
|---|---|
| `get_style_guide` | The skill, the box-style playbook (`section: "box"`), design tokens, effect specs, reference timeline, audio profile |
| `get_spec_schema` | JSON Schema of the video spec plus complete examples (including the box demo) |
| `validate_spec` | Schema check, resolves word anchors to frames, warns on unmatched anchors |
| `list_voices` | ElevenLabs voices on the account, or tested Sarvam speakers (`provider`) |
| `generate_voiceover` | One clip per scene via ElevenLabs (exact timestamps) or Sarvam (`provider: "sarvam"`, cached per sentence, optional STT `check`); writes `spec.voiced.json` with word timings |
| `capture_screen` | Scripted headless-Chromium run (goto, click, type, scroll, screenshot, mark…) recorded to a 1920×1080 30 fps MP4 with cursor and click rings; returns the recording second of every mark |
| `render_still` | PNG of one frame, returned inline so the agent can look at it |
| `render_stills` | A sweep of frames across a scene or the whole video (up to 24 returned inline), for layout and privacy checks |
| `render_video` | H.264/AAC MP4, optionally a frame range |

## Without an MCP client

```powershell
npx tsx src/cli/render-example.ts validate examples/reference-recreation.json
npx tsx src/cli/render-example.ts still examples/quickstart.json 120 out/check/f120.png
npx tsx src/cli/render-example.ts video examples/reference-recreation.json out/videos/recreation.mp4
npx tsx src/cli/render-example.ts capture examples/box-demo/capture.json          # re-record the demo app
npx tsx src/cli/render-example.ts sweep examples/box-demo/spec.voiced.json settings 15 out/check/settings
npx tsx src/cli/render-example.ts video examples/box-demo/spec.voiced.json out/videos/box-demo.mp4
npx tsx src/cli/mcp-smoke.ts --video      # calls every MCP tool over stdio
npm run studio                            # Remotion Studio with a placeholder spec
```

## Layout

```
analysis/   per-frame stats, audio analysis, frame notes, scripts
specs/      design-tokens.json, audio.json, timeline.json, effects/*.json
skill/      SKILL.md and box-style.md (served by get_style_guide)
examples/   reference-recreation.json (all 8 shots), quickstart.json,
            box-demo/ (demo app, capture scripts, footage, Sarvam voice, spec)
src/spec    zod schema + compiler (narration words -> frames)
src/remotion components and composition
src/node    rendering, screen capture, ElevenLabs and Sarvam clients
src/mcp     the stdio MCP server
```

## Known gaps

- **Photo cutouts.** The reference uses photographic cutouts (Capitol, money stacks, jet, hourglass). The built-in assets are drawn SVG stand-ins. Pass `src` with your own licensed transparent PNGs for the photo look.
- **Narration text** for the reference was reconstructed from on-screen words and phrase timing, not transcribed.
- **Canvas** is laid out for 1920×1080.
- **Sarvam word timings** are estimated per sentence by syllable weight, not returned by the API. Anchor footage changes on distinctive words.
- **Old Linux (glibc < 2.35).** Remotion's compositor cannot run there, so screen footage falls back to the HTML5 video engine. Frames are still seeked, but they are less exact than with OffthreadVideo.
- **Remotion licence.** Remotion is free for individuals and companies with up to 3 employees; larger companies need a company licence.
