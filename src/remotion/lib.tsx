import React, { createContext, useContext } from "react";
import { Easing, interpolate, staticFile } from "remotion";
import type { ResolvedScene, ResolvedSpec } from "../spec/compile";

export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  linear: (x: number) => x,
};

/** 0..1 progress of t over [start, start + dur]. */
export function prog(t: number, start: number, dur: number, e: (x: number) => number = ease.out) {
  if (dur <= 0) return t >= start ? 1 : 0;
  return interpolate(t, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
}

/** Piecewise keyframes, clamped. */
export function kf(t: number, times: number[], values: number[], e: (x: number) => number = ease.linear) {
  return interpolate(t, times, values, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
}

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** t = scene frame on the motion cadence, g = global frame on the cadence, f = true scene frame (footage plays smooth). */
export type Ctx = { t: number; g: number; f: number; scene: ResolvedScene; spec: ResolvedSpec };
export const SceneCtx = createContext<Ctx | null>(null);
export const useScene = () => {
  const c = useContext(SceneCtx);
  if (!c) throw new Error("SceneCtx missing");
  return c;
};

/** Deterministic pseudo-random in [0,1). */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Jagged polygon points for a torn-paper rectangle. */
export function tornRect(w: number, h: number, seed = 1, amp = 5, step = 14, sides = { t: true, r: true, b: true, l: true }) {
  const pts: string[] = [];
  const j = (i: number, on: boolean) => (on ? (rand(seed + i) - 0.5) * 2 * amp : 0);
  let i = 0;
  for (let x = 0; x < w; x += step) pts.push(`${x},${j(i++, sides.t)}`);
  for (let y = 0; y < h; y += step) pts.push(`${w + j(i++, sides.r)},${y}`);
  for (let x = w; x > 0; x -= step) pts.push(`${x},${h + j(i++, sides.b)}`);
  for (let y = h; y > 0; y -= step) pts.push(`${j(i++, sides.l)},${y}`);
  return pts.join(" ");
}

export const TornPaper: React.FC<{ w: number; h: number; fill: string; seed?: number; amp?: number; stroke?: string; shadow?: boolean; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w, h, fill, seed = 3, amp = 4, stroke, shadow = true, style, children }) => (
  <div style={{ position: "absolute", width: w, height: h, ...style }}>
    <svg width={w + 20} height={h + 20} viewBox={`-10 -10 ${w + 20} ${h + 20}`} style={{ position: "absolute", left: -10, top: -10, overflow: "visible", filter: shadow ? "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" : undefined }}>
      <polygon points={tornRect(w, h, seed, amp)} fill={fill} stroke={stroke} strokeWidth={stroke ? 2.5 : 0} strokeLinejoin="round" />
    </svg>
    <div style={{ position: "absolute", inset: 0 }}>{children}</div>
  </div>
);

/** Card pop used by the box style: ghost frame, rotated rise with 4% overshoot, settles in 10 frames. */
export function popCard(lt: number, rotTo = 0): React.CSSProperties {
  const rotFrom = rotTo - 9;
  const scale = kf(lt, [0, 2, 5, 7, 10], [0.7, 0.88, 1.04, 0.99, 1.0], ease.out);
  const rot = kf(lt, [0, 6, 10], [rotFrom, rotTo + (rotTo - rotFrom) * 0.06, rotTo], ease.out);
  return { opacity: kf(lt, [0, 2], [0.3, 1]), transform: `scale(${scale}) rotate(${rot}deg)` };
}

export type CamKey = { at: number; x: number; y: number; zoom: number };

/** Ease-in-out camera between keyframes in source pixels; zoom interpolates in log space so it feels even. */
export function camAt(t: number, keys: CamKey[]) {
  if (!keys.length) return { x: 960, y: 540, zoom: 1 };
  const ks = [...keys].sort((a, b) => a.at - b.at);
  if (t <= ks[0].at) return ks[0];
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t < b.at) {
      const p = ease.inOut(Math.min(1, Math.max(0, (t - a.at) / Math.max(1, b.at - a.at))));
      const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * p);
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, zoom };
    }
  }
  return ks[ks.length - 1];
}

/** Media time (s) at scene frame t from [{at, t}] pairs. Before the first pair it holds; after the last it plays at `rate` x real time. */
export function remapTime(t: number, pairs: { at: number; t: number }[], fps: number, rate = 1) {
  if (!pairs.length) return t / fps;
  const ps = [...pairs].sort((a, b) => a.at - b.at);
  if (t <= ps[0].at) return ps[0].t;
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i], b = ps[i + 1];
    if (t < b.at) return a.t + ((t - a.at) / Math.max(1, b.at - a.at)) * (b.t - a.t);
  }
  const l = ps[ps.length - 1];
  return l.t + ((t - l.at) / fps) * rate;
}

export const assetSrc = (src: string) => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src));

export const fmtMoney = (v: number, prefix = "$") => prefix + Math.floor(v).toLocaleString("en-US");
