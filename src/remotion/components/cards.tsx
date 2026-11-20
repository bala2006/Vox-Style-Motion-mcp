// Box style: torn-paper cards, count-up numbers, a typed terminal and step lists. Ported from the Octopus demo video.
import React from "react";
import { Img } from "remotion";
import { C, FONT, col } from "../theme";
import { TornPaper, assetSrc, ease, kf, popCard, prog, useScene } from "../lib";

type El = Record<string, any>;

const DARK = new Set(["red", "ink", "dark", "black", C.red, C.ink, C.term]);

/** Torn card with optional kicker, title, quote, body, image and rows that appear on their own anchors. */
export const PaperCard: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { t } = useScene();
  const fillName = el.fill ?? "card";
  const dark = DARK.has(fillName);
  const fill = fillName === "dark" ? C.term : col(fillName, C.card);
  const fg = dark ? C.onBlack : C.ink;
  const accent = dark ? (fillName === "red" ? C.onBlack : C.yellow) : C.red;
  const align = el.align ?? "left";
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, transformOrigin: "center", zIndex: 10, ...popCard(lt, el.rotate ?? 0) }}>
      <TornPaper w={el.w} h={el.h} fill={fill} seed={el.seed ?? Math.round(el.x + el.y)} amp={5}>
        <div style={{ position: "absolute", inset: 0, padding: "24px 30px", display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "stretch", justifyContent: align === "center" && !el.items ? "center" : "flex-start", textAlign: align, color: fg }}>
          {el.kicker && <div style={{ fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 19, letterSpacing: "0.14em", color: accent }}>{el.kicker}</div>}
          {el.title && <div style={{ fontFamily: FONT.number, fontSize: el.titleSize ?? 52, lineHeight: 1.05, marginTop: el.kicker ? 8 : 0 }}>{el.title}</div>}
          {el.quote && <div style={{ fontFamily: FONT.headline, fontStyle: "italic", fontSize: el.quoteSize ?? 30, lineHeight: 1.25, marginTop: 12 }}>{el.quote}</div>}
          {el.body && <div style={{ fontFamily: FONT.ui, fontSize: el.bodySize ?? 25, lineHeight: 1.38, marginTop: el.kicker || el.title ? 12 : 0 }}>{el.body}</div>}
          {el.items?.map((it: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 14, opacity: prog(t, it.at, 4), transform: `translateY(${kf(t - it.at, [0, 5], [6, 0], ease.out)}px)` }}>
              {it.prefix && <span style={{ fontFamily: FONT.number, fontSize: 28, color: accent, minWidth: 44 }}>{it.prefix}</span>}
              <span style={{ fontFamily: FONT.ui, fontSize: 25, flex: 1 }}>{it.text}</span>
              {it.value && <span style={{ fontFamily: FONT.number, fontSize: 30, color: col(it.valueColor, fg) }}>{it.value}</span>}
            </div>
          ))}
          {el.src && <Img src={assetSrc(el.src)} style={{ width: "100%", marginTop: 14, borderRadius: 4, display: "block" }} />}
        </div>
      </TornPaper>
    </div>
  );
};

const fmtNum = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Number that counts up with ease-out and an optional typewriter label underneath. */
export const CountUp: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { scene } = useScene();
  const from = el.from ?? 0;
  const v = from + (el.to - from) * prog(lt, 0, el.frames ?? 14, ease.out);
  const size = el.size ?? 130;
  const align = el.align ?? "center";
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const onBlack = scene.background === "black";
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, transform: `translateX(${tx})`, textAlign: align, opacity: prog(lt, 0, 3), zIndex: 12 }}>
      <div style={{ fontFamily: FONT.number, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", color: col(el.color, onBlack ? C.onBlack : C.ink) }}>
        {el.prefix ?? ""}{fmtNum(v, el.decimals ?? 0)}{el.suffix ?? ""}
      </div>
      {el.label && <div style={{ fontFamily: FONT.typewriter, fontWeight: 700, fontSize: Math.max(18, size * 0.17), letterSpacing: "0.14em", color: onBlack ? C.onBlackDim : C.grey, marginTop: 8, whiteSpace: "nowrap" }}>{el.label}</div>}
    </div>
  );
};

