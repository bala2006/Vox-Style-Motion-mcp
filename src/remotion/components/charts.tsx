import React from "react";
import { interpolateColors } from "remotion";
import { Icon } from "../assets";
import { C, FONT, col } from "../theme";
import { TornPaper, ease, kf, lerp, prog, useScene } from "../lib";
import { BadgeView, StampView, Tag, Visual } from "./objects";

type El = Record<string, any>;
type Dom = [number, number];

const TW: React.CSSProperties = { fontFamily: FONT.typewriter, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" };

export const LineChart: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const lt = t - el.at;
  const box = el.box ?? { x: 250, y: 245, w: 1490, h: 648 };
  const data: [number, number][] = el.data;
  const draws: { at: number; toX: number; frames?: number }[] = [...el.draws].sort((a, b) => a.at - b.at);
  const zooms: { at: number; xDomain: Dom; yDomain: Dom; xTicks?: number[]; frames?: number }[] = [...(el.zooms ?? [])].sort((a, b) => a.at - b.at);

  let xd: Dom = el.xDomain, yd: Dom = el.yDomain;
  for (const z of zooms) {
    const p = prog(t, z.at, z.frames ?? 16, ease.inOut);
    xd = [lerp(xd[0], z.xDomain[0], p), lerp(xd[1], z.xDomain[1], p)];
    yd = [lerp(yd[0], z.yDomain[0], p), lerp(yd[1], z.yDomain[1], p)];
  }
  const X = (v: number) => box.x + ((v - xd[0]) / (xd[1] - xd[0])) * box.w;
  const Y = (v: number) => box.y + box.h - ((v - yd[0]) / (yd[1] - yd[0])) * box.h;
  const yAt = (x: number) => {
    if (x <= data[0][0]) return data[0][1];
    for (let i = 1; i < data.length; i++) if (x <= data[i][0]) {
      const [x0, y0] = data[i - 1], [x1, y1] = data[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
    return data[data.length - 1][1];
  };
  const tipAt = (tt: number) => {
    let x = data[0][0];
    for (const d of draws) { if (tt < d.at) break; x = lerp(x, d.toX, prog(tt, d.at, d.frames ?? 48, ease.inOut)); }
    return x;
  };
  const tipX = tipAt(t);
  const drawing = draws.length > 0 && t >= draws[0].at;
  const pts = data.filter((p) => p[0] < tipX).map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`);
  pts.push(`${X(tipX).toFixed(1)},${Y(yAt(tipX)).toFixed(1)}`);
  const lastDraw = draws[draws.length - 1];
  const done = lastDraw ? t > lastDraw.at + (lastDraw.frames ?? 48) + 6 : false;
  const fadeAtZoomAfter = (frame: number) => {
    const z = zooms.find((zz) => zz.at > frame);
    return z ? 1 - prog(t, z.at, 5) : 1;
  };
  const eventFade = (x: number) => {
    const z = zooms.find((zz) => tipAt(zz.at) >= x);
    return z ? 1 - prog(t, z.at, 5) : 1;
  };

  // tick sets: initial then one per zoom
  const tickSets: { ticks: number[]; op: number }[] = [];
  const sets = [{ ticks: el.xTicks ?? [], start: el.at + 4 }, ...zooms.map((z) => ({ ticks: z.xTicks ?? [], start: z.at + (z.frames ?? 16) - 4 }))];
  sets.forEach((s, k) => {
    const next = zooms[k];
    const op = prog(t, s.start, 8) * (next ? 1 - prog(t, next.at, 5) : 1);
    if (op > 0) tickSets.push({ ticks: s.ticks, op });
  });
  const firstZoomMid = zooms[0] ? zooms[0].at + (zooms[0].frames ?? 16) / 2 : Infinity;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><clipPath id="lcClip"><rect x={box.x} y={0} width={box.w + 40} height={box.y + box.h + 2} /></clipPath></defs>
        <line x1={box.x} y1={box.y} x2={box.x} y2={box.y + box.h * prog(lt, 0, 4)} stroke={C.ink} strokeWidth={3} />
        <line x1={box.x} y1={box.y + box.h} x2={box.x + box.w * prog(lt, 3, 4)} y2={box.y + box.h} stroke={C.ink} strokeWidth={3} />
        {(el.rules ?? []).map((r: any, i: number) => {
          const op = prog(t, r.at ?? el.at, 3);
          if (op <= 0) return null;
          const c = col(r.color, C.ink);
          return <line key={i} x1={box.x} x2={box.x + box.w} y1={Y(r.y)} y2={Y(r.y)} stroke={r.color ? c : "#9B948B"} strokeWidth={2} strokeDasharray="7 7" opacity={op} />;
        })}
        {(el.events ?? []).map((ev: any, i: number) => {
          if (tipX < ev.x) return null;
          const op = eventFade(ev.x);
          const cx = X(ev.x), cy = Y(yAt(ev.x));
          return <line key={i} x1={cx} x2={cx} y1={cy} y2={cy - 90} stroke="#8F887F" strokeWidth={2} opacity={op} />;
        })}
        {drawing && <polyline clipPath="url(#lcClip)" points={pts.join(" ")} fill="none" stroke={C.red} strokeWidth={6.5} strokeLinejoin="round" strokeLinecap="round" />}
        {draws.slice(1).map((d, i) => t >= d.at - 2 && (() => {
          const sx = draws[i].toX;
          return <circle key={i} cx={X(sx)} cy={Y(yAt(sx))} r={8} fill={C.paper} stroke={C.ink} strokeWidth={3} />;
        })())}
        {drawing && <circle cx={X(tipX)} cy={Y(yAt(tipX))} r={9} fill={C.red} />}
      </svg>
      {tickSets.map((s, k) => s.ticks.map((v) => {
        const x = X(v);
        if (x < box.x - 20 || x > box.x + box.w + 20) return null;
        return <div key={`${k}-${v}`} style={{ ...TW, position: "absolute", left: x, top: box.y + box.h + 14, transform: "translateX(-50%)", fontSize: 17, color: C.greyText, opacity: s.op }}>{v}</div>;
      }))}
      {(el.rules ?? []).map((r: any, i: number) => {
        const op = prog(t, r.at ?? el.at, 3);
        if (op <= 0) return null;
        const side = r.sideAfterZoom && t > firstZoomMid ? r.sideAfterZoom : r.side ?? "left";
        return <div key={i} style={{ position: "absolute", top: Y(r.y) - 44, left: side === "left" ? box.x + 6 : undefined, right: side === "right" ? 1920 - (box.x + box.w) + 6 : undefined, fontFamily: FONT.number, fontSize: 34, color: interpolateColors(op, [0, 1], [C.pale, col(r.color, C.ink)]) }}>{r.label}</div>;
      })}
      {(el.events ?? []).map((ev: any, i: number) => {
        if (tipX < ev.x) return null;
        const cx = X(ev.x), cy = Y(yAt(ev.x));
        return <div key={i} style={{ ...TW, position: "absolute", left: cx, top: cy - 116, transform: "translateX(-50%)", fontSize: 18, color: "#3A3530", opacity: eventFade(ev.x) }}>{ev.label}</div>;
      })}
      {(el.brackets ?? []).map((b: any, i: number) => {
        const op = prog(t, b.at, 4) * fadeAtZoomAfter(b.at);
        if (op <= 0) return null;
        const x1 = X(b.x1), x2 = X(b.x2), y = box.y + box.h + 64;
        const c = col(b.color, C.ink);
        const w = (x2 - x1) * prog(t, b.at, 6);
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
            <div style={{ position: "absolute", left: x1, top: y, width: w, height: 14, borderLeft: `3px solid ${c}`, borderRight: `3px solid ${c}`, borderBottom: `3px solid ${c}`, boxSizing: "border-box" }} />
            <div style={{ position: "absolute", left: x1 - 4, top: y + 18, fontFamily: FONT.number, fontSize: 24, color: c }}>{b.left ?? ""}</div>
            <div style={{ position: "absolute", left: x2 - 4, top: y + 18, transform: "translateX(-100%)", fontFamily: FONT.number, fontSize: 24, color: c, opacity: prog(t, b.at + 4, 3) }}>{b.right ?? ""}</div>
            <div style={{ ...TW, position: "absolute", left: (x1 + x2) / 2, top: y - 2, transform: "translateX(-50%)", background: "#fff", padding: "4px 14px", fontSize: 17, color: C.ink, boxShadow: "0 2px 5px rgba(0,0,0,0.2)", opacity: prog(t, b.at + 6, 3) }}>
              <span style={{ color: C.red }}>● </span>{b.label}
            </div>
          </div>
        );
      })}
      {drawing && (
        <div style={{ position: "absolute", left: X(tipX), top: Y(yAt(tipX)) - 58, transform: "translateX(-50%)", background: done ? "#8A847D" : C.ink, color: "#fff", fontFamily: FONT.number, fontSize: 26, padding: "2px 10px", borderRadius: 6 }}>
          {(el.chipDecimals ?? 0) > 0 ? tipX.toFixed(el.chipDecimals) : Math.floor(tipX)}
        </div>
      )}
    </div>
  );
};

export const Card: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const lt = t - el.at;
  const w = el.w ?? 830;
  const rows: any[] = el.rows;
  const h = 120 + rows.length * 50 + 36;
  const baseX = el.x ?? 545, baseY = el.y ?? 330;
  const slide = kf(lt, [0, 9], [760, 0], ease.out);
  const rot = kf(lt, [0, 9], [-3, -1], ease.out);
  const mx = el.moveAt !== undefined ? lerp(0, (el.moveToX ?? 135) - baseX, prog(t, el.moveAt, 11, ease.out)) : 0;
  const hi = el.highlightRow;
  return (
    <div style={{ position: "absolute", left: baseX + mx, top: baseY + slide, transform: `rotate(${rot}deg)` }}>
      <TornPaper w={w} h={h} fill={C.card} seed={21} amp={5}>
        <div style={{ position: "absolute", left: 46, top: 44, right: 46 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${C.ink}`, paddingBottom: 12 }}>
            <span style={{ ...TW, fontSize: 30, color: C.ink }}>{el.title}</span>
            {el.caption && <span style={{ ...TW, fontSize: 15, color: C.greyText }}>{el.caption}</span>}
          </div>
          {rows.map((r, i) => {
            const isHi = hi && hi.index === i;
            const hp = isHi ? prog(t, hi.at, 3) : 0;
            const vp = r.value ? prog(t, r.valueAt ?? el.at + 12, 24, ease.linear) : 0;
            return (
              <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", height: 50, marginTop: i === 0 ? 14 : 0 }}>
                {isHi && <div style={{ position: "absolute", left: -18, right: -18, top: 4, bottom: 4, background: C.yellow, clipPath: `inset(0 ${(1 - hp) * 100}% 0 0)`, borderRadius: "4px 9px 5px 8px" }} />}
                <span style={{ ...TW, position: "relative", fontSize: 23, color: col(r.color, C.ink) }}>{r.label}</span>
                <span style={{ position: "relative", flex: 1, margin: "0 16px", borderBottom: `2px dotted ${C.greyText}`, height: 0, top: 6 }} />
                {r.value && vp > 0 ? (
                  <span style={{ position: "relative", fontFamily: FONT.number, fontSize: 30, color: C.ink, clipPath: `inset(0 ${(1 - vp) * 100}% 0 0)` }}>{r.value}</span>
                ) : (
                  <span style={{ position: "relative", width: 80, height: 8, background: "#C9C2B7", borderRadius: 4 }} />
                )}
              </div>
            );
          })}
        </div>
      </TornPaper>
    </div>
  );
};

