import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const logoPath = resolve("static/img/logo.svg");
const outDir = resolve("static");

const svg = readFileSync(logoPath);

// Generate favicon PNGs at various sizes
const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-192x192.png", size: 192 },
  { name: "favicon-512x512.png", size: 512 },
];

for (const { name, size } of sizes) {
  const outPath = resolve(outDir, name);
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log(`  ✔ ${name} (${size}×${size})`);
}

// Generate favicon.ico (multi-size: 16, 32, 48)
const ico48 = await sharp(svg, { density: 300 }).resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp(ico48).png().toFile(resolve(outDir, "favicon.ico"));
console.log("  ✔ favicon.ico (48×48)");

// Copy logo as favicon.svg
writeFileSync(resolve(outDir, "favicon.svg"), svg);
console.log("  ✔ favicon.svg (logo SVG)");

// Generate site.webmanifest
const manifest = {
  name: "Abhiraj Bibhar",
  short_name: "AB",
  icons: [
    { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
  ],
  theme_color: "#141021",
  background_color: "#141021",
  display: "standalone",
};
writeFileSync(resolve(outDir, "site.webmanifest"), JSON.stringify(manifest, null, 2));
console.log("  ✔ site.webmanifest");

console.log("\n✨ All favicons generated from your monogram logo");