/** Dark torn terminal: commands type in with a blinking block cursor, then a verdict pill pops. */
export const Terminal: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { t } = useScene();
  const size = el.size ?? 30;
  const lines = el.lines as { cmd: string; at: number; verdict?: string; ok?: boolean; output?: string }[];
  const rowH = size * 1.9 + (lines.some((l) => l.output) ? size * 1.1 : 0);
  const h = el.h ?? 96 + lines.length * rowH;
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: h, transformOrigin: "center", zIndex: 10, ...popCard(lt, el.rotate ?? 0) }}>
      <TornPaper w={el.w} h={h} fill={C.term} seed={77} amp={5}>
        <div style={{ position: "absolute", inset: 0, padding: "22px 34px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />)}
            {el.title && <div style={{ marginLeft: 12, fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 18, letterSpacing: "0.14em", color: C.termDim }}>{el.title}</div>}
          </div>
          {lines.map((ln, i) => {
            if (t < ln.at) return null;
            const n = Math.min(ln.cmd.length, Math.floor((t - ln.at) * 1.6) + 1);
            const done = n >= ln.cmd.length;
            const doneAt = ln.at + ln.cmd.length / 1.6;
            const good = ln.ok ?? false;
            return (
              <div key={i} style={{ marginBottom: size * 0.8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: FONT.typewriter, fontSize: size, color: C.termText, whiteSpace: "pre" }}>
                  <span><span style={{ color: C.termDim }}>$ </span>{ln.cmd.slice(0, n)}{!done && <span style={{ display: "inline-block", width: size * 0.56, height: size, marginLeft: 4, verticalAlign: -size * 0.15, background: C.termText, opacity: Math.floor(t / 8) % 2 ? 1 : 0 }} />}</span>
                  {done && ln.verdict && <span style={{ fontFamily: FONT.number, fontSize: size, letterSpacing: "0.04em", color: good ? C.ok : C.bad, border: `3px solid ${good ? C.ok : C.bad}`, padding: "0 12px", borderRadius: 4, transform: `scale(${kf(t - doneAt, [0, 2, 4], [1.6, 0.95, 1])})` }}>{ln.verdict}</span>}
                </div>
                {done && ln.output && <div style={{ fontFamily: FONT.typewriter, fontSize: size * 0.72, color: C.termDim, marginTop: 6, opacity: prog(t, doneAt, 4), whiteSpace: "pre" }}>{ln.output}</div>}
              </div>
            );
          })}
        </div>
      </TornPaper>
    </div>
  );
};

/** Numbered torn strips that slide in one by one (tool calls, a pipeline, a recipe). */
export const Steps: React.FC<{ el: El; lt: number }> = ({ el }) => {
  const { t } = useScene();
  const size = el.size ?? 21;
  const w = el.w ?? 500;
  const stripH = Math.round(size * 2.86);
  const numbered = el.numbered ?? true;
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, zIndex: 10 }}>
      {(el.items as { text: string; tool?: string; at: number; highlight?: boolean }[]).map((it, i) => {
        if (t < it.at) return null;
        const lt = t - it.at;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, transform: `translateX(${kf(lt, [0, 7], [-40, 0], ease.out)}px)`, opacity: prog(t, it.at, 5) }}>
            {numbered && <div style={{ width: size * 1.62, height: size * 1.62, borderRadius: 99, flex: "none", background: it.highlight ? C.red : C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.number, fontSize: size * 0.86 }}>{i + 1}</div>}
            <div style={{ position: "relative", width: w, height: stripH }}>
              <TornPaper w={w} h={stripH} fill={it.highlight ? C.yellow : C.white} seed={i * 3 + 1} amp={3}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, fontFamily: FONT.typewriter, fontSize: size, color: C.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
                  {it.tool && <b style={{ color: C.red }}>{it.tool}</b>}<span>{it.text}</span>
                </div>
              </TornPaper>
            </div>
          </div>
        );
      })}
    </div>
  );
};
