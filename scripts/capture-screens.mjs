/**
 * Captures the live project sites with headless Chrome and writes optimised
 * posters to /public/projects:
 *   <slug>.webp      1600×1000, used by the DOM poster (next/image resizes it)
 *   <slug>-tex.webp  1024×640, used as the 3D screen texture
 *
 * Usage: npm run capture            (set CHROME_PATH if Chrome lives elsewhere)
 */
import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "projects");
const cacheDir = join(root, "scripts", ".cache");

const targets = [
  { slug: "shadeon", url: "https://shadeon-chi.vercel.app/", wait: 8000, gpu: true },
  // Haul's API sleeps on a free tier; give it time to wake and render products.
  { slug: "haul", url: "https://xzie-store-frontend.vercel.app/", wait: 30000, gpu: false },
];

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const chrome = candidates.find((p) => existsSync(p));
if (!chrome) {
  console.error("No Chrome/Edge found. Set CHROME_PATH.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

for (const t of targets) {
  const raw = join(cacheDir, `${t.slug}.png`);
  console.log(`capturing ${t.url}`);
  await run(
    chrome,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1600,1000",
      "--force-dark-mode",
      // Real GPU renders WebGL heroes faithfully; SwiftShader is the safe default.
      ...(t.gpu
        ? ["--enable-gpu", "--ignore-gpu-blocklist"]
        : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]),
      `--user-data-dir=${join(cacheDir, "profile")}`,
      `--virtual-time-budget=${t.wait}`,
      `--screenshot=${raw}`,
      t.url,
    ],
    { timeout: 120_000 },
  );

  await sharp(raw)
    .resize(1600, 1000, { fit: "cover", position: "top" })
    .webp({ quality: 80 })
    .toFile(join(outDir, `${t.slug}.webp`));
  await sharp(raw)
    .resize(1024, 640, { fit: "cover", position: "top" })
    .webp({ quality: 76 })
    .toFile(join(outDir, `${t.slug}-tex.webp`));
  console.log(`  wrote ${t.slug}.webp and ${t.slug}-tex.webp`);
}

await rm(join(cacheDir, "profile"), { recursive: true, force: true });
