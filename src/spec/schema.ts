import { z } from "zod";

/**
 * Timing anchor. A number is a frame offset from the scene start.
 * A string is a narration word in the same scene: "borrow", "borrow#2" (2nd occurrence),
 * "borrow+3" / "borrow-2" (frame offset), "start", "start+10", "end", "end-15".
 */
export const Anchor = z.union([z.number(), z.string()]);
export type Anchor = z.infer<typeof Anchor>;

const Point = z.tuple([z.number(), z.number()]);

const Base = {
  id: z.string().optional(),
  at: Anchor.optional().describe("When the element starts. Defaults to scene start."),
  exitAt: Anchor.optional().describe("Blur-out exit (3 frames)."),
  dimAt: Anchor.optional().describe("Dim to ~45% (6 frames)."),
};

const Color = z.string().describe("Token name (ink, red, yellow, grey, onBlack, card) or a CSS colour.");

export const TypewriterEl = z.object({
  ...Base, type: z.literal("typewriter"), text: z.string(),
  x: z.number().optional(), y: z.number().optional().describe("Baseline-ish top y, default 40"),
  size: z.number().optional(), color: Color.optional(),
});

export const HeadlineEl = z.object({
  ...Base, type: z.literal("headline"),
  text: z.string().describe("Words fade in synced to narration. **word** = bold emphasis, ==word(s)== = bold + yellow highlighter, a lone / = line break."),
  variant: z.enum(["headline", "subline"]).optional(),
  x: z.number().optional(), y: z.number().optional(), align: z.enum(["left", "center"]).optional(),
  size: z.number().optional(), color: Color.optional(),
  width: z.number().optional().describe("Text box width in px. Set it (e.g. 700) for left-aligned headlines beside a screen box so lines wrap."),
  lineHeight: z.number().optional(),
  wordAt: z.array(Anchor).optional().describe("Explicit per-word anchors; overrides narration matching."),
});

export const BigNumberEl = z.object({
  ...Base, type: z.literal("bigNumber"), text: z.string(),
  x: z.number().optional(), y: z.number().optional().describe("Top of the glyphs"),
  size: z.number().optional().describe("Font size px (cap height ≈ 0.72×)"), color: Color.optional(),
  align: z.enum(["left", "center"]).optional(),
});

export const LabelEl = z.object({
  ...Base, type: z.literal("label"), text: z.string(),
  x: z.number(), y: z.number(), size: z.number().optional(), color: Color.optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  font: z.enum(["typewriter", "number", "headline", "ui"]).optional(),
});

export const CutoutEl = z.object({
  ...Base, type: z.literal("cutout"),
  asset: z.enum(["capitol", "hourglass", "jet", "moneyStack", "bill", "person", "coin", "house"]).optional(),
  src: z.string().optional().describe("Local image path or URL (PNG with transparency preferred). Overrides asset."),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  rotate: z.number().optional(), grayscale: z.boolean().optional(),
});

export const StickerEl = z.object({
  ...Base, type: z.literal("sticker"), top: z.string().optional(), main: z.string(),
  x: z.number(), y: z.number(), w: z.number().optional(), rotate: z.number().optional(), color: Color.optional(),
  size: z.number().optional().describe("Main text size, default 68"),
});

export const TagEl = z.object({
  ...Base, type: z.literal("tag"), text: z.string(),
  x: z.number(), y: z.number(), size: z.number().optional(), rotate: z.number().optional(),
  color: z.enum(["yellow", "white", "red", "ink"]).optional(),
  font: z.enum(["number", "typewriter", "ui"]).optional().describe("number (Anton, default) or typewriter for code-like text"),
});

export const ArrowEl = z.object({
  ...Base, type: z.literal("arrow"), from: Point, to: Point, bend: z.number().optional(), frames: z.number().optional(), color: Color.optional(),
});

/** [x, y, w, h] in source pixels (inside a screen: the 1920x1080 recording's pixels). */
const Box = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const CircleEl = z.object({
  ...Base, type: z.literal("circle"),
  cx: z.number().optional(), cy: z.number().optional(), rx: z.number().optional(), ry: z.number().optional(),
  box: Box.optional().describe("Alternative to cx/cy/rx: ring a [x, y, w, h] box with `pad` px of room."),
  pad: z.number().optional(), width: z.number().optional(), frames: z.number().optional(), color: Color.optional(),
}).refine((e) => e.box || (e.cx !== undefined && e.cy !== undefined && e.rx !== undefined), "circle needs `box` or cx, cy and rx");