/** Vertical torn-paper bars that rise out of the baseline. */
export const BarChart: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const bars: any[] = el.bars;
  const x = el.x ?? 1040, w = el.w ?? 735, base = el.baselineY ?? 875, maxH = el.maxHeight ?? 440;
  const max = Math.max(...bars.map((b) => b.value));
  const slot = w / bars.length, bw = Math.min(220, slot * 0.62);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: x, top: base, width: w * prog(t, el.at, 6), height: 3, background: C.ink }} />
      {bars.map((b, i) => {
        const lt = t - b.at;
        if (lt < 0) return null;
        const H = (b.value / max) * maxH;
        const p = kf(lt, [0, 3, 6, 8], [0, 0.72, 1.015, 1], ease.out);
        const cx = x + (i + 0.5) * slot;
        const c = col(b.color, i === bars.length - 1 ? C.red : C.ink);
        const hasArt = b.asset || b.src;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - bw / 2 - 12, top: base - H - 30, width: bw + 24, height: H + 30, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 12, top: 30 + (1 - p) * (H + 10) }}>
                <TornPaper w={bw} h={H + 10} fill={c} seed={40 + i} amp={6} shadow={false} />
              </div>
            </div>
            {hasArt && (
              <div style={{ position: "absolute", left: cx - bw * 0.42, top: base - H * p - bw * 0.62, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}>
                <Visual asset={b.asset} src={b.src} w={bw * 0.84} h={bw * 0.68} />
              </div>
            )}
            <div style={{ ...TW, position: "absolute", left: cx, top: base + 18, transform: "translateX(-50%)", fontSize: 18, color: c, opacity: prog(lt, 2, 3) }}>{b.label}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const HBarChart: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const bars: any[] = el.bars;
  const x = el.x ?? 526, y = el.y ?? 380, pitch = 140, bh = 80, maxW = el.maxWidth ?? 1240;
  const max = Math.max(...bars.map((b) => b.value));
  const order = bars.map((_, i) => i).sort((a, b) => bars[b].value - bars[a].value);
  const finalSlot = bars.map((_, i) => order.indexOf(i));
  const rp = el.reorderAt !== undefined ? prog(t, el.reorderAt, 12, ease.inOut) : 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {bars.map((b, i) => {
        const lt = t - b.at;
        if (lt < 0) return null;
        const W = (b.value / max) * maxW;
        const p = prog(lt, 0, 9, ease.out);
        const slotY = lerp(i, finalSlot[i], rp);
        const by = y + slotY * pitch;
        const lifting = finalSlot[i] < i;
        const lift = lifting ? 1 + 0.04 * Math.sin(Math.PI * rp) : 1;
        const isRed = b.color === "red" || (b.color === undefined && i === bars.length - 1);
        const c = col(b.color, isRed ? C.red : C.ink);
        const labOp = prog(lt, 3, 3);
        const lh = el.labelHighlight && el.labelHighlight.bar === i ? prog(t, el.labelHighlight.at, 8) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: by, zIndex: lifting ? 5 : 1, transform: `scale(${lift})`, transformOrigin: "left center" }}>
            <div style={{ position: "absolute", left: -10, top: -10, width: W + 30, height: bh + 20, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 10 - (1 - p) * (W + 10), top: 10 }}>
                <TornPaper w={W} h={bh} fill={c} seed={60 + i} amp={5} shadow={false} />
              </div>
            </div>
            <div style={{ position: "absolute", left: 18, top: (bh - 34) / 2, display: "flex", alignItems: "center", gap: 14, opacity: labOp }}>
              <Icon kind={b.icon ?? "none"} size={40} />
              <span style={{ ...TW, position: "relative", fontSize: 23, color: lh > 0 ? C.ink : "#fff", padding: "2px 6px" }}>
                {lh > 0 && <span style={{ position: "absolute", inset: 0, background: C.yellow, clipPath: `inset(0 ${(1 - lh) * 100}% 0 0)`, zIndex: -1 }} />}
                <span style={{ position: "relative" }}>{b.label}</span>
              </span>
            </div>
            {el.tag && el.tag.bar === i && t >= el.tag.at && <Tag el={{ x: W - 230, y: -34, color: "yellow", size: 30, rotate: -6 }} lt={t - el.tag.at} text={el.tag.text} />}
            {el.badge && el.badge.bar === i && t >= el.badge.at && (
              <div style={{ position: "absolute", left: -92, top: (bh - 70) / 2 }}><BadgeView text={el.badge.text} lt={t - el.badge.at} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const YearFlip: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const lt = t - el.at;
  const frames = el.frames ?? 20;
  const yearAt = (l: number) => Math.round(lerp(el.from, el.to, prog(l, 0, frames, ease.out)));
  const year = yearAt(lt), prev = yearAt(lt - 1);
  const flipping = lt > 0 && year !== prev && lt < frames + 2;
  const dp = el.dockAt !== undefined ? prog(t, el.dockAt, 10, ease.inOut) : 0;
  const cx = lerp(960, 224, dp), cy = lerp(592, 135, dp), sc = lerp(1, 0.35, dp);
  const cw = 475, ch = 245;
  return (
    <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%, -50%) scale(${sc})`, width: cw, height: ch, opacity: lt < 1 ? 0.5 : 1 }}>
      <div style={{ ...TW, position: "absolute", top: -54, width: "100%", textAlign: "center", fontSize: 26, color: C.ink, opacity: 1 - dp }}>{el.label ?? "BY"}</div>
      <TornPaper w={cw + (flipping ? 30 : 0)} h={ch} fill={C.ink} seed={77} amp={6} style={{ left: flipping ? -15 : 0 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.number, fontSize: 210, color: "#fff", lineHeight: 1 }}>{year}</div>
        {flipping && <div style={{ position: "absolute", left: -6, right: -6, top: ch / 2 - 3, height: 6, background: C.ink, boxShadow: "0 0 0 2px #fff" }} />}
      </TornPaper>
      {el.stamp && t >= el.stamp.at && (
        <div style={{ position: "absolute", left: cw - 230, top: ch - 40 }}><StampView text={el.stamp.text} lt={t - el.stamp.at} /></div>
      )}
    </div>
  );
};
