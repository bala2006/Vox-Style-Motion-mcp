import React from "react";
import { Composition, registerRoot } from "remotion";
import { compileSpec, type ResolvedSpec } from "../spec/compile";
import { VoxVideo } from "./Video";

const fallback = compileSpec({
  title: "Studio placeholder",
  counter: { label: "BORROWED SINCE YOU HIT PLAY", ratePerSecond: 77105.04 },
  scenes: [{
    id: "hello",
    narration: "Before this video ends, America will borrow over two million dollars.",
    elements: [
      { type: "typewriter", text: "BEFORE THIS VIDEO ENDS," },
      { type: "headline", text: "America will ==borrow==", y: 140 },
      { type: "progressBar" },
    ],
  }],
});
const defaultResolved = (fallback.ok ? fallback.resolved : null) as ResolvedSpec;

const Root: React.FC = () => (
  <Composition
    id="VoxVideo"
    component={VoxVideo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={defaultResolved.durationInFrames}
    defaultProps={{ resolved: defaultResolved }}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.resolved.durationInFrames,
      fps: props.resolved.fps,
      width: props.resolved.width,
      height: props.resolved.height,
    })}
  />
);

registerRoot(Root);
