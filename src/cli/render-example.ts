// Usage:
//   npx tsx src/cli/render-example.ts validate examples/reference-recreation.json
//   npx tsx src/cli/render-example.ts still examples/reference-recreation.json 120 [out.png]
//   npx tsx src/cli/render-example.ts video examples/reference-recreation.json [out.mp4] [from] [to]
import { compileSpec, describeTimeline } from "../spec/compile";
import { loadSpec, renderStillFrame, renderVideoFile } from "../node/render";

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
} else if (cmd === "video") {
  console.log(await renderVideoFile({ spec_path: file, out_path: a, from_frame: b ? Number(b) : undefined, to_frame: c ? Number(c) : undefined }));
}
