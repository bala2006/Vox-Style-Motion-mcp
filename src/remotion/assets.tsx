import React from "react";
import { C } from "./theme";

type P = { w: number; h: number; color?: string };
const svg = (vb: string, w: number, h: number, children: React.ReactNode, id: string) => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={id === "moneyStack" ? "none" : "xMidYMid meet"} style={{ overflow: "visible", display: "block" }} data-asset={id}>
    {children}
  </svg>
);

export const Person: React.FC<P> = ({ w, h, color = C.ink }) =>
  svg("0 0 40 48", w, h, <g fill={color}><circle cx="20" cy="12" r="9" /><path d="M3 48 C3 32 10 25 20 25 C30 25 37 32 37 48 Z" /></g>, "person");

export const Bill: React.FC<P & { faded?: boolean }> = ({ w, h, faded }) =>
  svg("0 0 60 30", w, h, (
    <g opacity={faded ? 0.45 : 1} style={{ filter: faded ? "saturate(0.3)" : undefined }}>
      <rect x="1" y="1" width="58" height="28" rx="2" fill={C.green[4]} stroke={C.green[1]} strokeWidth="1.5" />
      <rect x="5" y="5" width="50" height="20" rx="1" fill="none" stroke={C.green[2]} strokeWidth="1" />
      <circle cx="30" cy="15" r="7" fill={C.green[3]} />
      <text x="30" y="19.5" fontSize="12" textAnchor="middle" fill={C.green[0]} fontFamily="Georgia" fontWeight="bold">$</text>
    </g>
  ), "bill");

export const MoneyStack: React.FC<P> = ({ w, h }) =>
  svg("0 0 200 130", w, h, (
    <g>
      <defs>
        <linearGradient id="msTop" x1="0" x2="1"><stop offset="0" stopColor={C.green[3]} /><stop offset="1" stopColor={C.green[4]} /></linearGradient>
        <linearGradient id="msSide" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.green[2]} /><stop offset="1" stopColor={C.green[0]} /></linearGradient>
      </defs>
      <ellipse cx="100" cy="124" rx="92" ry="6" fill="rgba(0,0,0,0.25)" />
      <path d="M10 40 L100 22 L190 40 L190 110 L100 124 L10 110 Z" fill="url(#msSide)" />
      {Array.from({ length: 14 }).map((_, i) => (
        <path key={i} d={`M10 ${44 + i * 4.8} L100 ${58 + i * 4.8} L190 ${44 + i * 4.8}`} stroke={i % 2 ? C.green[1] : C.green[3]} strokeWidth="1.2" fill="none" opacity="0.8" />
      ))}
      <path d="M10 40 L100 22 L190 40 L100 58 Z" fill="url(#msTop)" stroke={C.green[1]} strokeWidth="1.5" />
      <path d="M40 46 L130 28 L150 32 L60 50 Z" fill="#E9E1C8" opacity="0.9" />
      <rect x="85" y="60" width="30" height="62" fill="#E9E1C8" opacity="0.85" transform="skewY(-8) translate(0 14)" />
      <circle cx="100" cy="40" r="9" fill={C.green[2]} />
    </g>
  ), "moneyStack");

export const Capitol: React.FC<P> = ({ w, h }) =>
  svg("0 0 400 260", w, h, (
    <g>
      <defs>
        <linearGradient id="cpDome" x1="0" x2="1"><stop offset="0" stopColor="#8d8a86" /><stop offset="0.45" stopColor="#f2efe9" /><stop offset="1" stopColor="#6f6c68" /></linearGradient>
        <linearGradient id="cpBody" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e7e3dc" /><stop offset="1" stopColor="#a9a59f" /></linearGradient>
        <pattern id="half" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="rgba(0,0,0,0.12)" /></pattern>
      </defs>
      <rect x="200" y="6" width="3" height="22" fill="#555" />
      <path d="M186 50 Q201 14 216 50 Z" fill="url(#cpDome)" />
      <rect x="170" y="50" width="62" height="14" fill="url(#cpBody)" />
      <path d="M140 118 Q201 30 262 118 Z" fill="url(#cpDome)" />
      {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={146 + i * 13.5} y="118" width="5" height="36" fill="#7d7a75" />)}
      <rect x="136" y="114" width="130" height="7" fill="#d9d5ce" />
      <rect x="132" y="152" width="138" height="10" fill="#cfcac3" />
      <rect x="20" y="168" width="360" height="72" fill="url(#cpBody)" />
      <path d="M150 168 L201 140 L252 168 Z" fill="#e8e4dd" stroke="#8b8781" />
      {Array.from({ length: 26 }).map((_, i) => <rect key={i} x={28 + i * 13.6} y="176" width="5" height="56" fill="#86827c" />)}
      <rect x="10" y="236" width="380" height="16" fill="#9d9993" />
      <rect x="0" y="0" width="400" height="260" fill="url(#half)" />
    </g>
  ), "capitol");

