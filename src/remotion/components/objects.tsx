import React from "react";
import { Img, interpolateColors } from "remotion";
import { ASSETS } from "../assets";
import { C, FONT, col } from "../theme";
import { TornPaper, assetSrc, ease, fmtMoney, kf, prog, rand, useScene } from "../lib";
import { MaskRise } from "./text";

type El = Record<string, any>;

/** Ghost frame, then solid with a rotated pop that settles with overshoot. */
export function popIn(lt: number, rotFrom = -8, rotTo = 0) {
  const opacity = lt < 1 ? 0.35 : 1;
  const scale = kf(lt, [0, 1, 3, 4, 6], [0.82, 0.9, 1.0, 1.05, 1.0], ease.out);
  const rot = kf(lt, [0, 1, 4, 6], [rotFrom, rotFrom, rotTo + (rotTo - rotFrom) * 0.08, rotTo], ease.out);
  return { opacity, transform: `scale(${scale}) rotate(${rot}deg)` };
}

export const Visual: React.FC<{ asset?: string; src?: string; w: number; h: number; t?: number; grayscale?: boolean }> = ({ asset, src, w, h, t, grayscale }) => {
  if (src) return <Img src={assetSrc(src)} style={{ width: w, height: h, objectFit: "contain", filter: grayscale ? "grayscale(1) contrast(1.1)" : undefined }} />;
  const A = ASSETS[asset ?? "coin"] ?? ASSETS.coin;
  return <A w={w} h={h} t={t} />;
};

export const Cutout: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const p = popIn(lt, (el.rotate ?? 0) - 8, el.rotate ?? 0);
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, ...p, filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.3))" }}>
      <Visual asset={el.asset} src={el.src} w={el.w} h={el.h} t={lt} grayscale={el.grayscale} />
    </div>
  );
};

