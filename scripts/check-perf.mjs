/**
 * Scroll test under a 4× CPU throttle: wheels through Act II (the
 * architecture) and Act III (the projects, expanded with "See more work") and
 * logs every long task over 50 ms, plus dropped frames per section.
 *
 * Usage: npm run build && npm run start -- -p 3103, then
 *        node scripts/check-perf.mjs [url] [width] [height]
 * Exits with code 1 when any long task exceeds 50 ms.
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3103/";
const VW = Number(process.argv[3] ?? 1440);
const VH = Number(process.argv[4] ?? 900);
const mobile = VW < 768;

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-gpu", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({
  viewport: { width: VW, height: VH },
  isMobile: mobile,
  hasTouch: mobile,
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__long.push({ at: scrollY, start: e.startTime, ms: e.duration });
  }).observe({ type: "longtask", buffered: true });
  // Long animation frames say what the time went on (script, style/layout, render).
  window.__loaf = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.duration <= 50) continue;
      const top = [...e.scripts]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 2)
        .map((x) => `${x.invoker || x.sourceFunctionName} ${x.duration.toFixed(0)}ms`);
      const render = e.startTime + e.duration - e.renderStart;
      const layout = e.startTime + e.duration - (e.styleAndLayoutStart || e.renderStart);
      window.__loaf.push(
        `${e.duration.toFixed(0)}ms at scroll ${Math.round(scrollY)}: render ${render.toFixed(0)}ms, style+layout ${layout.toFixed(0)}ms, block ${e.blockingDuration.toFixed(0)}ms; ${top.join(", ")}`,
      );
    }
  }).observe({ type: "long-animation-frame", buffered: true });
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.classList.contains("intro-done"), null, {
  timeout: 90_000,
});
// Phones boot the 3D lazily (after idle or the first touch): let that finish
// first, so the sweeps measure the sections rather than the one-time boot.
await page
  .waitForFunction(() => document.querySelector("#stage canvas"), null, { timeout: 30_000 })
  .catch(() => {});
await page.waitForTimeout(4000);
await page.evaluate(() => window.__loaf.splice(0));

const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const section = (id) =>
  page.evaluate((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  }, id);

/** Scrolls from y0 to y1 the way a user does (wheel on desktop, native on touch). */
async function sweep(name, y0, y1) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(y0));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__long = [];
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => {
      window.__frames.push(t - last);
      last = t;
      window.__raf = requestAnimationFrame(loop);
    };
    window.__raf = requestAnimationFrame(loop);
  });
  const step = 120;
  for (let y = y0; y < y1; y += step) {
    if (mobile) await page.evaluate((d) => window.scrollBy(0, d), step);
    else await page.mouse.wheel(0, step);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1200);
  const { long, frames } = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return { long: window.__long, frames: window.__frames };
  });
  const over = long.filter((l) => l.ms > 50);
  const dropped = frames.filter((f) => f > 34).length;
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  console.log(
    `${name}: ${frames.length} frames, p95 ${p95.toFixed(1)} ms, ${dropped} over 34 ms, ` +
      `long tasks ${long.length} (max ${Math.max(0, ...long.map((l) => l.ms)).toFixed(0)} ms, ${over.length} over 50 ms)`,
  );
  if (process.env.LOAF)
    for (const l of await page.evaluate(() => window.__loaf.splice(0))) console.log("  LoAF " + l);
  for (const l of over)
    console.log(`  long task ${l.ms.toFixed(0)} ms at scroll ${Math.round(l.at)}`);
  return over.length;
}

let bad = 0;
const build = await section("build");
bad += await sweep("Act II architecture", build.top - VH, build.bottom);
const work = await section("work");
bad += await sweep("Act III projects 01–02", work.top - VH, work.bottom - VH);
const btn = page.locator('[aria-controls="more-work"]');
if (await btn.count()) {
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await btn.click();
  await page.waitForTimeout(1500);
  const y = await page.evaluate(() => scrollY);
  const work2 = await section("work");
  bad += await sweep("Act III projects 03–04 (expanded)", y, work2.bottom - VH);
}

await browser.close();
console.log(bad ? `\n${bad} long task(s) over 50 ms` : "\nno long tasks over 50 ms");
process.exit(bad ? 1 : 0);
