import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve } from "path";

const svgPath = resolve("static/img/og-card.svg");
const pngPath = resolve("static/img/og-card.png");

const svg = readFileSync(svgPath);

await sharp(svg, { density: 150 })
  .resize(1200, 630)
  .png({ quality: 95 })
  .toFile(pngPath);

console.log(`✔ Wrote ${pngPath} (1200×630)`);