export const Sticker: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const w = el.w ?? 490;
  const h = el.top ? 140 : 110;
  const rotTo = el.rotate ?? -2.5;
  const scale = kf(lt, [0, 2, 4, 5, 6], [0.7, 0.85, 0.98, 1.05, 1.0]);
  const rot = kf(lt, [0, 2, 4, 6], [-12, -8, -4, rotTo]);
  const dx = kf(lt, [0, 4], [20, 0], ease.out);
  const dy = kf(lt, [0, 4], [-12, 0], ease.out);
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${rot}deg)`, transformOrigin: "center" }}>
      <TornPaper w={w} h={h} fill={col(el.color, C.red)} seed={11} amp={6}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          {el.top && <div style={{ fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 18, letterSpacing: "0.16em" }}>{el.top}</div>}
          <div style={{ fontFamily: FONT.number, fontSize: 68, lineHeight: 1.05 }}>{el.main}</div>
        </div>
      </TornPaper>
    </div>
  );
};

export const Tag: React.FC<{ el: El; lt: number; text?: string; style?: React.CSSProperties }> = ({ el, lt, text, style }) => {
  const kind = el.color ?? "yellow";
  const bg = kind === "yellow" ? C.yellow : kind === "white" ? C.tag : kind === "red" ? C.red : C.ink;
  const fg = kind === "red" || kind === "ink" ? "#fff" : C.ink;
  const size = el.size ?? 34;
  const s = kf(lt, [0, 2, 3], [1.35, 1.03, 1.0], ease.out);
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, transform: `scale(${s}) rotate(${el.rotate ?? -5}deg)`, opacity: lt < 1 ? 0.6 : 1, ...style }}>
      <div style={{ background: bg, color: fg, fontFamily: FONT.number, fontSize: size, lineHeight: 1.1, padding: `${size * 0.12}px ${size * 0.3}px`, border: kind === "yellow" ? `2.5px solid ${C.ink}` : undefined, borderRadius: 3, boxShadow: "0 4px 8px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
        {text ?? el.text}
      </div>
    </div>
  );
};

/** Hand-drawn stroke reveal: pathLength=1 so dashoffset is a 0..1 progress. */
const Stroke: React.FC<{ d: string; p: number; color: string; width?: number }> = ({ d, p, color, width = 6 }) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
);

export const Arrow: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const [x1, y1] = el.from, [x2, y2] = el.to;
  const frames = el.frames ?? 8;
  const bend = el.bend ?? 0.25;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const p = prog(lt, 0, frames);
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = 22;
  const h1 = `M${x2} ${y2} L${x2 - head * Math.cos(ang - 0.5)} ${y2 - head * Math.sin(ang - 0.5)}`;
  const h2 = `M${x2} ${y2} L${x2 - head * Math.cos(ang + 0.5)} ${y2 - head * Math.sin(ang + 0.5)}`;
  const color = col(el.color, C.red);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <Stroke d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} p={p} color={color} width={5} />
      {lt >= frames + 1 && <><Stroke d={h1} p={1} color={color} width={5} /><Stroke d={h2} p={1} color={color} width={5} /></>}
    </svg>
  );
};

export function circlePath(cx: number, cy: number, rx: number, ry: number, seed = 5) {
  const pts: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2.12;
    const j = 1 + (rand(seed + Math.floor(i / 6)) - 0.5) * 0.06 + (i / steps) * 0.05;
    pts.push(`${(cx + Math.cos(a) * rx * j).toFixed(1)} ${(cy + Math.sin(a) * ry * j).toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

export const Circle: React.FC<{ el: El; lt: number }> = ({ el, lt }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    <Stroke d={circlePath(el.cx, el.cy, el.rx, el.ry ?? el.rx * 1.15)} p={prog(lt, 0, el.frames ?? 5)} color={col(el.color, C.red)} width={6} />
  </svg>
);

export const Strike: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { x1, x2, y } = el;
  const d = `M${x1} ${y + 4} Q${(x1 + x2) / 2} ${y - 6} ${x2} ${y - 2}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <Stroke d={d} p={prog(lt, 0, el.frames ?? 6)} color={col(el.color, C.red)} width={9} />
    </svg>
  );
};

export const ProgressBar: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { g, spec } = useScene();
  const x = el.x ?? 320, y = el.y ?? 712, w = el.w ?? 1290, h = 36;
  const drawW = w * kf(lt, [0, 12], [0.82, 1], ease.out);
  const fillP = Math.min(1, g / spec.durationInFrames);
  const fillW = lt >= 16 ? Math.max(h, (w - 4) * fillP) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "absolute", width: drawW, height: h, border: `3px solid ${C.ink}`, borderRadius: h, background: "#F1ECE3", boxSizing: "border-box", overflow: "hidden" }}>
        {fillW > 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: fillW, background: C.red }} />}
      </div>
      {fillW > 0 && <div style={{ position: "absolute", left: fillW - 18, top: -6, width: 44, height: 44, borderRadius: 22, background: "#fff", border: `3px solid ${C.ink}`, boxSizing: "border-box" }} />}
      <div style={{ position: "absolute", left: drawW - 6, top: -62, opacity: prog(lt, 7, 5) }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: 62, background: C.ink }} />
        <div style={{ position: "absolute", left: 4, top: 2, width: 40, height: 26, background: C.ink, clipPath: "polygon(0 0, 100% 15%, 85% 50%, 100% 85%, 0 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: h + 18, fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 18, letterSpacing: "0.14em", color: "#3A3530" }}>{el.startLabel ?? "NOW"}</div>
      <div style={{ position: "absolute", left: w - 50, top: h + 18, fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 18, letterSpacing: "0.14em", color: "#3A3530", opacity: prog(lt, 7, 5) }}>{el.endLabel ?? "END"}</div>
    </div>
  );
};

export function stampSlam(lt: number) {
  return { scale: kf(lt, [0, 2, 3, 5, 8], [2.2, 1.4, 1.05, 0.85, 1.0]), opacity: kf(lt, [0, 3], [0.35, 0.95]) };
}

export const StampView: React.FC<{ text: string; lt: number; rotate?: number; size?: number }> = ({ text, lt, rotate = -10, size = 40 }) => {
  const s = stampSlam(lt);
  return (
    <div style={{ transform: `scale(${s.scale}) rotate(${rotate}deg)`, opacity: s.opacity, transformOrigin: "center", display: "inline-block" }}>
      <div style={{ border: `4px solid ${C.red}`, borderRadius: 6, padding: "2px 14px", fontFamily: FONT.number, fontSize: size, color: C.red, letterSpacing: "0.04em", background: "rgba(247,243,235,0.6)", maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,0.75) 100%)" }}>{text}</div>
    </div>
  );
};

export const Stamp: React.FC<{ el: El; lt: number }> = ({ el, lt }) => (
  <div style={{ position: "absolute", left: el.x, top: el.y }}><StampView text={el.text} lt={lt} rotate={el.rotate} /></div>
);

export function badgeScale(lt: number) { return kf(lt, [0, 1, 3, 4], [0.2, 1.25, 0.95, 1.0]); }

export const BadgeView: React.FC<{ text: string; lt: number; size?: number }> = ({ text, lt, size = 70 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: C.red, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.number, fontSize: size * 0.5, transform: `scale(${badgeScale(lt)})` }}>{text}</div>
);

export const Badge: React.FC<{ el: El; lt: number }> = ({ el, lt }) => (
  <div style={{ position: "absolute", left: el.x - (el.size ?? 70) / 2, top: el.y - (el.size ?? 70) / 2 }}><BadgeView text={el.text} lt={lt} size={el.size} /></div>
);

export const TotalCounter: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { scene, spec, t } = useScene();
  const rate = spec.counter?.ratePerSecond ?? 0;
  const gFrame = scene.from + (el.freezeAt !== undefined ? Math.min(t, el.freezeAt) : t);
  const value = Math.floor((gFrame * rate) / spec.fps);
  const x = el.x ?? 128, y = el.y ?? 830;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 17, letterSpacing: "0.14em", color: scene.background === "black" ? C.onBlack : C.ink, opacity: prog(lt, 0, 3) }}>{el.label}</div>
      <MaskRise text={fmtMoney(value, spec.counter?.prefix ?? "$")} lt={99} size={92} color={interpolateColors(lt, [0, 3], [C.redDark, C.red])} style={{ marginLeft: 40, opacity: prog(lt, 0, 2) }} />
    </div>
  );
};
