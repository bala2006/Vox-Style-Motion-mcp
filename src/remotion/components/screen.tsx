// Box style: real software shown inside a taped, paper-matted app window, with a camera that pushes in on
// what the narrator is talking about. Ported from the Octopus demo video.
import React from "react";
import { AbsoluteFill, Freeze, Html5Video, Img, OffthreadVideo, Sequence } from "remotion";
import { C, FONT } from "../theme";
import { assetSrc, camAt, ease, kf, popCard, prog, remapTime, tornRect, useScene } from "../lib";

type El = Record<string, any>;
type Media = Record<string, any>;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;
export const mediaKind = (m: Media): "video" | "image" => m.kind ?? (IMAGE_EXT.test(m.src) ? "image" : "video");

/** Recording time (s) a media layer shows at scene frame f. */
export function mediaTime(m: Media, f: number, fps: number) {
  let s = m.timeMap?.length ? remapTime(f, m.timeMap, fps, m.rate ?? 1) : (m.start ?? 0) + (Math.max(0, f - m.at) / fps) * (m.rate ?? 1);
  if (m.maxSec !== undefined) s = Math.min(s, m.maxSec);
  return Math.max(0, s);
}

/** One media layer drawn at w x h (a screen uses the recording's own 1920x1080). */
export const MediaLayer: React.FC<{ m: Media; w: number; h: number; fit?: "cover" | "width"; base?: boolean }> = ({ m, w, h, fit = "cover", base }) => {
  const { t, f, scene, spec } = useScene();
  if (f < m.at) return null;
  if (m.endAt !== undefined && f >= m.endAt) return null;
  const fade = m.fade ?? 6;
  // The base layer arrives with its box, so it does not fade in; later layers cross-fade over it.
  const o = Math.min(base ? 1 : prog(f, m.at, fade), m.endAt !== undefined ? 1 - prog(f, m.endAt - fade, fade) : 1);
  const style: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover", objectPosition: "top center" };
  let body: React.ReactNode;
  if (mediaKind(m) === "image") {
    const scrollY = m.scroll?.length ? kf(t, m.scroll.map((k: any) => k.at), m.scroll.map((k: any) => k.y), ease.inOut) : 0;
    body = fit === "width" || m.scroll?.length
      ? <Img src={assetSrc(m.src)} style={{ position: "absolute", left: 0, top: -scrollY, width: w }} />
      : <Img src={assetSrc(m.src)} style={style} />;
  } else {
    // OffthreadVideo needs Remotion's compositor (glibc 2.35+ on Linux); the renderer falls back to the
    // browser's own decoder (Html5Video) where it cannot run. Both are frame-accurate inside <Freeze>.
    const V: React.ComponentType<any> = spec.videoEngine === "html5" ? Html5Video : OffthreadVideo;
    if ((m.volume ?? 0) > 0 && !m.timeMap?.length) {
      // Plain playback with sound: let Remotion play the file in real time from the layer's start.
      body = (
        <Sequence from={scene.from + m.at} layout="none">
          <V src={assetSrc(m.src)} trimBefore={Math.round((m.start ?? 0) * spec.fps)} playbackRate={m.rate ?? 1} volume={m.volume} style={style} />
        </Sequence>
      );
    } else {
      // Frame-accurate remap: freeze the video on exactly the recording frame this moment needs.
      const frame = Math.round(mediaTime(m, f, spec.fps) * spec.fps);
      body = <Freeze frame={frame}><V src={assetSrc(m.src)} muted style={style} /></Freeze>;
    }
  }
  return <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>{body}</AbsoluteFill>;
};

/** A strip of masking tape. */
export const TapeStrip: React.FC<{ x: number; y: number; w?: number; rotate?: number }> = ({ x, y, w = 150, rotate = -8 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 40, transform: `rotate(${rotate}deg)`, background: C.tape, boxShadow: "0 2px 4px rgba(0,0,0,0.12)", clipPath: "polygon(2% 8%, 98% 0, 100% 50%, 97% 100%, 3% 92%, 0 50%)", zIndex: 30 }} />
);

