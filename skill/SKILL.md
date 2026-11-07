---
name: vox-style-motion
description: Write, time and render Vox-style explainer videos (paper texture, typewriter kickers, italic serif headlines synced word-by-word to narration, giant condensed numbers, torn-paper cutouts and charts) with Remotion and ElevenLabs only. Use with the vox-style-motion MCP server.
---

# Vox-style motion: skill

This style was measured frame by frame from a 31.4 s reference (943 frames, 1920×1080, 30 fps).
Everything is drawn with code: Remotion renders the visuals, ElevenLabs reads the narration. No video-generation models.

## Workflow with the MCP tools

1. `get_style_guide` (this file). Use `section: "effects"` or `"tokens"` for exact numbers.
2. Write the script as **scenes**. One scene = one beat = one narration sentence or two (3–7 s).
3. Write a spec (see `get_spec_schema` for the schema and two full examples). Anchor every element to a narration word.
4. `validate_spec`. It shows the frame of every word and element and warns about anchors that matched nothing. Fix warnings.
5. `render_still` on 2–3 frames per scene (`scene` + `offset`) and look at the image. Fix overlaps.
6. `generate_voiceover` (needs `ELEVENLABS_API_KEY`). It writes `spec.voiced.json` with real word timings. Without a key, skip this: timing is estimated at 205 words per minute and the video renders silent.
7. `render_video` on the voiced spec. Use `from_frame`/`to_frame` for a quick partial check first.

## Writing the narration

- Short declarative sentences, second person, present tense. One number per sentence.
- Pattern: hook with a live number → the big number → make it personal → show it is speeding up → name the real problem → project forward → moral in a two-line contrast.
- Write numbers as digits with symbols (`$40 trillion`, `$117,000`, `2048`). ElevenLabs reads them correctly and anchors can match them (`"$117,000"`).
- Reference pace: about 205 words per minute while speaking. Pauses of 0.2 s between phrases and 0.4 s between beats. No music bed and no sound effects; the voice is dry and close.

## Timing rules (measured)

- Every on-screen word appears on its spoken word, 0–3 frames early. Never show a sentence before it is said.
- A visual event every 0.3–0.6 s. Never hold more than about 1.2 s with nothing moving (the corner counter ticking counts).
- Motion runs on threes: 20 fps animation on a 30 fps timeline (`cadence: "on-threes"`, the default). This gives the paper-cutout feel.
- Easing: ease-out for entries, ease-in-out for moves and page pushes, ease-in for shrink-outs.

## Layout (1920×1080 source pixels)

| Zone | Use |
|---|---|
| y 40–70 | Typewriter kicker in caps (topic label) |
| y 60–200 | Italic serif headline, centred, words fade in place |
| y 110–330 | Giant condensed number or key word (Anton, ~215 px) |
| y 340–960 | The visual: grid, chart, card, cutouts |
| top-right 1470–1861 × 15–122 | Persistent torn tag with the live counter |
| top-left ~141–306 × 92–177 | Docked chip for a key number of the beat |
| bottom-left (122, 1000) | Tiny grey source line, always present once a statistic is on screen |

Keep 120 px side margins. Centre-align by default; left-align only on the black closing card.

## Colour and type

- Paper `#EBE5DC` with a faint 40 px grid and a warm vignette (`#D4CEC2` → `#BDB5AA`). Closing beat on pure black.
- Ink `#171310`, red `#D2251D` (the subject, the bad number), highlighter yellow `#F1D01A`, grey `#756F6A` for de-emphasis.
- Red is the subject of the story. Black/ink is the comparison. Yellow only marks the word or row the narrator stresses.
- Fonts: Playfair Display Italic (headlines, emphasis at weight 900), Anton (numbers and key words), Courier Prime bold letter-spaced caps (labels, kickers, sources).

## Effects vocabulary (spec element types)

| Element | When to use it | Key behaviour |
|---|---|---|
| `typewriter` | Kicker / topic | ~1 char per shown frame |
| `headline` | The sentence being said | Words fade pale → ink on their word. `**bold**`, `==bold + highlighter==` |
| `bigNumber` | The number of the beat | Glyphs rise from a baseline mask, 1 frame stagger |
| `progressBar` | "Before this video ends" type hooks | Draw-on, flag, red fill tracks the whole video |
| `cutout` | A real-world object | Ghost frame, rotated pop with 5% overshoot. Use `src` for your own PNG |
| `sticker` | The payoff number as a callout | Red torn paper, spins in from −12° |
| `arrow`, `circle`, `strike` | Pointing, singling out, negating | Red marker stroke draws on in 5–8 frames |
| `moneyStacks` | Piles of money | Rows drop in left → right, shrink to a point |
| `personGrid` | "Per person" numbers | Radial pop-in, bill burst, one red person, split + push-in, pull back |
| `lineChart` | Growth over time | Line draws with a year chip at the tip, event markers, span brackets, animated zoom |
| `card` | A table / budget | Torn white card slides up; values wipe in; rows highlight |
| `barChart` | Two to four totals | Torn bars rise from the baseline with an object on top |
| `hbarChart` | Rankings | Bars grow, tag, re-sort with the subject rising to #1, badge |
| `yearFlip` | Projections | Split-flap year count, PROJECTED stamp slam, docks to the corner |
| `tag`, `stamp`, `badge`, `label` | Small callouts | Pop-ins |
| `totalCounter` | Closing "while you watched" total | Freezes; corner counter fades out |

Element options: `at` (start), `exitAt` (blur out), `dimAt` (drop to 45%).

## Anchors

`at` and the other timing fields accept a frame number (scene-local) or a narration word:
`"borrow"`, `"the#2"` (second occurrence), `"$117,000+4"` (4 frames after), `"start+10"`, `"end-12"`.
Matching ignores case and punctuation, and words of 4+ letters also match by prefix.

## Transitions

- Within a page: old content blurs out over 3 frames (`exitAt`, or `transition: "blur"` for the next scene).
- Between pages: a new torn-edge page slides over the old one, which blurs underneath. Alternate `pushRight` and `pushBottom` (the default). ~10 frames, ease-in-out.
- The last beat pushes a black page from the bottom.
- No hard cuts, no camera drift, no shake.

## Persistence

- A live counter (`counter` in the spec) starts big in the first scene, flies to a torn tag in the top-right when scene 2 starts, and keeps ticking for the whole video. Rate is per second (`77105.04` in the reference: about $2.43 trillion a year).
- The key number of a beat can dock into a corner and stay (`yearFlip.dockAt`).

## Assets

There are built-in drawn stand-ins (`capitol`, `hourglass`, `jet`, `moneyStack`, `bill`, `person`, `coin`, `house`). The reference used photographic cutouts. For that look, pass `src` with a transparent PNG (a licensed photo cutout) on `cutout` and `barChart` bars. Do not use generated imagery.

## Checklist before rendering

- [ ] Every scene has narration, and every element has an anchor on a narrated word.
- [ ] One red subject per beat. Yellow only on stressed words.
- [ ] A source line on every scene that shows a statistic.
- [ ] `validate_spec` returns no warnings.
- [ ] Stills checked: no overlap between headline, big number and the visual.