export const StrikeEl = z.object({
  ...Base, type: z.literal("strike"), x1: z.number(), x2: z.number(), y: z.number(), frames: z.number().optional(), color: Color.optional(),
});

export const ProgressBarEl = z.object({
  ...Base, type: z.literal("progressBar"), x: z.number().optional(), y: z.number().optional(), w: z.number().optional(),
  startLabel: z.string().optional(), endLabel: z.string().optional(),
});

export const MoneyStacksEl = z.object({
  ...Base, type: z.literal("moneyStacks"), perRow: z.number().optional(),
  rows: z.array(Anchor).describe("One anchor per row: when that row starts dropping in."),
  shrinkAt: Anchor.optional().describe("Whole group shrinks to a point and disappears."),
  baselineY: z.number().optional(),
});

export const PersonGridEl = z.object({
  ...Base, type: z.literal("personGrid"), cols: z.number().optional(), rows: z.number().optional(),
  bills: z.boolean().optional().describe("Money burst from the centre, one bill above each head."),
  highlightAt: Anchor.optional().describe("Centre person turns red."),
  focusAt: Anchor.optional().describe("Grid splits and camera pushes in on the red person; others turn grey."),
  circleAt: Anchor.optional().describe("Red hand-drawn circle around the red person."),
  pullBackAt: Anchor.optional().describe("Crowd rejoins, turns black, camera pulls back."),
  y: z.number().optional(),
});

const ChartRule = z.object({
  y: z.number(), label: z.string(), color: Color.optional(), at: Anchor.optional(),
  side: z.enum(["left", "right"]).optional().describe("Label side. Can switch after a zoom with sideAfterZoom."),
  sideAfterZoom: z.enum(["left", "right"]).optional(),
});
const ChartEvent = z.object({ x: z.number(), label: z.string() });
const ChartBracket = z.object({ x1: z.number(), x2: z.number(), label: z.string(), left: z.string().optional(), right: z.string().optional(), at: Anchor, color: Color.optional() });

export const LineChartEl = z.object({
  ...Base, type: z.literal("lineChart"),
  data: z.array(Point).describe("[x, y] points sorted by x (e.g. year, trillions)."),
  xDomain: Point, yDomain: Point,
  xTicks: z.array(z.number()).optional(),
  draws: z.array(z.object({ at: Anchor, toX: z.number(), frames: z.number().optional() })).describe("Line draw phases."),
  zooms: z.array(z.object({ at: Anchor, xDomain: Point, yDomain: Point, xTicks: z.array(z.number()).optional(), frames: z.number().optional() })).optional(),
  rules: z.array(ChartRule).optional(),
  events: z.array(ChartEvent).optional(),
  brackets: z.array(ChartBracket).optional(),
  chipDecimals: z.number().optional().describe("Decimals in the tip chip (0 = years)."),
  box: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
});

export const CardEl = z.object({
  ...Base, type: z.literal("card"), title: z.string(), caption: z.string().optional(),
  rows: z.array(z.object({ label: z.string(), value: z.string().optional(), valueAt: Anchor.optional(), color: Color.optional() })),
  highlightRow: z.object({ index: z.number(), at: Anchor }).optional(),
  moveAt: Anchor.optional(), moveToX: z.number().optional(),
  x: z.number().optional(), y: z.number().optional(), w: z.number().optional(),
});

export const BarChartEl = z.object({
  ...Base, type: z.literal("barChart"),
  bars: z.array(z.object({ label: z.string(), value: z.number(), color: Color.optional(), at: Anchor, asset: CutoutEl.shape.asset.optional(), src: z.string().optional() })),
  x: z.number().optional(), w: z.number().optional(), baselineY: z.number().optional(), maxHeight: z.number().optional(),
});

