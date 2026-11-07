import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, useCurrentFrame } from "remotion";
import type { ResolvedScene, ResolvedSpec } from "../spec/compile";
import { C, FONT } from "./theme";
import { SceneCtx, assetSrc, ease, fmtMoney, lerp, prog, rand } from "./lib";
import { BigNumber, Headline, Label, SourceLine, Typewriter } from "./components/text";
import { Arrow, Badge, Circle, Cutout, ProgressBar, Stamp, Sticker, Strike, Tag, TotalCounter } from "./components/objects";
import { MoneyStacks, PersonGrid } from "./components/groups";
import { BarChart, Card, HBarChart, LineChart, YearFlip } from "./components/charts";

export const PaperBackground: React.FC<{ kind: "paper" | "black" }> = ({ kind }) => {
  if (kind === "black") return <AbsoluteFill style={{ background: C.black }} />;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(120,108,92,0.10)" strokeWidth="1" />
          </pattern>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.27  0 0 0 0 0.22  0 0 0 0.09 0" /></filter>
          <radialGradient id="vig" cx="50%" cy="50%" r="75%">
            <stop offset="0.55" stopColor={C.paper} stopOpacity="0" />
            <stop offset="0.86" stopColor={C.vignetteMid} stopOpacity="0.85" />
            <stop offset="1" stopColor={C.vignetteCorner} stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#grid)" />
        <rect width="1920" height="1080" filter="url(#grain)" />
        <rect width="1920" height="1080" fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};

const ElementView: React.FC<{ el: any; t: number }> = ({ el, t }) => {
  if (t < el.at) return null;
  const lt = t - el.at;
  let body: React.ReactNode = null;
  switch (el.type) {
    case "typewriter": body = <Typewriter el={el} lt={lt} />; break;
    case "headline": body = <Headline el={el} t={t} />; break;
    case "bigNumber": body = <BigNumber el={el} lt={lt} />; break;
    case "label": body = <Label el={el} lt={lt} />; break;
    case "cutout": body = <Cutout el={el} lt={lt} />; break;
    case "sticker": body = <Sticker el={el} lt={lt} />; break;
    case "tag": body = <Tag el={el} lt={lt} />; break;
    case "arrow": body = <Arrow el={el} lt={lt} />; break;
    case "circle": body = <Circle el={el} lt={lt} />; break;
    case "strike": body = <Strike el={el} lt={lt} />; break;
    case "progressBar": body = <ProgressBar el={el} lt={lt} />; break;
    case "moneyStacks": body = <MoneyStacks el={el} t={t} />; break;
    case "personGrid": body = <PersonGrid el={el} t={t} />; break;
    case "lineChart": body = <LineChart el={el} t={t} />; break;
    case "card": body = <Card el={el} t={t} />; break;
    case "barChart": body = <BarChart el={el} t={t} />; break;
    case "hbarChart": body = <HBarChart el={el} t={t} />; break;
    case "yearFlip": body = <YearFlip el={el} t={t} />; break;
    case "stamp": body = <Stamp el={el} lt={lt} />; break;
    case "badge": body = <Badge el={el} lt={lt} />; break;
    case "totalCounter": body = <TotalCounter el={el} lt={lt} />; break;
    default: return null;
  }
  let opacity = 1, blur = 0;
  if (el.exitAt !== undefined && t >= el.exitAt) {
    const p = prog(t, el.exitAt, 3, ease.in);
    if (p >= 1) return null;
    opacity = 1 - p; blur = p * 18;
  }
  if (el.dimAt !== undefined) opacity *= lerp(1, 0.42, prog(t, el.dimAt, 6));
  if (opacity === 1 && blur === 0) return <>{body}</>;
  return <AbsoluteFill style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined }}>{body}</AbsoluteFill>;
};

function tornEdge(transition: "pushRight" | "pushBottom", inset = 0) {
  const pts: string[] = [];
  const amp = 7;
  if (transition === "pushRight") {
    for (let y = 0; y <= 1080; y += 16) pts.push(`${(rand(y) * amp + inset).toFixed(1)}px ${y}px`);
    pts.push("1960px 1080px", "1960px 0px");
  } else {
    for (let x = 1920; x >= 0; x -= 16) pts.push(`${x}px ${(rand(x + 3) * amp + inset).toFixed(1)}px`);
    pts.push("0px 1120px", "1920px 1120px");
  }
  return `polygon(${pts.join(", ")})`;
}

