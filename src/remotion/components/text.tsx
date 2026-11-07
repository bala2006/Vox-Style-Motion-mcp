import React from "react";
import { interpolateColors } from "remotion";
import { C, FONT, col } from "../theme";
import { prog, rand, useScene } from "../lib";

type El = Record<string, any>;

export const Typewriter: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { scene } = useScene();
  const text: string = el.text;
  const n = Math.min(text.length, Math.floor(lt * 0.85) + 1);
  const size = el.size ?? 34;
  return (
    <div style={{
      position: "absolute", top: el.y ?? 40, left: el.x ?? 0, width: el.x === undefined ? "100%" : undefined,
      textAlign: el.x === undefined ? "center" : "left", fontFamily: FONT.typewriter, fontWeight: 700, fontSize: size,
      letterSpacing: "0.12em", color: col(el.color, scene.background === "black" ? C.onBlack : "#3A3530"), whiteSpace: "pre",
    }}>
      <span>{text.slice(0, n)}</span><span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </div>
  );
};

/** Rough marker band behind a word, wiping left to right. */
const Marker: React.FC<{ p: number; seed: number; color?: string }> = ({ p, seed, color = C.yellow }) => (
  <span style={{
    position: "absolute", left: -6, right: -6, top: "18%", bottom: "4%", background: color, zIndex: -1,
    clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
    borderRadius: `${3 + rand(seed) * 6}px ${2 + rand(seed + 1) * 8}px ${4 + rand(seed + 2) * 6}px ${2 + rand(seed + 3) * 5}px`,
    transform: `rotate(${(rand(seed + 4) - 0.5) * 1.2}deg)`,
  }} />
);

export const Headline: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const { scene } = useScene();
  const sub = el.variant === "subline";
  const words: { word: string; bold: boolean; hl: boolean }[] = el._words ?? [];
  const frames: number[] = el._wordFrames ?? [];
  const onBlack = scene.background === "black";
  const final = col(el.color, sub ? (onBlack ? C.onBlackDim : C.greyText) : onBlack ? C.onBlack : C.ink);
  const pale = onBlack ? "#55514D" : C.pale;
  const size = el.size ?? (sub ? 36 : 72);
  const align = el.align ?? "center";
  const x = el.x ?? (align === "center" ? 960 : 153);
  return (
    <div style={{
      position: "absolute", top: el.y ?? (sub ? 150 : 62), left: align === "center" ? x - 900 : x, width: align === "center" ? 1800 : 1700,
      textAlign: align, fontFamily: FONT.headline, fontStyle: "italic", fontSize: size, lineHeight: 1.15, whiteSpace: "nowrap",
    }}>
      {words.map((w, i) => {
        const wf = frames[i] ?? 0;
        const visible = t >= wf;
        const c = interpolateColors(t, [wf, wf + 3], [pale, final]);
        const hlNext = w.hl && words[i + 1]?.hl;
        return (
          <React.Fragment key={i}>
            <span style={{ position: "relative", display: "inline-block", opacity: visible ? 1 : 0, color: w.hl ? (onBlack ? C.ink : C.ink) : c, fontWeight: w.bold ? 900 : 400, isolation: "isolate" }}>
              {w.hl && <Marker p={prog(t, wf, 4)} seed={i * 7 + 3} />}
              {w.hl ? <span style={{ color: interpolateColors(t, [wf, wf + 3], [pale, C.ink]) }}>{w.word}</span> : w.word}
              {hlNext && <span style={{ position: "absolute", right: -16, width: 22, top: "18%", bottom: "4%", background: C.yellow, zIndex: -1, clipPath: `inset(0 ${(1 - prog(t, frames[i + 1] ?? wf, 2)) * 100}% 0 0)` }} />}
            </span>
            {i < words.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Big condensed text where each glyph rises out of a baseline mask. */
export const MaskRise: React.FC<{ text: string; lt: number; size: number; color: string; stagger?: number; frames?: number; style?: React.CSSProperties }> = ({ text, lt, size, color, stagger = 0.9, frames = 4, style }) => (
  <div style={{ fontFamily: FONT.number, fontSize: size, lineHeight: 1.0, color, whiteSpace: "pre", letterSpacing: "-0.005em", ...style }}>
    {Array.from(text).map((ch, i) => {
      const p = prog(lt, i * stagger, frames);
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingTop: size * 0.04 }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{ch === " " ? "\u00A0" : ch}</span>
        </span>
      );
    })}
  </div>
);

export const BigNumber: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { scene } = useScene();
  const size = el.size ?? 215;
  const align = el.align ?? "center";
  return (
    <div style={{ position: "absolute", top: el.y ?? 110, left: align === "center" ? 0 : el.x ?? 135, width: align === "center" ? "100%" : undefined, display: "flex", justifyContent: align === "center" ? "center" : "flex-start", transform: align === "center" && el.x !== undefined ? `translateX(${el.x - 960}px)` : undefined }}>
      <MaskRise text={el.text} lt={lt} size={size} color={col(el.color, scene.background === "black" ? C.onBlack : C.ink)} />
    </div>
  );
};

export const Label: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { scene } = useScene();
  const font = el.font ?? "typewriter";
  const size = el.size ?? 18;
  const align = el.align ?? "left";
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div style={{
      position: "absolute", left: el.x, top: el.y, transform: `translateX(${tx})`, opacity: prog(lt, 0, 3),
      fontFamily: FONT[font as keyof typeof FONT], fontStyle: font === "headline" ? "italic" : "normal", fontWeight: font === "typewriter" ? 700 : 400,
      letterSpacing: font === "typewriter" ? "0.14em" : undefined, fontSize: size, whiteSpace: "pre",
      color: col(el.color, scene.background === "black" ? C.onBlack : "#3A3530"),
    }}>{el.text}</div>
  );
};

export const SourceLine: React.FC<{ text: string; lt: number; dark: boolean }> = ({ text, lt, dark }) => (
  <div style={{ position: "absolute", left: 122, top: 996, fontFamily: FONT.typewriter, fontSize: 14, color: dark ? "#6B6762" : C.greyText, opacity: prog(lt, 0, 3) * 0.95 }}>{text}</div>
);