export const Tape: React.FC<{ el: El; lt: number }> = ({ el, lt }) => (
  <div style={{ opacity: prog(lt, 0, 3) }}><TapeStrip x={el.x} y={el.y} w={el.w} rotate={el.rotate} /></div>
);

const clockText = (sec: number, offset = 0, prefix = "") => {
  const s = Math.max(0, sec - offset);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${prefix ? prefix + " " : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/** Red "LIVE" chip with a blinking dot, an optional run clock and a yellow playback-speed note. */
const RunBadge: React.FC<{ g: number; text: string; speed?: string; size: number }> = ({ g, text, speed, size }) => (
  <>
    {speed && <div style={{ fontFamily: FONT.typewriter, fontWeight: 700, fontSize: size, letterSpacing: "0.1em", color: C.yellow, whiteSpace: "nowrap" }}>{speed}</div>}
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT.typewriter, fontWeight: 700, fontSize: size, letterSpacing: "0.1em", color: C.onBlack, background: "rgba(210,37,29,0.9)", padding: "3px 10px", borderRadius: 4, whiteSpace: "nowrap" }}>
      <span style={{ width: size * 0.55, height: size * 0.55, borderRadius: 99, background: "#fff", opacity: Math.floor(g / 15) % 2 ? 1 : 0.35 }} />
      {text}
    </div>
  </>
);

/** Screen box. Overlays (children) are laid out in recording pixels and move with the camera. */
export const Screen: React.FC<{ el: El; lt: number; children?: React.ReactNode }> = ({ el, lt, children }) => {
  const { t, f, g, spec } = useScene();
  let bx = el.x ?? 200, by = el.y ?? 112, bw = el.w ?? 1520;
  if (el.moveTo) {
    const p = prog(t, el.moveTo.at, el.moveTo.frames ?? 16, ease.inOut);
    bx += (el.moveTo.x - bx) * p; by += (el.moveTo.y - by) * p; bw += (el.moveTo.w - bw) * p;
  }
  const from = el.enterFrom ?? "bottom";
  const enter = from === "none" ? 1 : prog(lt, 0, 16, ease.out);
  const off = (1 - enter) * 1150;
  const tx = from === "right" ? off : from === "left" ? -off : 0;
  const ty = from === "bottom" ? off : 0;
  const rotate = el.rotate ?? -0.5;
  const rot = rotate + (1 - enter) * (from === "left" ? -5 : from === "none" ? 0 : 5);
  const chrome = (el.chrome ?? "window") === "window";
  const bar = chrome ? Math.round(bw * 0.028) : 0;
  const h = (bw * 9) / 16;
  const s = bw / 1920;
  const cam = camAt(t, el.camera ?? []);
  const z = Math.max(1, cam.zoom);
  const ox = Math.min(0, Math.max(1920 - 1920 * z, 960 - cam.x * z));
  const oy = Math.min(0, Math.max(1080 - 1080 * z, 540 - cam.y * z));
  const mat = 22;
  const matKind = el.mat ?? "card";
  let badgeText = el.badge?.text ?? "LIVE";
  if (el.badge?.clock) {
    const v = (el.media as Media[]).find((m) => mediaKind(m) === "video");
    if (v) badgeText = clockText(mediaTime(v, f, spec.fps), el.badge.clock.offset ?? 0, el.badge.clock.prefix ?? "");
  }
  return (
    <div style={{ position: "absolute", left: bx, top: by, width: bw, height: h + bar, transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`, zIndex: 5 }}>
      {matKind !== "none" && (
        <svg width={bw + mat * 2 + 20} height={h + bar + mat * 2 + 20} style={{ position: "absolute", left: -mat - 10, top: -mat - 10, overflow: "visible", filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.35))" }}>
          <g transform="translate(10 10)"><polygon points={tornRect(bw + mat * 2, h + bar + mat * 2, 21, 5, 16)} fill={matKind === "white" ? C.white : C.card} /></g>
        </svg>
      )}
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: C.app, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.55)" }}>
        {chrome && (
          <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: bar, background: C.appBar, display: "flex", alignItems: "center", paddingLeft: bar * 0.55, gap: bar * 0.28 }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: bar * 0.36, height: bar * 0.36, borderRadius: 99, background: c }} />)}
            {el.url && (
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: bar * 0.62, padding: `0 ${bar * 0.7}px`, borderRadius: 99, background: C.urlPill, color: C.urlText, fontFamily: FONT.ui, fontSize: bar * 0.36, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <span style={{ width: bar * 0.22, height: bar * 0.22, borderRadius: 2, border: `1.5px solid ${C.greyText}` }} />{el.url}
              </div>
            )}
            {el.badge && <div style={{ position: "absolute", right: bar * 0.5, display: "flex", alignItems: "center", gap: 10 }}><RunBadge g={g} text={badgeText} speed={el.badge.speed} size={Math.max(11, bar * 0.36)} /></div>}
          </div>
        )}
        <div style={{ position: "absolute", left: 0, top: bar, width: bw, height: h, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${s}) translate(${ox}px, ${oy}px) scale(${z})` }}>
            {(el.media as Media[]).map((m, i) => <MediaLayer key={i} m={m} w={1920} h={1080} base={i === 0 && m.at <= el.at} />)}
            {children}
          </div>
        </div>
      </div>
      {(el.tapes ?? true) && matKind !== "none" && <><TapeStrip x={-58} y={-26} rotate={-32} /><TapeStrip x={bw - 92} y={-26} rotate={30} /></>}
    </div>
  );
};

