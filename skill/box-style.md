# Box style: real software in a box

Box style is the product-demo variant of the Vox look. The paper desk, torn edges, typewriter kickers and word-synced serif headlines stay. The visual in most scenes becomes **real software running inside a framed screen box**, with a camera that pushes in on the control being talked about and marker marks drawn on top of the footage.

It was built from a 6-minute demo of a multi-agent coding tool. The worked example is `examples/box-demo/` (seven scenes, 54 s). Read its `spec.json` next to this guide. Every element type below appears there.

## Workflow

1. **Plan the beats first.** Write one scene per action the viewer must see: open, type, click, wait, result, proof. Each scene gets 1–3 narration sentences (3–10 s).
2. **Script the app run** with `capture_screen`. Use stable selectors (`[data-test=…]`) and give every step the viewer cares about a `mark`. Pause with `wait` after each visible change, 800–1800 ms, so there is footage to hold on.
   - Desktop: viewport `1440×810` (the default). It is recorded at 1920×1080, so the overlay boxes use 1920×1080 pixels.
   - Phone: viewport `390×844`, `cursor: false`, then `screenshot` with `fullPage: true` and scroll the PNG inside a `phone`.
   - Relative `goto` paths resolve from the capture JSON's folder (CLI) or the server's working folder (MCP). Prefer absolute paths or URLs over MCP.
   - The result (and `<video>.marks.json`) lists the recording second of every mark. These numbers feed `timeMap`.
3. **Write the spec.** Use `cadence: "smooth"` (footage looks wrong on threes) and `fade: { in: 12, out: 22 }`. For each scene:
   - Add a `screen` with `media[].timeMap` that pins recording seconds to narration words.
   - Add `camera` keys that push in on the control when it is named and pull back after.
   - Add `overlays` (markerBox, highlight, circle, redact, cursor) in recording pixels.
   - Put a side element outside the box (tag, stamp, paperCard, countUp) on the payoff word.
4. `validate_spec`. Fix every unmatched-anchor warning.
5. **Measure overlay boxes from real frames.** Render a still with no camera zoom, read the control's pixel box off the image (multiply by 1/scale), then add the overlay. Guessing is how a marker ends up framing empty space.
6. `generate_voiceover`. For an Indian-English voice use `provider: "sarvam"` with `check: true`, and re-word any sentence returned in `problems`. With `provider: "elevenlabs"` you get exact character timings.
7. **Sweep every scene** with `render_stills` (`scene`, `step` 15–30) on the voiced spec. Check each image (the full checklist is at the end of this guide):
   - No text overlaps the box.
   - No glyph renders as an empty box.
   - Every mark still sits on its control after the camera moves.
   - No secret is readable on any frame.
8. `render_video` the voiced spec. Then pull a few frames from the MP4 itself (`ffmpeg -ss <t> -frames:v 1`) on the risky moments: scene entries, camera moves, and the frames around each redact.

## The screen box

```json
{ "type": "screen", "at": 4, "url": "localhost · Orders",
  "media": [{ "src": "media/run.mp4",
              "timeMap": [{ "at": "start", "t": 0.4 }, { "at": "taps", "t": 1.1 }, { "at": "total", "t": 3.75 }],
              "maxSec": 4.3 }],
  "camera": [{ "at": "start", "x": 960, "y": 540, "zoom": 1 },
             { "at": "taps-6", "x": 960, "y": 540, "zoom": 1 },
             { "at": "taps+10", "x": 700, "y": 380, "zoom": 1.45 }],
  "badge": { "text": "LIVE", "speed": "1×" },
  "overlays": [{ "type": "markerBox", "at": "three", "box": [48, 213, 640, 155], "exitAt": "total" }] }
```

- **Frame.** A torn paper mat, two masking-tape strips and a dark window bar with traffic lights and a URL pill. The box sits slightly rotated (−0.5°) and slides up from the bottom over 16 frames. Use `enterFrom: "right"` for the next step of the same flow.
- **Default size.** `x 200, y 112, w 1520`. This leaves y 30–60 for the kicker and y 880–1040 for one side tag or stamp. For a split layout, shrink the box (`w` 1100–1200) or use `moveTo` mid-scene to make room for a phone, terminal or card.
- **Several recordings in one box.** Stack `media` layers with their own `at`/`endAt`. They cross-fade over `fade` frames (default 6).

### Time remapping (`timeMap`)

