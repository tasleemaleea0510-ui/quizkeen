// One-off: rasterise the Keen SVG sheets to PNGs the cropper can read.
// Run with `node scripts/keen-source/rasterize.mjs`, then `node scripts/crop-keens.mjs`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const dir = "scripts/keen-source";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(join(dir, file), "utf8");
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1024 },
    background: "rgba(0,0,0,0)",
  })
    .render()
    .asPng();
  const out = join(dir, file.replace(/\.svg$/, ".png"));
  writeFileSync(out, png);
  console.log(`${file} -> ${file.replace(/\.svg$/, ".png")} (${Math.round(png.length / 1024)} kB)`);
}