export const HBarChartEl = z.object({
  ...Base, type: z.literal("hbarChart"),
  bars: z.array(z.object({ label: z.string(), value: z.number(), color: Color.optional(), at: Anchor, icon: z.enum(["person", "cross", "shield", "percent", "house", "none"]).optional() })),
  tag: z.object({ bar: z.number(), text: z.string(), at: Anchor }).optional(),
  reorderAt: Anchor.optional().describe("Bars re-sort by value (largest on top)."),
  badge: z.object({ bar: z.number(), text: z.string(), at: Anchor }).optional(),
  labelHighlight: z.object({ bar: z.number(), at: Anchor }).optional(),
  x: z.number().optional(), y: z.number().optional(), maxWidth: z.number().optional(),
});

export const YearFlipEl = z.object({
  ...Base, type: z.literal("yearFlip"), from: z.number(), to: z.number(), frames: z.number().optional(),
  label: z.string().optional(),
  stamp: z.object({ text: z.string(), at: Anchor }).optional(),
  dockAt: Anchor.optional().describe("Chip (and stamp) fly to the top-left corner and stay."),
});

export const StampEl = z.object({
  ...Base, type: z.literal("stamp"), text: z.string(), x: z.number(), y: z.number(), rotate: z.number().optional(),
  size: z.number().optional().describe("Default 40; the box-style verdict stamps use 46-96"), color: Color.optional(),
});
export const BadgeEl = z.object({ ...Base, type: z.literal("badge"), text: z.string(), x: z.number(), y: z.number(), size: z.number().optional() });

export const TotalCounterEl = z.object({
  ...Base, type: z.literal("totalCounter"), label: z.string(), x: z.number().optional(), y: z.number().optional(),
  freezeAt: Anchor.optional(),
});

/* ------------------------------------------------------------------ box style: marks for real footage */

export const MarkerBoxEl = z.object({
  ...Base, type: z.literal("markerBox"), box: Box,
  color: Color.optional().describe("Default yellow"), width: z.number().optional(), frames: z.number().optional().describe("Draw-on frames, default 10"),
});

export const HighlightEl = z.object({
  ...Base, type: z.literal("highlight"), box: Box,
  color: Color.optional().describe("Default yellow; multiply-blended so the text under it stays readable"), frames: z.number().optional(),
});

export const RedactEl = z.object({
  ...Base, type: z.literal("redact"), box: Box,
  until: Anchor.optional().describe("When the cover lifts. Default: never (stays until the scene ends). Keep it on for as long as the secret can be on screen."),
  style: z.enum(["stripes", "solid"]).optional(),
});

export const CursorEl = z.object({
  ...Base, type: z.literal("cursor"),
  path: z.array(z.object({ at: Anchor, x: z.number(), y: z.number(), click: z.boolean().optional() }))
    .describe("Pointer glides (14 frames, ease-out) to each point; click = yellow ring pulse. Use on screenshots or footage recorded without a cursor."),
  size: z.number().optional(),
});

export const TapeEl = z.object({ ...Base, type: z.literal("tape"), x: z.number(), y: z.number(), w: z.number().optional(), rotate: z.number().optional() });

export const PolaroidEl = z.object({
  ...Base, type: z.literal("polaroid"), src: z.string(), x: z.number(), y: z.number(), w: z.number(),
  caption: z.string().optional(), rotate: z.number().optional(),
});

/** Elements that can sit inside a screen box, positioned in the recording's own 1920x1080 pixels. */
export const OverlayEl = z.discriminatedUnion("type", [
  MarkerBoxEl, HighlightEl, CircleEl, ArrowEl, StrikeEl, RedactEl, CursorEl, TagEl, LabelEl, StampEl, StickerEl, BadgeEl, CutoutEl, PolaroidEl,
]);

/* ------------------------------------------------------------------ box style: real software in a box */

export const ScreenMedia = z.object({
  src: z.string().describe("Screen recording (.mp4/.webm/.mov) or screenshot (.png/.jpg), ideally 1920x1080. Local path or URL."),
  kind: z.enum(["video", "image"]).optional().describe("Default from the file extension"),
  at: Anchor.optional().describe("Layer appears (default: with the screen)"),
  endAt: Anchor.optional().describe("Layer fades out"),
  fade: z.number().optional().describe("Cross-fade frames, default 6"),
  timeMap: z.array(z.object({ at: Anchor, t: z.number().describe("Seconds into the recording") })).optional()
    .describe("Time-remap the recording onto the narration: freeze (same t twice), real time, or time-lapse (big jump in t). Before the first pair it holds that frame; after the last it plays on at `rate`."),
  start: z.number().optional().describe("Without timeMap: recording second shown when the layer appears. Default 0"),
  rate: z.number().optional().describe("Playback rate without timeMap / after its last pair. Default 1"),
  maxSec: z.number().optional().describe("Never play past this second (holds the last good frame)"),
  scroll: z.array(z.object({ at: Anchor, y: z.number().describe("Pixels scrolled down the image") })).optional()
    .describe("Images only: scroll a tall full-page screenshot inside the box"),
  volume: z.number().optional().describe("0..1, default 0 (muted)"),
});

