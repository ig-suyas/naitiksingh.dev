/**
 * Scrolls the whole page at several widths and logs text that overlaps other
 * text or important content (images, buttons, the 3D architecture blocks).
 * Background art, fixed chrome (nav, HUD, film overlays) and hidden or
 * clipped content are ignored.
 *
 * Usage: npm run dev, then  node scripts/check-overlaps.mjs [url] [widths]
 *   e.g. node scripts/check-overlaps.mjs http://localhost:3101 1440,390
 * Exits with code 1 when any overlap is found.
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3101/";
const sizes = {
  1440: [1440, 900],
  1280: [1280, 800],
  768: [768, 1024],
  390: [390, 844],
};
const widths = (process.argv[3] ?? "1440,1280,768,390").split(",").map(Number);

/** Runs in the page: returns every overlap visible in the current viewport. */
function scan() {
  // Shader pre-compilation shows every set for a frame: not a real layout.
  if (window.__director?.compiling) return [];
  const vw = innerWidth;
  const vh = innerHeight;
  const MIN = 4; // px² of intersection that counts as an overlap

  // Fixed chrome (nav, HUD, leader, reticle, film overlays) floats over the page
  // by design. The architecture labels also live in a fixed layer but count.
  const isChrome = (el) => {
    if (el.closest(".node-label, [data-arch-list]")) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === "fixed") return true;
    }
    return !!el.closest(".skip-link");
  };

  // Effective visibility: opacity chain, visibility, clipping ancestors, inert.
  const clipRect = (el) => {
    // Also catches closed <details> and content-visibility: hidden subtrees.
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return null;
    let r = { l: 0, t: 0, r: vw, b: vh };
    let opacity = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      opacity *= Number(s.opacity);
      if (s.visibility === "hidden" || s.display === "none" || n.inert) return null;
      if (n !== el && /(hidden|clip)/.test(s.overflow)) {
        const b = n.getBoundingClientRect();
        r = {
          l: Math.max(r.l, b.left),
          t: Math.max(r.t, b.top),
          r: Math.min(r.r, b.right),
          b: Math.min(r.b, b.bottom),
        };
      }
    }
    if (opacity < 0.15 || r.r <= r.l || r.b <= r.t) return null;
    return r;
  };

  const boxes = [];
  const add = (kind, el, rects, name) => {
    const clip = clipRect(el);
    if (!clip) return;
    for (const q of rects) {
      const b = {
        l: Math.max(q.left, clip.l),
        t: Math.max(q.top, clip.t),
        r: Math.min(q.right, clip.r),
        b: Math.min(q.bottom, clip.b),
      };
      if (b.r - b.l < 2 || b.b - b.t < 2) continue;
      boxes.push({ kind, el, name, ...b });
    }
  };

  // Text: tight boxes from each text node's line rects.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || !t.textContent.trim()) continue;
    if (el.closest("script, style, noscript, .sr-only, [data-overlap-ignore]")) continue;
    if (isChrome(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const rects = [...range.getClientRects()].filter(
      (r) => r.bottom > 0 && r.top < vh && r.width > 0,
    );
    if (rects.length) add("text", el, rects, t.textContent.trim().slice(0, 40));
  }
  // Important content: images and controls.
  for (const el of document.querySelectorAll("main img, main button, main a.rounded-full")) {
    if (isChrome(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh)
      add(
        el.tagName.toLowerCase(),
        el,
        [r],
        el.getAttribute("alt")?.slice(0, 30) || el.textContent.trim().slice(0, 30),
      );
  }
  // Project cards, so a 3D screen covering one is caught.
  for (const grid of document.querySelectorAll("[data-feature]")) {
    const el = grid.querySelector(".panel");
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) add("card", el, [r], `card ${grid.dataset.feature}`);
  }
  // The 3D architecture blocks and project screens (dev builds expose the R3F store).
  const r3f = window.__r3f;
  if (r3f) {
    const cam = r3f.camera;
    const blocks = [];
    r3f.scene.traverse((o) => {
      if (o.isMesh && o.geometry?.type === "BoxGeometry" && o.geometry.parameters.width > 1) {
        for (let p = o; p; p = p.parent) if (!p.visible) return;
        blocks.push(o);
      }
    });
    blocks.forEach((m, i) => {
      if (m.scale.x < 0.95) return;
      const g = m.geometry.parameters;
      let l = Infinity,
        t = Infinity,
        r = -Infinity,
        b = -Infinity,
        ok = true;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1]) {
            const v = new cam.position.constructor(
              (sx * g.width) / 2,
              (sy * g.height) / 2,
              (sz * g.depth) / 2,
            );
            m.localToWorld(v);
            v.project(cam);
            if (v.z > 1) ok = false;
            const x = (v.x * 0.5 + 0.5) * vw,
              y = (-v.y * 0.5 + 0.5) * vh;
            l = Math.min(l, x);
            r = Math.max(r, x);
            t = Math.min(t, y);
            b = Math.max(b, y);
          }
      // Projected boxes are hexagons; shrink the AABB a little so corners don't count.
      const ix = (r - l) * 0.12,
        iy = (b - t) * 0.12;
      if (ok && r > 0 && l < vw && b > 0 && t < vh)
        boxes.push({
          kind: "block",
          el: null,
          name: `block ${i}`,
          l: l + ix,
          t: t + iy,
          r: r - ix,
          b: b - iy,
        });
    });
    r3f.scene.traverse((o) => {
      const g = o.geometry?.parameters;
      if (!o.isMesh || o.geometry.type !== "PlaneGeometry" || Math.abs(g.width - 4.4) > 0.01)
        return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      if ((o.material.uniforms?.uAlpha?.value ?? 1) < 0.15) return;
      // A screen that isn't playing (the dim next panel peeking behind a card,
      // or the room's first wide shot) is background art.
      if ((o.material.uniforms?.uOn?.value ?? 1) < 0.5) return;
      let l = Infinity,
        t = Infinity,
        r = -Infinity,
        b = -Infinity;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          const v = new cam.position.constructor((sx * g.width) / 2, (sy * g.height) / 2, 0);
          o.localToWorld(v);
          v.project(cam);
          const x = (v.x * 0.5 + 0.5) * vw,
            y = (-v.y * 0.5 + 0.5) * vh;
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
      if (r > 0 && l < vw && b > 0 && t < vh)
        boxes.push({ kind: "screen", el: null, name: "3D screen", l, t, r, b });
    });
  }

  const related = (a, b) =>
    a.el && b.el && (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el));
  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      // A 3D screen may not cover anything; otherwise only text pairs count.
      const screenPair = (a.kind === "screen") !== (b.kind === "screen");
      if (a.kind !== "text" && b.kind !== "text" && !screenPair) continue;
      if (related(a, b)) continue;
      // Text inside a control or an image's own figure caption is fine.
      const nonText = a.kind === "text" ? b : a;
      const text = a.kind === "text" ? a : b;
      if (!screenPair && nonText.el && nonText.el.contains(text.el)) continue;
      // A caption laid over its own image (e.g. the poster's film label) is by design.
      if (nonText.kind === "img" && nonText.el.parentElement?.contains(text.el)) continue;
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      // Display type with tight leading: line boxes touch, glyphs don't.
      const minH = Math.min(a.b - a.t, b.b - b.t);
      if (a.kind === "text" && b.kind === "text" && h < minH * 0.35) continue;
      if (w >= 2 && h >= 2 && w * h >= MIN) {
        out.push(
          `${a.kind}:"${a.name}" × ${b.kind}:"${b.name}" (${Math.round(w)}×${Math.round(h)}px @ y${Math.round(Math.max(a.t, b.t))})`,
        );
      }
    }
  }
  return out;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