export const Hourglass: React.FC<P & { t?: number }> = ({ w, h, t = 0 }) => {
  const sand = Math.min(1, t / 400);
  return svg("0 0 200 340", w, h, (
    <g>
      <defs>
        <linearGradient id="hgWood" x1="0" x2="1"><stop offset="0" stopColor="#2a2622" /><stop offset="0.5" stopColor="#77706a" /><stop offset="1" stopColor="#1d1a17" /></linearGradient>
        <linearGradient id="hgGlass" x1="0" x2="1"><stop offset="0" stopColor="rgba(255,255,255,0.15)" /><stop offset="0.3" stopColor="rgba(255,255,255,0.5)" /><stop offset="1" stopColor="rgba(255,255,255,0.08)" /></linearGradient>
      </defs>
      <rect x="10" y="4" width="180" height="22" rx="6" fill="url(#hgWood)" />
      <rect x="10" y="314" width="180" height="22" rx="6" fill="url(#hgWood)" />
      <rect x="22" y="26" width="10" height="288" fill="url(#hgWood)" />
      <rect x="168" y="26" width="10" height="288" fill="url(#hgWood)" />
      <path d="M48 30 L152 30 Q150 120 106 166 L106 174 Q150 220 152 310 L48 310 Q50 220 94 174 L94 166 Q50 120 48 30 Z" fill="rgba(200,200,200,0.12)" stroke="#bbb" strokeWidth="2" />
      <path d={`M${60 + sand * 30} ${60 + sand * 80} L${140 - sand * 30} ${60 + sand * 80} Q125 130 100 165 Q75 130 ${60 + sand * 30} ${60 + sand * 80} Z`} fill="#d8d2c6" />
      <rect x="99" y="165" width="2" height="125" fill="#d8d2c6" opacity="0.85" />
      <path d={`M54 306 L146 306 Q140 ${280 - sand * 40} 100 ${262 - sand * 40} Q60 ${280 - sand * 40} 54 306 Z`} fill="#d8d2c6" />
      <path d="M58 36 Q60 120 92 160" stroke="url(#hgGlass)" strokeWidth="8" fill="none" />
    </g>
  ), "hourglass");
};

export const Jet: React.FC<P> = ({ w, h }) =>
  svg("0 0 240 90", w, h, (
    <g>
      <defs><linearGradient id="jt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c9c9c9" /><stop offset="1" stopColor="#5d5d5d" /></linearGradient></defs>
      <path d="M8 52 L170 40 Q205 38 232 50 Q205 60 170 60 L8 62 Z" fill="url(#jt)" />
      <path d="M90 50 L150 50 L120 88 L100 88 Z" fill="#6a6a6a" />
      <path d="M100 46 L140 46 L118 10 L104 10 Z" fill="#8a8a8a" />
      <path d="M10 52 L40 52 L22 18 L12 18 Z" fill="#777" />
      <path d="M180 42 Q196 38 210 46 L180 48 Z" fill="#2b3036" />
    </g>
  ), "jet");

export const Coin: React.FC<P> = ({ w, h }) =>
  svg("0 0 100 100", w, h, (
    <g><circle cx="50" cy="50" r="46" fill="#b8a46a" stroke="#7d6c3a" strokeWidth="4" /><circle cx="50" cy="50" r="34" fill="none" stroke="#8f7d47" strokeWidth="2" />
      <text x="50" y="64" fontSize="40" textAnchor="middle" fill="#6e5e2e" fontFamily="Georgia" fontWeight="bold">$</text></g>
  ), "coin");

export const House: React.FC<P> = ({ w, h }) =>
  svg("0 0 120 110", w, h, (
    <g><path d="M10 50 L60 8 L110 50 Z" fill="#6b625b" /><rect x="22" y="48" width="76" height="58" fill="#d9d3c9" stroke="#6b625b" strokeWidth="3" />
      <rect x="50" y="72" width="20" height="34" fill="#6b625b" /><rect x="30" y="60" width="14" height="14" fill="#9aa3a8" /><rect x="76" y="60" width="14" height="14" fill="#9aa3a8" /></g>
  ), "house");

export const ASSETS: Record<string, React.FC<P & { t?: number }>> = {
  capitol: Capitol, hourglass: Hourglass, jet: Jet, moneyStack: MoneyStack, bill: Bill, person: Person, coin: Coin, house: House,
};

export const Icon: React.FC<{ kind: string; size: number; color?: string }> = ({ kind, size, color = "#fff" }) => {
  const s = { stroke: color, strokeWidth: 2.4, fill: "none" } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" {...s} />
      {kind === "person" && <g fill={color}><circle cx="16" cy="12" r="4" /><path d="M9 24 Q16 14 23 24 Z" /></g>}
      {kind === "cross" && <path d="M16 9 V23 M9 16 H23" {...s} strokeWidth={4} />}
      {kind === "shield" && <path d="M16 8 L23 11 Q23 20 16 25 Q9 20 9 11 Z" {...s} />}
      {kind === "percent" && <g><path d="M10 22 L22 10" {...s} /><circle cx="11" cy="11" r="2.2" fill={color} /><circle cx="21" cy="21" r="2.2" fill={color} /></g>}
      {kind === "house" && <path d="M9 16 L16 9 L23 16 V23 H9 Z" {...s} />}
    </svg>
  );
};