`timeMap` pins recording seconds to narration anchors. Between pairs the footage plays at whatever speed makes the times meet.

| You want | Pairs |
|---|---|
| Real time | Gap in `t` matches the gap in speech |
| Freeze on a result | The same `t` on two anchors |
| Time-lapse a long wait | A big jump in `t` (e.g. 20 s of footage over 2 s of speech). Set `badge.speed: "TIME-LAPSE 10×"` so the viewer knows |
| Start mid-recording | First pair `{ "at": "start", "t": 7.4 }` |

- Before the first pair the first frame holds. After the last pair the footage plays on at `rate`.
- Always set `maxSec` to the last good second, so a long scene never runs into the next part of the recording.
- Map each visible change (a counter ticking, a toast appearing) to the word that names it, 0–4 frames early. That sync is what makes the footage feel narrated rather than pasted in.
- `badge.clock` shows a mm:ss clock from the mapped recording time. Use it when elapsed time is the point ("four minutes later").

### Camera (`camera`)

Keys are `{ at, x, y, zoom }` in recording pixels: `x`/`y` is the point at the centre of the box, and zoom 1 shows the whole screen. Moves ease in-out; zoom interpolates in log space, so 1→2 feels even.

- **Hold, push, hold.** Repeat a key to hold (`"taps-6"` and `"taps+10"` with the same values on the first one). Without the hold key the camera drifts for the whole scene.
- **Zoom range.** Push to 1.4–1.8 on the control being named, about 16 frames before to 10 frames after the word. Above 2× the footage gets soft.
- **Pans.** Pan at the same zoom to move between two controls ("the menu… then the total").
- **No shake.** Never move the camera while the narrator is reading a value off the screen.

## Marks on the footage (`overlays`)

Overlays use recording pixels and follow the camera. They default `at` to the screen's `at`.

| Element | Use |
|---|---|
| `markerBox` | Yellow (default) or red hand-drawn rectangle. It draws on in 10 frames around a control, card or row. Give it `exitAt` when the focus moves on |
| `highlight` | Multiply-blended yellow block over text. The text stays readable |
| `circle` with `box` | Red marker ring around a number or button (`pad` 12–20) |
| `arrow`, `strike` | Point at or cross out something on screen |
| `cursor` | Glide a pointer along `path` points with click pulses. Use it on screenshots or footage recorded with `cursor: false` |
| `redact` | Opaque striped cover over a secret. See Privacy |
| `tag`, `stamp`, `sticker`, `label`, `badge` | Callouts locked to a spot on the screen |

- One yellow mark at a time. A red mark means "this is the thing" or "this is wrong".
- Drop a mark when the narration moves on (`exitAt`). Stale marks are the most common clutter.

## Elements around the box

| Element | Use it for |
|---|---|
| `paperCard` | A torn card with `kicker`, `title`, `quote`, `body`, `src` and `items` rows that fade in on their own anchors. Use it for the prompt a user typed, a requirements list, or a MET / NOT MET verdict list (`value` + `valueColor`) |
| `steps` | Numbered torn strips that slide in one by one, such as an agent's tool calls or a pipeline. `tool` is the bold red prefix, and `highlight: true` marks the payoff step |
| `terminal` | Dark torn terminal. Each command types at 1.6 chars per frame with a block cursor, then a green or red `verdict` pill pops in. Items without `at` stagger by 30 frames |
| `countUp` | A big Anton number counting to `to` over 14 frames, with a typewriter label under it. Use it for a total, a duration or a count of passing tests |
| `phone` | A device frame with a screenshot or recording inside. `media.scroll` scrolls a full-page screenshot |
| `polaroid` | A tilted photo print with a caption, for a still of the result |
| `tape` | A loose masking-tape strip to pin a card to the desk |
| `stamp` | Rubber-stamp verdict that slams in (`size` 46–96, `color` red or ink). Use it for PASSED, ORDER #42 or SHIPPED |
| `tag` | A torn label for the payoff number. For text with `×`, `+` or `=` use `font: "typewriter"` |
| `headline` with `width` + `/` | Left-aligned headline beside a box or card. A lone `/` forces a line break |

## Scene patterns from the reference demo