export const ScreenEl = z.object({
  ...Base, type: z.literal("screen"),
  x: z.number().optional().describe("Default 200"), y: z.number().optional().describe("Default 112"), w: z.number().optional().describe("Default 1520; height = 16:9 + title bar"),
  rotate: z.number().optional().describe("Default -0.5"),
  enterFrom: z.enum(["bottom", "right", "left", "none"]).optional().describe("Slides in over 16 frames. Default bottom"),
  url: z.string().optional().describe("Text in the address pill, e.g. localhost:3000"),
  chrome: z.enum(["window", "none"]).optional().describe("macOS-style title bar with traffic lights (default) or bare"),
  mat: z.enum(["card", "white", "none"]).optional().describe("Torn paper mat behind the window. Default card"),
  tapes: z.boolean().optional().describe("Masking tape on the top corners. Default true"),
  media: z.array(ScreenMedia).min(1).describe("Layers, later ones on top. Cut between recordings by giving each an at/endAt."),
  camera: z.array(z.object({ at: Anchor, x: z.number(), y: z.number(), zoom: z.number() })).optional()
    .describe("Keyframes in recording pixels: centre x/y and zoom (1 = whole screen, 1.5-1.8 = push in on a control). Ease-in-out between keys; repeat a key to hold."),
  badge: z.object({
    text: z.string().optional().describe("Red chip text, default LIVE"),
    speed: z.string().optional().describe("Yellow text before the chip, e.g. 1x, TIME-LAPSE 30x"),
    clock: z.object({ offset: z.number().optional().describe("Seconds subtracted from recording time"), prefix: z.string().optional() }).optional()
      .describe("Show a mm:ss clock from the first video layer's mapped time instead of `text`"),
  }).optional(),
  moveTo: z.object({ at: Anchor, x: z.number(), y: z.number(), w: z.number(), frames: z.number().optional() }).optional()
    .describe("Shrink/move the box mid-scene to open a split layout (e.g. room for a phone or terminal)"),
  overlays: z.array(OverlayEl).optional().describe("Marks locked to the recording (recording pixels); they follow the camera."),
});

/* ------------------------------------------------------------------ box style: cards and devices */

export const PaperCardEl = z.object({
  ...Base, type: z.literal("paperCard"),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  rotate: z.number().optional(), fill: Color.optional().describe("card (default), white, red, yellow, ink or dark"), seed: z.number().optional(),
  kicker: z.string().optional().describe("Small letter-spaced caps line at the top (red on light cards)"),
  title: z.string().optional().describe("Anton title"), titleSize: z.number().optional(),
  quote: z.string().optional().describe("Italic serif quote"), quoteSize: z.number().optional(),
  body: z.string().optional().describe("Plain UI text, e.g. a prompt someone typed"), bodySize: z.number().optional(),
  src: z.string().optional().describe("Image inside the card (below the text)"),
  items: z.array(z.object({
    text: z.string(), value: z.string().optional(), valueColor: Color.optional(), prefix: z.string().optional(), at: Anchor.optional(),
  })).optional().describe("Rows that fade in on their own anchors: a checklist, requirements R1..R7, MET / NOT MET"),
  align: z.enum(["left", "center"]).optional(),
});

export const CountUpEl = z.object({
  ...Base, type: z.literal("countUp"), x: z.number(), y: z.number(), to: z.number(), from: z.number().optional(),
  frames: z.number().optional().describe("Count duration, default 14"), decimals: z.number().optional(),
  prefix: z.string().optional(), suffix: z.string().optional(), size: z.number().optional(), color: Color.optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  label: z.string().optional().describe("Typewriter caps under the number"),
});

