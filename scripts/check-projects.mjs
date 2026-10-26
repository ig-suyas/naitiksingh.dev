/**
 * Walks Act III at 1440×900 (or W×H from the env) and checks every project's
 * zoom → hold → handoff:
 *   entry     card rising, the camera flying in from the back of the room
 *   max       card top on the hold line: the screenshot at full zoom
 *   hold      halfway through the card: must match `max` exactly
 *   handoff   card read: the camera backing out towards the next project
 * plus one frame after "See more work" and one after "Show less".
 *
 * Logs each 3D screen's projected box, asserts the rules (the project's own
 * screen at full zoom, only it and the next one drawn, identical max zoom,
 * nothing moving in the hold, no cropping, no screen over its card) and saves
 * a screenshot per checkpoint.
 *
 * Usage: npm run dev, then  node scripts/check-projects.mjs [url] [outDir]
 *        RM=1 node scripts/check-projects.mjs   (reduced motion)
 */
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3101/";
const out =
  process.argv[3] ?? join(dirname(fileURLToPath(import.meta.url)), ".cache", "checkpoints");
await mkdir(out, { recursive: true });

const HOLD = 0.15; // HOLD_LINE in lib/director.ts
const RELEASE = 0.75; // RELEASE_LINE in lib/director.ts
const VW = Number(process.env.W ?? 1440);
const VH = Number(process.env.H ?? 900);

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-gpu", "--ignore-gpu-blocklist"],
});
// RM=1 runs the same walk with prefers-reduced-motion.
const page = await browser.newPage({
  viewport: { width: VW, height: VH },
  reducedMotion: process.env.RM === "1" ? "reduce" : "no-preference",
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => window.__r3f && document.documentElement.classList.contains("intro-done"),
  null,
  { timeout: 60_000 },
);
await page.waitForTimeout(1500);

/** Projected boxes of the visible 3D screens plus the card rects. */
const state = () =>
  page.evaluate(() => {
    const { scene, camera: cam } = window.__r3f;
    const screens = [];
    scene.traverse((o) => {
      const g = o.geometry?.parameters;
      if (!o.isMesh || o.geometry.type !== "PlaneGeometry" || Math.abs(g.width - 4.4) > 0.01)
        return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const alpha = o.material.uniforms.uAlpha.value;
      let l = Infinity,
        t = Infinity,
        r = -Infinity,
        b = -Infinity;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          const v = new cam.position.constructor((sx * g.width) / 2, (sy * g.height) / 2, 0);
          o.localToWorld(v);
          v.project(cam);
          const x = (v.x * 0.5 + 0.5) * innerWidth,
            y = (-v.y * 0.5 + 0.5) * innerHeight;
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
      const tex = o.material.uniforms.uMap.value.image?.src?.split("/").pop();
      screens.push({
        tex,
        alpha: +alpha.toFixed(3),
        l: +l.toFixed(1),
        t: +t.toFixed(1),
        r: +r.toFixed(1),
        b: +b.toFixed(1),
      });
    });
    const cards = [...document.querySelectorAll("[data-feature]")].map((c) => {
      const r = c.querySelector(".panel").getBoundingClientRect();
      return { i: +c.dataset.feature, l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
    return { screens, cards };
  });

const cardBox = (i) =>
  page.evaluate((i) => {
    const r = document.querySelector(`[data-feature="${i}"]`).getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  }, i);

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log("  FAIL " + msg);
};
const overlaps = (a, b) =>
  Math.min(a.r, b.r) > Math.max(a.l, b.l) && Math.min(a.b, b.b) > Math.max(a.t, b.t);

async function shoot(name, y) {
  if (y !== undefined) {
    await page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
    await page.waitForTimeout(1800); // camera damping and reveals settle
  }
  await page.mouse.move(VW / 2, VH / 2);
  const s = await state();
  await page.screenshot({ path: join(out, `${name}.png`) });
  const lit = s.screens.filter((x) => x.alpha > 0.02);
  console.log(
    `${name}: ${lit.map((x) => `${x.tex} a=${x.alpha} [${x.l},${x.t} → ${x.r},${x.b}] ${Math.round(x.r - x.l)}×${Math.round(x.b - x.t)}`).join(" | ") || "no screen"}`,
  );
  return { lit, cards: s.cards };
}

const slugs = ["saltline", "vantro", "maren", "shadeon"];
const maxBoxes = [];

/** The project's own screen at full zoom: whole, in view and clear of its card. */
function checkOwn(name, i, { lit, cards }) {
  const own = lit.filter((x) => x.tex?.startsWith(slugs[i]));
  if (own.length !== 1) {
    fail(`${name}: expected ${slugs[i]}'s screen, got ${lit.map((x) => x.tex)}`);
    return null;
  }
  const sc = own[0];
  const c = cards.find((k) => k.i === i);
  if (c && overlaps(sc, c)) fail(`${name}: ${sc.tex} runs under its own card`);
  if (sc.l < 0 || sc.r > VW || sc.t < 0 || sc.b > VH) fail(`${name}: ${sc.tex} is cropped`);
  const side = i % 2 === 0 ? "left" : "right";
  if (side === "left" ? sc.r > VW / 2 + 40 : sc.l < VW / 2 - 40)
    fail(`${name}: ${sc.tex} is not in the ${side} half`);
  return sc;
}

/** No screen is ever drawn bigger than the max zoom (once it is known). */
function checkNotPastMax(name, { lit }) {
  const ref = maxBoxes[0];
  if (!ref) return;
  for (const x of lit)
    if (x.alpha > 0.1 && x.r - x.l > ref.w + 1)
      fail(
        `${name}: ${x.tex} drawn past max zoom (${Math.round(x.r - x.l)} > ${Math.round(ref.w)})`,
      );
}

/** Only the project on stage and the one after it may be drawn. */
function checkOthers(name, allowed, { lit }) {
  const ok = allowed.map((k) => slugs[k]);
  const extra = lit.filter((x) => !ok.some((sl) => x.tex?.startsWith(sl)));
  if (extra.length) fail(`${name}: out-of-range screens drawn: ${extra.map((x) => x.tex)}`);
}

async function walk(i, hasNext) {
  const { top, bottom } = await cardBox(i);
  const maxY = top - HOLD * VH; // card top on the hold line
  const releaseY = Math.max(maxY, bottom - RELEASE * VH); // card read
  const n = i + 1;
  const allowed = hasNext ? [i, i + 1] : [i];
  const entry = await shoot(`${n}-1-entry`, top - 0.6 * VH);
  checkOthers(`${n} entry`, [i - 1, ...allowed], entry);
  const max = await shoot(`${n}-2-max`, maxY);
  const hold = await shoot(`${n}-3-hold`, (maxY + releaseY) / 2);
  const end = await shoot(`${n}-3b-hold-end`, releaseY - 2);
  const hand = await shoot(`${n}-4-handoff`, releaseY + 0.4 * VH);
  checkOthers(`${n} handoff`, allowed, hand);
  checkNotPastMax(`${n} handoff`, hand);
  checkNotPastMax(`${n} entry`, entry);

  const m = checkOwn(`${n} max`, i, max);
  for (const [name, st] of [
    ["hold", hold],
    ["hold-end", end],
  ]) {
    checkOthers(`${n} ${name}`, allowed, st);
    const h = checkOwn(`${n} ${name}`, i, st);
    if (m && h && ["l", "t", "r", "b"].some((k) => Math.abs(h[k] - m[k]) > 0.5))
      fail(`${n}: screen moved between max and ${name}`);
  }
  if (m) maxBoxes.push({ i, w: m.r - m.l, h: m.b - m.t });
}

console.log("— collapsed —");
await walk(0, true);
await walk(1, false);

console.log("— See more work —");
const btn = page.locator('[aria-controls="more-work"]');
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const before = await page.evaluate(() => scrollY);
await btn.click();
await page.waitForTimeout(2500);
const after = await shoot("5-after-see-more");
if (Math.abs((await page.evaluate(() => scrollY)) - before) > 2) fail("expanding moved the page");
checkOthers("after see more", [1, 2], after);
checkNotPastMax("after see more", after);
await walk(2, true);
await walk(3, false);

console.log("— Show less —");
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await btn.click();
await page.waitForTimeout(2500);
const collapsed = await shoot("6-after-show-less");
checkOthers("after show less", [1], collapsed);
// Scrolling back up through 01 and 02 must show their own state again.
await walk(0, true);
await walk(1, false);

const ws = maxBoxes.map((b) => b.w);
const hs = maxBoxes.map((b) => b.h);
if (Math.max(...ws) - Math.min(...ws) > 1 || Math.max(...hs) - Math.min(...hs) > 1)
  fail(
    `max zoom differs between projects: ${maxBoxes.map((b) => `${b.i + 1}: ${b.w.toFixed(1)}×${b.h.toFixed(1)}`).join(", ")}`,
  );
else
  console.log(
    `max zoom identical: ${maxBoxes.map((b) => `${b.w.toFixed(1)}×${b.h.toFixed(1)}`).join(", ")}`,
  );

await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : "\nall checks passed");
console.log(`screenshots: ${out}`);
process.exit(failures.length ? 1 : 0);
