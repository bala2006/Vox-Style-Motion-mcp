// Box style: hand-drawn marks and privacy covers for real footage. Coordinates are the parent's pixels
// (inside a screen: the recording's 1920x1080), so they stay locked to the UI as the camera moves.
import React from "react";
import { C, col } from "../theme";
import { ease, kf, prog, rand, useScene } from "../lib";
import { Stroke } from "./objects";

type El = Record<string, any>;

/** Hand-drawn rectangle outline that draws on (yellow by default). */
export const MarkerBox: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const [x, y, w, h] = el.box as number[];
  const j = (i: number) => (rand(i + x) - 0.5) * 6;
  const d = `M${x + j(1)} ${y + j(2)} L${x + w + j(3)} ${y + j(4)} L${x + w + j(5)} ${y + h + j(6)} L${x + j(7)} ${y + h + j(8)} Z`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <Stroke d={d} p={prog(lt, 0, el.frames ?? 10)} color={col(el.color, C.yellow)} width={el.width ?? 5} />
    </svg>
  );
};

/** Translucent highlighter band wiping across a box; multiply blend keeps the text under it readable. */
export const Highlight: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const [x, y, w, h] = el.box as number[];
  const p = prog(lt, 0, el.frames ?? 7);
  return <div style={{ position: "absolute", left: x - 6, top: y - 3, width: (w + 12) * p, height: h + 6, background: col(el.color, C.yellow), opacity: 0.55, mixBlendMode: "multiply", borderRadius: "6px 3px 7px 4px", transform: "rotate(-0.4deg)" }} />;
};

/**
 * Opaque cover for secrets in footage (keys, endpoints, emails). Fully opaque from `at` and stays until `until`.
 * Make the box generous and the window long: anything the camera could reveal must stay covered.
 */
export const Redact: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const { t } = useScene();
  if (el.until !== undefined && t >= el.until) return null;
  const [x, y, w, h] = el.box as number[];
  // Opaque from its first frame (a fade-in would let the secret show through); it only fades when it lifts.
  const o = el.until !== undefined ? 1 - prog(t, el.until - 5, 5) : 1;
  const solid = el.style === "solid";
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 8, background: "#1d1c1b", opacity: o, overflow: "hidden", zIndex: 4 }}>
      {!solid && <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, #2a2927 0 16px, #262523 16px 32px)", filter: "blur(2px)" }} />}
    </div>
  );
};

/** Pointer that glides between points (14 frames, ease-out) and pulses a yellow ring on clicks. */
export const Cursor: React.FC<{ el: El; lt: number }> = ({ el }) => {
  const { t } = useScene();
  const pts = [...(el.path as { at: number; x: number; y: number; click?: boolean }[])].sort((a, b) => a.at - b.at);
  if (!pts.length) return null;
  let x = pts[0].x, y = pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const p = prog(t, pts[i].at - 14, 14, ease.out);
    if (p <= 0) break;
    x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * p;
    y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * p;
  }
  const size = el.size ?? 34;
  return (
    <>
      {pts.filter((p) => p.click && t >= p.at && t < p.at + 15).map((p, i) => {
        const k = t - p.at;
        return <div key={i} style={{ position: "absolute", left: p.x - 27, top: p.y - 27, width: 54, height: 54, borderRadius: 99, border: `3px solid ${C.yellow}`, transform: `scale(${kf(k, [0, 15], [1, 1.8], ease.out)})`, opacity: kf(k, [0, 15], [1, 0]), zIndex: 60 }} />;
      })}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: x - size * 0.12, top: y - size * 0.08, zIndex: 61, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
        <path d="M3 2l7 19 2.6-7.6L20 11z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};