/** Phone mockup that slides up and plays or scrolls its own media (a 390 px mobile capture). */
export const Phone: React.FC<{ el: El; lt: number }> = ({ el, lt }) => {
  const w = el.w ?? 440, k = w / 440, h = 920 * k;
  const iw = w - 40 * k, ih = h - 48 * k;
  const rotate = el.rotate ?? 2;
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: w, height: h + 50 }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, borderRadius: 60 * k, background: "#141312", boxShadow: "0 24px 40px rgba(0,0,0,0.4)", transform: `translateY(${kf(lt, [0, 16], [1100, 0], ease.out)}px) rotate(${kf(lt, [0, 16], [rotate + 6, rotate], ease.out)}deg)` }}>
        <div style={{ position: "absolute", left: 20 * k, top: 24 * k, width: iw, height: ih, borderRadius: 42 * k, overflow: "hidden", background: C.card }}>
          <MediaLayer m={el.media} w={iw} h={ih} fit="width" base />
        </div>
        <div style={{ position: "absolute", left: w / 2 - 50 * k, top: 34 * k, width: 100 * k, height: 26 * k, borderRadius: 20 * k, background: "#141312" }} />
      </div>
      {el.label && <div style={{ position: "absolute", top: h + 18, width: "100%", textAlign: "center", fontFamily: FONT.typewriter, fontWeight: 700, fontSize: 20, letterSpacing: "0.14em", color: C.inkSoft, opacity: prog(lt, 18, 5) }}>{el.label}</div>}
    </div>
  );
};

/** White-bordered photo of a screenshot with a handwritten-style caption. */
export const Polaroid: React.FC<{ el: El; lt: number }> = ({ el, lt }) => (
  <div style={{ position: "absolute", left: el.x, top: el.y, transformOrigin: "center", zIndex: 40, ...popCard(lt, el.rotate ?? 4) }}>
    <div style={{ position: "relative", background: "#fff", padding: el.caption ? "14px 14px 52px" : 14, boxShadow: "0 14px 24px rgba(0,0,0,0.35)" }}>
      <Img src={assetSrc(el.src)} style={{ width: el.w, display: "block" }} />
      {el.caption && <div style={{ position: "absolute", bottom: 12, left: 0, width: "100%", textAlign: "center", fontFamily: FONT.headline, fontStyle: "italic", fontSize: 24, color: C.ink }}>{el.caption}</div>}
    </div>
  </div>
);
