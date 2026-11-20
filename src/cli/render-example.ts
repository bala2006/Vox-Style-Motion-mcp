// Usage:
//   npx tsx src/cli/render-example.ts validate examples/reference-recreation.json
//   npx tsx src/cli/render-example.ts still examples/reference-recreation.json 120 [out.png]
//   npx tsx src/cli/render-example.ts video examples/reference-recreation.json [out.mp4] [from] [to]
//   npx tsx src/cli/render-example.ts sweep examples/box-demo/spec.voiced.json settings 15 out/check/settings
//   npx tsx src/cli/render-example.ts capture examples/box-demo/capture.json
import { readFileSync } from "node:fs";
import path from "node:path";
import { compileSpec, describeTimeline } from "../spec/compile";
import { loadSpec, renderStillFrame, renderStillSweep, renderVideoFile } from "../node/render";
import { captureScreen } from "../node/capture";

const [cmd = "validate", file = "examples/reference-recreation.json", a, b, c] = process.argv.slice(2);

if (cmd === "validate") {
  const r = compileSpec(loadSpec({ spec_path: file }).spec);
  console.log(JSON.stringify(r.ok ? describeTimeline(r.resolved) : r.errors, null, 2));
} else if (cmd === "still") {
  console.log(await renderStillFrame({ spec_path: file, frame: Number(a ?? 0), out_path: b }));
} else if (cmd === "stills") {
  // stills <spec> <f1,f2,...> <outDir>
  for (const f of (a ?? "0").split(",").map(Number)) {
    const r = await renderStillFrame({ spec_path: file, frame: f, out_path: `${b ?? "out/check"}/f_${String(f).padStart(4, "0")}.png`, scale: 0.25 });
    console.log(r.output);
  }
} else if (cmd === "sweep") {
  // sweep <spec> <sceneId|all> [step] [outDir]
  console.log(JSON.stringify(await renderStillSweep({ spec_path: file, scene: a && a !== "all" ? a : undefined, step: b ? Number(b) : undefined, out_dir: c }), null, 2));
} else if (cmd === "capture") {
  // capture <capture.json> [out.mp4]   capture.json = { steps, viewport?, tail_ms? }; relative goto paths resolve from its folder
  const job = JSON.parse(readFileSync(file, "utf8"));
  const dir = path.dirname(path.resolve(file));
  for (const s of job.steps) if (s.url && !/^[a-z]+:/i.test(s.url)) s.url = path.resolve(dir, s.url);
  const out = a ? path.resolve(a) : job.out_path ? path.resolve(dir, job.out_path) : undefined;
  console.log(JSON.stringify(await captureScreen({ ...job, out_path: out }), null, 2));
} else if (cmd === "video") {
  console.log(await renderVideoFile({ spec_path: file, out_path: a, from_frame: b ? Number(b) : undefined, to_frame: c ? Number(c) : undefined }));
}
