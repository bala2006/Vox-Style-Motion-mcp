import React from "react";
import { interpolateColors } from "remotion";
import { Bill, MoneyStack, Person } from "../assets";
import { C } from "../theme";
import { ease, kf, lerp, prog, rand } from "../lib";
import { circlePath } from "./objects";

type El = Record<string, any>;

export const MoneyStacks: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const per = el.perRow ?? 7;
  const pitch = 211, w = 200, h = 230;
  const base = el.baselineY ?? 910;
  const rows: number[] = el.rows ?? [el.at];
  const x0 = 960 - ((per - 1) / 2) * pitch;
  const shrink = el.shrinkAt !== undefined ? kf(t - el.shrinkAt, [0, 1, 2, 3, 4, 6], [1, 0.97, 0.9, 0.75, 0.45, 0], ease.in) : 1;
  if (shrink <= 0.001) return null;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${shrink})`, transformOrigin: "960px 690px" }}>
      {rows.map((rowAt, r) =>
        Array.from({ length: per }).map((_, j) => {
          const st = rowAt + j * 1.8;
          const lt = t - st;
          if (lt < 0) return null;
          const drop = kf(lt, [1, 4], [-20, 0], ease.out);
          return (
            <div key={`${r}-${j}`} style={{ position: "absolute", left: x0 + j * pitch - w / 2, top: base - h - r * 222 + drop, opacity: lt < 1 ? 0.35 : 1, filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))" }}>
              <MoneyStack w={w} h={h} />
            </div>
          );
        }),
      )}
    </div>
  );
};

export const PersonGrid: React.FC<{ el: El; t: number }> = ({ el, t }) => {
  const cols = el.cols ?? 21, rows = el.rows ?? 7;
  const px = 70, py = 80, pw = 46, ph = 55;
  const c0 = Math.floor(cols / 2), r0 = Math.floor(rows / 2);
  const x0 = 960 - c0 * px, y0 = el.y ?? 452;
  const lt = t - el.at;
  const fx = x0 + c0 * px, fy = y0 + r0 * py;
  const F = el.focusAt, P = el.pullBackAt, H = el.highlightAt, CI = el.circleAt;
  const focusP = F !== undefined ? prog(t, F, 6, ease.inOut) : 0;
  const pullP = P !== undefined ? prog(t, P, 15, ease.out) : 0;
  const splitP = Math.max(0, focusP - (P !== undefined ? prog(t, P, 6, ease.inOut) : 0));
  const cam = 1 + 0.75 * focusP - 0.75 * pullP;
  const grey = Math.max(0, (F !== undefined ? prog(t, F, 3) : 0) - (P !== undefined ? prog(t, P + 3, 3) : 0));
  const centreFade = 1 - focusP + (P !== undefined ? prog(t, P, 6) : 0);
  const maxD = Math.hypot(c0, r0 * (py / px));
  const people: React.ReactNode[] = [];
  const bills: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const isRed = i === c0 && j === r0;
    const d = Math.hypot(i - c0, (j - r0) * (py / px)) / maxD;
    const s = prog(lt, d * 8, 4, ease.out);
    if (s <= 0) continue;
    const side = i < c0 ? -1 : i > c0 ? 1 : 0;
    const x = x0 + i * px + side * splitP * 3.2 * px;
    const y = y0 + j * py;
    const red = isRed && H !== undefined && t >= H;
    const color = red ? C.red : interpolateColors(grey, [0, 1], [C.ink, C.grey]);
    const op = i === c0 && !isRed ? Math.min(1, centreFade) : 1;
    people.push(
      <div key={`p${i}-${j}`} style={{ position: "absolute", left: x - pw / 2, top: y - ph / 2 + 10, transform: `scale(${Math.max(0.12, s)})`, opacity: op }}>
        <Person w={pw} h={ph} color={color} />
      </div>,
    );
    if (el.bills) {
      const bd = 5 + d * 4 + rand(i * 31 + j) * 2;
      const bp = prog(lt, bd, 8, ease.out);
      if (lt >= 2) {
        const sx = 960 + (rand(i + j * 7) - 0.5) * 60, sy = 612 + (rand(i * 3 + j) - 0.5) * 40;
        const bx = lerp(sx, x, bp), by = lerp(sy, y - 34, bp);
        bills.push(
          <div key={`b${i}-${j}`} style={{ position: "absolute", left: bx - 21, top: by - 11, transform: `rotate(${(1 - bp) * (rand(i * j + 3) - 0.5) * 70}deg) scale(${lerp(0.7, 1, bp)})`, opacity: op * (1 - grey * 0.55) }}>
            <Bill w={42} h={21} faded={grey > 0.5 && !isRed} />
          </div>,
        );
      }
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${cam})`, transformOrigin: `${fx}px ${fy}px` }}>
      {people}
      {bills}
      {CI !== undefined && t >= CI && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={circlePath(fx, fy - 4, 40, 52, 9)} pathLength={1} fill="none" stroke={C.red} strokeWidth={4.5 / Math.max(1, cam * 0.8)} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - prog(t, CI, 5)} />
        </svg>
      )}
    </div>
  );
};