- **Hook (no box).** A headline states the problem. A white paperCard holds the messy "before" (a quote or a pasted prompt), an arrow points to a tag naming the fix, and a stamp lands on the verb. Use a hard `cut` in, and a fade from black.
- **Action.** The box with the live recording. The camera pushes on the control, a markerBox draws on as it is named, and the result gets a circle plus a side tag with the arithmetic or value.
- **Step change.** Same box, `enterFrom: "right"`, with a new kicker (`STEP 2 · …`). The camera starts where the last scene ended, for continuity.
- **Wait.** Time-lapse the footage with `badge.speed: "TIME-LAPSE 20×"` or a clock, and count up the elapsed time beside it.
- **Proof.** Put a paperCard verdict list or a terminal with green verdict pills next to (or instead of) the box, and add a stamp.
- **How it was made.** A left headline, `steps` on the left and a `terminal` on the right, with each item anchored to the word that names it.
- **Mobile.** A headline on the left and a phone on the right scrolling the full page, with a countUp of the same number to show it matches.
- **Close.** A black page pushed from the bottom with a left-aligned 3-line headline, the last line highlighted, a typewriter credit line, and a fade to black.

Alternate `pushRight` and `pushBottom` between scenes. Under a push, the outgoing page darkens slightly.

## Privacy rules (hard)

- **Cover from frame 0.** `redact` is fully opaque from its first frame. Start it at `0` (scene start), not on the word that mentions the secret. The secret is usually visible before it is named.
- **Cover for as long as it can be on screen.** Leave `until` unset (the cover stays to the end of the scene) unless the page really changes. The incident this rule comes from: a cover lifted on a narration word while the recording still showed the URL for 12 more seconds.
- **Check every scene that uses the same recording.** A later scene may map a time range where the secret is visible. Use `maxSec` and `timeMap` to keep other scenes outside that range.
- **Check the actual frames.** Sweep each scene with `render_stills` at `step` ≤ 15 through every redacted range. Then pull frames from the final MP4 at the scene entry and right after every camera move. Words alone are not proof.
- **Keep secrets out of the capture where you can.** Use a demo account or fake data. Point the app at a test key, and never record real API keys, resource names, emails or tokens you cannot cover.
- **Keep captures out of git** if they contain any secret, covered or not. A cover only exists in the render; the source footage still has the secret.

## Claims must match the software

Every on-screen claim must be true of the code shown: a step count, a tool name, a speed-up or a "safe by default". In the reference demo a line claimed a safety check that the code did not do, and it had to be cut late. Read the relevant code or run the feature before you put a claim in a tag or stamp. Show the number the software printed, not a rounded marketing number.

## Glyphs and type

- Fonts: Playfair Display Italic (headlines), Anton (numbers and tags), Courier Prime (kickers, terminal, steps), Inter (`font: "ui"` labels and card bodies).
- Anton draws `×`, `+` and `=` far too small. Put arithmetic in `font: "typewriter"` tags.
- Avoid `→`, `▌` and emoji in on-screen text. Headless Chromium renders some of them as empty boxes. Write `->`, use the terminal's own cursor, and replace emoji in your own app with inline SVG before capturing.
- Kickers: caps, a mid-dot separator (`STEP 2 · ONE TAP`), 24–26 px at y 40–46.

## Voice (Sarvam)

- Defaults: `bulbul:v4-flash`, speaker `shubh_en_narration` (Indian-English male), `en-IN`, pace 1.07, 48 kHz. `list_voices` with `provider: "sarvam"` lists tested speakers.
- One request per sentence, cached by text. Silence is trimmed, with 0.28 s between sentences.
- Word timings are estimated by syllable weight. Anchor footage changes on distinctive words (nouns, numbers), not on "the" or "and".
- Write numbers as words when the voice should say them a certain way ("Eighty five rupees"). The STT check ignores number formatting differences.

## Checklist

- [ ] `cadence: "smooth"`, `fade` set, and the first scene uses a `cut`.
- [ ] Every screen has `maxSec`, and its `timeMap` maps each visible change to the word that names it.
- [ ] Each camera push holds before and after the move. Zoom stays ≤ 1.8.
- [ ] Overlay boxes are measured from a still, not guessed, and they still sit right after the camera moves.
- [ ] One active yellow mark at a time, with `exitAt` when focus moves.
- [ ] Every secret has a `redact` from frame 0 to scene end. Sweeps and MP4 frames show nothing readable.
- [ ] No `×`, `+` or `=` in Anton, and no `→`, `▌` or emoji anywhere.
- [ ] Every claim was checked against the code or a real run.
- [ ] Voice generated with `check: true` and no `problems` left.
- [ ] `render_stills` swept every scene on the voiced spec before `render_video`.