let total = 0;
for (const w of widths) {
  const [vw, vh] = sizes[w] ?? [w, 900];
  const mobile = vw < 768;
  const ctx = await browser.newContext({
    viewport: { width: vw, height: vh },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page
    .waitForFunction(() => document.documentElement.classList.contains("intro-done"), null, {
      timeout: 60_000,
    })
    .catch(() => {});
  // Phones and tablets load the 3D once idle: wait for it so the sweep sees it.
  await page.waitForFunction(() => window.__r3f, null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const r3fReady = await page.evaluate(() => !!window.__r3f);
  const seen = new Map();
  const scrollAll = async (label) => {
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= max; y += Math.round(vh * 0.3)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      // Long enough for the damped camera to settle on the new shot.
      await page.waitForTimeout(r3fReady ? 600 : 260);
      for (const o of await page.evaluate(scan)) {
        const key = o.replace(/ @ y\d+/, "").replace(/\(\d+×\d+px/, "(");
        if (!seen.has(key)) seen.set(key, `${label} scroll ${y}: ${o}`);
      }
    }
  };
  await scrollAll("collapsed");
  // Expand "See more work" and scan again.
  const btn = page.locator('[aria-controls="more-work"]');
  if (await btn.count()) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    // Let the expand finish before sweeping again.
    await page.waitForTimeout(1500);
    await scrollAll("expanded");
  }
  console.log(`\n=== ${vw}x${vh}: ${seen.size} overlap(s)`);
  for (const v of seen.values()) console.log("  " + v);
  total += seen.size;
  await ctx.close();
}
await browser.close();
process.exit(total ? 1 : 0);