const SceneView: React.FC<{ scene: ResolvedScene; spec: ResolvedSpec; g: number }> = ({ scene, spec, g }) => {
  const t = g - scene.from;
  const next = spec.scenes[scene.index + 1];
  const pushing = (scene.transition === "pushRight" || scene.transition === "pushBottom") && t < scene.transitionFrames;
  const opaque = scene.index === 0 || scene.transition === "pushRight" || scene.transition === "pushBottom";

  // leaving: blur under the next page, or blur+fade for a same-page change
  let leaveBlur = 0, leaveOpacity = 1;
  if (next && t >= scene.duration) {
    const p = prog(t, scene.duration, Math.max(1, scene.overlap), ease.in);
    if (next.transition === "blur") { leaveBlur = p * 18; leaveOpacity = 1 - p; }
    else if (next.transition === "cut") { leaveOpacity = 0; }
    else leaveBlur = p * 14;
  }

  const content = (
    <SceneCtx.Provider value={{ t, g, scene, spec }}>
      {opaque && <PaperBackground kind={scene.background} />}
      {scene.source && t >= scene.sourceAt && <SourceLine text={scene.source} lt={t - scene.sourceAt} dark={scene.background === "black"} />}
      {scene.elements.map((el, i) => <ElementView key={i} el={el} t={t} />)}
    </SceneCtx.Provider>
  );

  let page = content;
  if (pushing) {
    const p = prog(t, 0, scene.transitionFrames, ease.inOut);
    const tr = scene.transition as "pushRight" | "pushBottom";
    const off = (1 - p) * (tr === "pushRight" ? 1940 : 1100);
    const transform = tr === "pushRight" ? `translateX(${off}px)` : `translateY(${off}px)`;
    const rim = scene.background === "black" ? "#3A3632" : "#FFFFFF";
    page = (
      <AbsoluteFill style={{ transform, filter: "drop-shadow(0 0 16px rgba(0,0,0,0.45))" }}>
        <AbsoluteFill style={{ background: rim, clipPath: tornEdge(tr, -6) }} />
        <AbsoluteFill style={{ clipPath: tornEdge(tr, 0) }}>{content}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (leaveBlur || leaveOpacity < 1) {
    page = <AbsoluteFill style={{ filter: leaveBlur ? `blur(${leaveBlur}px)` : undefined, opacity: leaveOpacity }}>{page}</AbsoluteFill>;
  }
  return <AbsoluteFill>{page}</AbsoluteFill>;
};

const CounterOverlay: React.FC<{ spec: ResolvedSpec; g: number }> = ({ spec, g }) => {
  const c = spec.counter!;
  const value = fmtMoney((g * c.ratePerSecond) / spec.fps, c.prefix);
  const hide = c.hideFrom !== undefined ? 1 - prog(g, c.hideFrom, 5) : 1;
  if (hide <= 0) return null;
  const flying = c.bigUntil >= 0 ? prog(g, c.bigUntil, 9, ease.out) : 1;
  const flash = c.flash && g >= c.flash[0] && g < c.flash[1];
  const tagIn = c.bigUntil >= 0 ? prog(g, c.bigUntil + 4, 4, ease.out) : 1;
  const bigSize = 190;
  const cx = lerp(960, 1668, flying), cy = lerp(c.y + 72, 80, flying);
  const sc = lerp(c.bigUntil >= 0 && g >= c.bigUntil - 1 && g < c.bigUntil + 1 ? 1.05 : 1, 0.2, flying);
  return (
    <AbsoluteFill style={{ opacity: hide }}>
      {flying < 1 && (
        <div style={{ position: "absolute", top: c.y - 60, width: "100%", textAlign: "center", fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 20, letterSpacing: "0.16em", color: "#3A3530", opacity: 1 - prog(g, c.bigUntil, 2) }}>{c.label}</div>
      )}
      <div style={{ position: "absolute", left: 1470, top: 15, width: 391, height: 107, transform: `scale(${tagIn})`, transformOrigin: "50% 40%", opacity: tagIn }}>
        <svg width={391} height={107} style={{ position: "absolute", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.25))" }}>
          <polygon points={Array.from({ length: 26 }, (_, i) => `${i * 16},${rand(i) * 6}`).concat(Array.from({ length: 26 }, (_, i) => `${391 - i * 16},${101 + rand(i + 50) * 6}`)).join(" ")} fill={C.tag} />
        </svg>
        <div style={{ position: "absolute", top: 14, width: "100%", textAlign: "center", fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: C.ink, opacity: flying }}>{c.label}</div>
      </div>
      <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%, -50%) scale(${sc})`, fontFamily: FONT.number, fontSize: bigSize, lineHeight: 1, color: flash && flying < 0.5 ? C.red : C.ink, whiteSpace: "nowrap" }}>{value}</div>
    </AbsoluteFill>
  );
};

export const VoxVideo: React.FC<{ resolved: ResolvedSpec }> = ({ resolved }) => {
  const frame = useCurrentFrame();
  const g = resolved.cadence === "on-threes" ? frame - (frame % 3 === 2 ? 1 : 0) : frame;
  let bg: "paper" | "black" = resolved.scenes[0]?.background ?? "paper";
  for (const s of resolved.scenes) if (s.from <= g) bg = s.background;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <PaperBackground kind={bg} />
      {resolved.scenes.map((s) => (g >= s.from && g < s.from + s.duration + s.overlap ? <SceneView key={s.id} scene={s} spec={resolved} g={g} /> : null))}
      {resolved.counter && <CounterOverlay spec={resolved} g={g} />}
      {resolved.scenes.map((s) => s.audio && (
        <Sequence key={`a-${s.id}`} from={s.from + s.audio.from} layout="none">
          <Html5Audio src={assetSrc(s.audio.src)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
