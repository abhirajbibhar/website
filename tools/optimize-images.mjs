import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { resolve, join, extname } from "path";

const staticDir = resolve("static");

function findImages(dir) {
  const images = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      images.push(...findImages(full));
    } else if (/\.(png|jpg|jpeg)$/i.test(entry) && stat.size > 50000) {
      images.push({ path: full, size: stat.size, name: entry });
    }
  }
  return images;
}

const images = findImages(staticDir);
console.log(`Found ${images.length} images larger than 50KB:\n`);

for (const img of images) {
  const ext = extname(img.path).toLowerCase();
  const outPath = img.path; // overwrite in place

  try {
    if (ext === ".png") {
      await sharp(img.path)
        .png({ quality: 80, compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outPath + ".tmp");
      // Replace original
      const { renameSync } = await import("fs");
      renameSync(outPath + ".tmp", outPath);
    } else if (ext === ".jpg" || ext === ".jpeg") {
      await sharp(img.path)
        .jpeg({ quality: 80, progressive: true })
        .toFile(outPath + ".tmp");
      const { renameSync } = await import("fs");
      renameSync(outPath + ".tmp", outPath);
    }

    const newSize = statSync(outPath).size;
    const saved = ((1 - newSize / img.size) * 100).toFixed(1);
    console.log(`  ✔ ${img.name}: ${(img.size / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${saved}% saved)`);
  } catch (err) {
    console.log(`  ✗ ${img.name}: ${err.message}`);
  }
}

console.log("\n✨ Image optimization complete");
