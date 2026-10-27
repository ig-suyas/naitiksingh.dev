/**
 * Captures the live project sites with Playwright (headless Chrome) and writes
 * optimised posters to /public/projects:
 *   <slug>.webp      1600×1000, used by the DOM poster (next/image resizes it)
 *   <slug>-tex.webp  1024×640, used as the 3D screen texture
 *
 * Each page is shot at 1440×900 (2× pixels) once the network is idle, fonts and
 * hero images have loaded and two frames in a row are identical, so intro and
 * loader animations have finished.
 *
 * Usage: npm run capture                  (every target)
 *        npm run capture -- saltline maren (only these slugs)
 */
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "projects");
const cacheDir = join(root, "scripts", ".cache");

const targets = [
  { slug: "saltline", url: "https://saltline-kitchen-woad.vercel.app/" },
  // Software WebGL so the 3D synth renders headless; skips the loader if it can.
  { slug: "oscillo", url: "https://oscillo-osc1.vercel.app/", swiftshader: true, skip: true },
  { slug: "vantro", url: "https://vantro-gamma.vercel.app/" },
  { slug: "maren", url: "https://maren-aesthetics.vercel.app/" },
  // Real GPU renders the WebGL hero faithfully.
  { slug: "shadeon", url: "https://shadeon-chi.vercel.app/", gpu: true },
];

const only = process.argv.slice(2);
const queue = only.length ? targets.filter((t) => only.includes(t.slug)) : targets;

await mkdir(outDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

for (const t of queue) {
  console.log(`capturing ${t.url}`);
  const browser = await chromium.launch({
    channel: process.env.CHROME_PATH ? undefined : "chrome",
    executablePath: process.env.CHROME_PATH,
    args: t.gpu
      ? ["--enable-gpu", "--ignore-gpu-blocklist"]
      : t.swiftshader
        ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        : [],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(t.url, { waitUntil: "networkidle", timeout: 90_000 });
  if (t.skip) {
    const skip = page.getByRole("button", { name: /skip/i }).first();
    await skip.click({ timeout: 8000 }).catch(() => {});
  }
  await page.addStyleTag({
    content: "html{scrollbar-width:none}::-webkit-scrollbar{display:none}",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const hero = [...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight);
    await Promise.all(hero.map((i) => (i.complete ? null : i.decode().catch(() => null))));
  });

  // Wait for the intro to settle: two identical frames 1 s apart (max ~12 s).
  await page.waitForTimeout(2500);
  let prev = await page.screenshot();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const next = await page.screenshot();
    if (next.equals(prev)) break;
    prev = next;
  }

  const raw = join(cacheDir, `${t.slug}.png`);
  await page.screenshot({ path: raw });
  await browser.close();

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