export const TerminalEl = z.object({
  ...Base, type: z.literal("terminal"), x: z.number(), y: z.number(), w: z.number(), h: z.number().optional(),
  title: z.string().optional(), rotate: z.number().optional(), size: z.number().optional().describe("Font size, default 30"),
  lines: z.array(z.object({
    cmd: z.string().describe("Typed at 1.6 chars/frame with a blinking block cursor"),
    at: Anchor.optional(), verdict: z.string().optional().describe("Pill that pops in when typing ends"), ok: z.boolean().optional(),
    output: z.string().optional().describe("Dim line printed under the command"),
  })),
});

export const StepsEl = z.object({
  ...Base, type: z.literal("steps"), x: z.number(), y: z.number(), w: z.number().optional(),
  size: z.number().optional(), numbered: z.boolean().optional(),
  items: z.array(z.object({
    text: z.string(), tool: z.string().optional().describe("Bold prefix, e.g. write_file"), at: Anchor.optional(),
    highlight: z.boolean().optional().describe("Yellow strip + red disc (the payoff step)"),
  })).describe("Numbered torn strips that slide in one by one: an agent's tool calls, a recipe, a pipeline"),
});

export const PhoneEl = z.object({
  ...Base, type: z.literal("phone"), x: z.number(), y: z.number(), w: z.number().optional().describe("Default 440"),
  media: ScreenMedia, rotate: z.number().optional(), label: z.string().optional(),
});

export const Element = z.discriminatedUnion("type", [
  TypewriterEl, HeadlineEl, BigNumberEl, LabelEl, CutoutEl, StickerEl, TagEl, ArrowEl, CircleEl, StrikeEl,
  ProgressBarEl, MoneyStacksEl, PersonGridEl, LineChartEl, CardEl, BarChartEl, HBarChartEl, YearFlipEl,
  StampEl, BadgeEl, TotalCounterEl,
  MarkerBoxEl, HighlightEl, RedactEl, CursorEl, TapeEl, PolaroidEl, ScreenEl, PaperCardEl, CountUpEl, TerminalEl, StepsEl, PhoneEl,
]);
export type Element = z.infer<typeof Element>;

export const Word = z.object({ text: z.string(), start: z.number(), end: z.number() });
export type Word = z.infer<typeof Word>;

export const Scene = z.object({
  id: z.string(),
  narration: z.string().optional().describe("What the narrator says during this scene. Drives timing."),
  duration: z.number().optional().describe("Frames. Default: narration length + lead-in + tail."),
  minDuration: z.number().optional(),
  background: z.enum(["paper", "black"]).optional(),
  transition: z.enum(["pushRight", "pushBottom", "blur", "cut"]).optional().describe("How this scene enters. Default alternates pushRight/pushBottom."),
  source: z.string().optional().describe("Citation line, bottom-left."),
  elements: z.array(Element),
});
export type Scene = z.infer<typeof Scene>;

export const SceneVoice = z.object({
  audio: z.string().describe("Local path or URL of this scene's narration audio."),
  duration: z.number().describe("Seconds."),
  words: z.array(Word).describe("Word timings in seconds from the start of the audio."),
});
export type SceneVoice = z.infer<typeof SceneVoice>;

export const VideoSpec = z.object({
  title: z.string().optional(),
  fps: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  cadence: z.enum(["on-threes", "smooth"]).optional().describe("on-threes = 20 fps motion on 30 fps (reference look)."),
  wpm: z.number().optional().describe("Speaking rate for estimated timing when no voiceover exists. Default 205."),
  counter: z.object({
    label: z.string(),
    ratePerSecond: z.number(),
    prefix: z.string().optional(),
    bigInFirstScene: z.boolean().optional(),
    flash: z.object({ from: Anchor, to: Anchor }).optional().describe("Red flash while big (anchors in first scene)."),
    y: z.number().optional(),
  }).optional(),
  fade: z.object({ in: z.number().optional(), out: z.number().optional() }).optional()
    .describe("Frames to fade from black at the start / to black at the end. Box-style demos use { in: 12, out: 22 }."),
  voiceover: z.record(z.string(), SceneVoice).optional().describe("Per-scene audio + word timings (from generate_voiceover)."),
  scenes: z.array(Scene).min(1),
});
export type VideoSpec = z.infer<typeof VideoSpec>;
