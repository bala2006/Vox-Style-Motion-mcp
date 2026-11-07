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
  text: z.string().describe("Words fade in synced to narration. **word** = bold emphasis, ==word(s)== = bold + yellow highlighter."),
  variant: z.enum(["headline", "subline"]).optional(),
  x: z.number().optional(), y: z.number().optional(), align: z.enum(["left", "center"]).optional(),
  size: z.number().optional(), color: Color.optional(),
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
  font: z.enum(["typewriter", "number", "headline"]).optional(),
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
});

export const TagEl = z.object({
  ...Base, type: z.literal("tag"), text: z.string(),
  x: z.number(), y: z.number(), size: z.number().optional(), rotate: z.number().optional(),
  color: z.enum(["yellow", "white", "red", "ink"]).optional(),
});

export const ArrowEl = z.object({
  ...Base, type: z.literal("arrow"), from: Point, to: Point, bend: z.number().optional(), frames: z.number().optional(), color: Color.optional(),
});

export const CircleEl = z.object({
  ...Base, type: z.literal("circle"), cx: z.number(), cy: z.number(), rx: z.number(), ry: z.number().optional(), frames: z.number().optional(), color: Color.optional(),
});

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

export const StampEl = z.object({ ...Base, type: z.literal("stamp"), text: z.string(), x: z.number(), y: z.number(), rotate: z.number().optional() });
export const BadgeEl = z.object({ ...Base, type: z.literal("badge"), text: z.string(), x: z.number(), y: z.number(), size: z.number().optional() });

export const TotalCounterEl = z.object({
  ...Base, type: z.literal("totalCounter"), label: z.string(), x: z.number().optional(), y: z.number().optional(),
  freezeAt: Anchor.optional(),
});

export const Element = z.discriminatedUnion("type", [
  TypewriterEl, HeadlineEl, BigNumberEl, LabelEl, CutoutEl, StickerEl, TagEl, ArrowEl, CircleEl, StrikeEl,
  ProgressBarEl, MoneyStacksEl, PersonGridEl, LineChartEl, CardEl, BarChartEl, HBarChartEl, YearFlipEl,
  StampEl, BadgeEl, TotalCounterEl,
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
  voiceover: z.record(z.string(), SceneVoice).optional().describe("Per-scene audio + word timings (from generate_voiceover)."),
  scenes: z.array(Scene).min(1),
});
export type VideoSpec = z.infer<typeof VideoSpec>;
