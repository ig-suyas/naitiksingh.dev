(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     Theme toggle (dark default, choice persisted)
     ------------------------------------------------------------------------ */

  var toggle = document.querySelector('.theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function isLight() {
    return root.getAttribute('data-theme') === 'light';
  }

  function syncThemeUi() {
    var light = isLight();
    toggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    if (themeMeta) themeMeta.setAttribute('content', light ? '#f2f5f1' : '#050705');
  }

  toggle.addEventListener('click', function () {
    var next = isLight() ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeUi();
    document.dispatchEvent(new CustomEvent('themechange'));
  });

  syncThemeUi();

  /* ------------------------------------------------------------------------
     Header background once the page has scrolled
     ------------------------------------------------------------------------ */

  var header = document.querySelector('.site-header');
  var sentinel = document.querySelector('.top-sentinel');

  if ('IntersectionObserver' in window && sentinel) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ------------------------------------------------------------------------
     Fade-in on scroll, staggered per batch
     ------------------------------------------------------------------------ */

  var revealEls = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        revealer.unobserve(entry.target);
        setTimeout(function () { entry.target.classList.add('is-visible'); }, i * 90);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Copy email to clipboard
     ------------------------------------------------------------------------ */

  var copyBtn = document.querySelector('.copy-btn');
  var copyStatus = document.querySelector('.copy-status');
  var statusTimer;

  function setStatus(msg) {
    copyStatus.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2500);
  }

  function selectAddress() {
    var el = document.getElementById('email-address');
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  var copyHint = /Mac|iPhone|iPad/.test(navigator.platform || '') ? 'Press ⌘C to copy' : 'Press Ctrl+C to copy';

  // Legacy path: select the visible address and ask the browser to copy it.
  // If that fails too, the address stays selected for a manual copy.
  function fallbackCopy() {
    selectAddress();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    setStatus(ok ? 'Copied' : copyHint);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var value = copyBtn.getAttribute('data-copy');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () { setStatus('Copied'); }, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Scramble the project names on hover, like text being decoded.
     ------------------------------------------------------------------------ */

  var GLYPHS = '0123456789abcdef<>/{}[]=+*#$%';

  document.querySelectorAll('[data-scramble]').forEach(function (el) {
    var original = el.textContent;
    var timer = 0;
    function scramble() {
      if (reduceMotion.matches) return;
      var frame = 0;
      var total = 14;
      clearInterval(timer);
      timer = setInterval(function () {
        frame++;
        var settled = Math.floor((frame / total) * original.length);
        var out = '';
        for (var i = 0; i < original.length; i++) {
          out += i < settled ? original[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (frame >= total) { clearInterval(timer); el.textContent = original; }
      }, 32);
    }
    var link = el.closest('a');
    link.addEventListener('mouseenter', scramble);
    link.addEventListener('focus', scramble);
  });

  /* ------------------------------------------------------------------------
     Hero background: a field of hex/binary glyphs that drifts in and out,
     with slow "rain" streaks down some columns. Glyphs near the cursor light
     up phosphor green and scramble. Pauses off-screen and in background tabs;
     a single static frame is drawn when reduced motion is preferred.
     ------------------------------------------------------------------------ */

  var hero = document.querySelector('.hero');
  var canvas = document.querySelector('.hero__canvas');
  if (!hero || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var CELL_W = 18;
  var CELL_H = 24;
  var FONT_PX = 15;
  var PAD = 8;                 // room around each glyph for the baked-in glow
  var FRAME_MS = 1000 / 24;    // the field moves slowly, 24fps is plenty
  var dpr = 1;
  var width = 0;
  var height = 0;
  var cols = 0;
  var rows = 0;
  var cells = null;            // glyph index per cell
  var heads = null;            // rain head position per column (in rows), < 0 means idle
  var speeds = null;
  var atlas = { dim: null, hot: null };
  var pointer = { x: -9999, y: -9999, active: false };
  var running = false;
  var visible = true;
  var rafId = 0;
  var lastFrame = 0;
  var start = performance.now();

  // Every glyph is pre-rendered once per colour (with the glow baked in for the
  // bright set), so each frame is just cheap drawImage calls.
  function makeAtlas(rgb, glow) {
    var cw = (CELL_W + PAD * 2) * dpr;
    var ch = (CELL_H + PAD * 2) * dpr;
    var c = document.createElement('canvas');
    c.width = Math.ceil(cw * GLYPHS.length);
    c.height = Math.ceil(ch);
    var g = c.getContext('2d');
    g.font = '600 ' + FONT_PX * dpr + 'px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgb(' + rgb + ')';
    if (glow) {
      g.shadowColor = 'rgba(' + rgb + ',0.9)';
      g.shadowBlur = 8 * dpr;
    }
    for (var i = 0; i < GLYPHS.length; i++) {
      g.fillText(GLYPHS[i], cw * i + cw / 2, ch / 2);
    }
    return c;
  }

  function readColors() {
    var styles = getComputedStyle(root);
    function rgb(name) { return styles.getPropertyValue(name).trim().split(/\s+/).join(','); }
    atlas.dim = makeAtlas(rgb('--glyph'), false);
    atlas.hot = makeAtlas(rgb('--glyph-hot'), true);
  }

  function randomGlyph() { return (Math.random() * GLYPHS.length) | 0; }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var newDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var dprChanged = newDpr !== dpr;
    dpr = newDpr;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cols = Math.ceil(width / CELL_W) + 1;
    rows = Math.ceil(height / CELL_H) + 1;
    cells = new Uint8Array(cols * rows);
    for (var i = 0; i < cells.length; i++) cells[i] = randomGlyph();
    heads = new Float32Array(cols);
    speeds = new Float32Array(cols);
    for (var c = 0; c < cols; c++) {
      heads[c] = Math.random() < 0.25 ? Math.random() * rows : -Math.random() * rows * 2;
      speeds[c] = 0.12 + Math.random() * 0.25;
    }
    if (dprChanged || !atlas.dim) readColors();
  }

  function drawGlyph(img, index, x, y, alpha) {
    var sw = (CELL_W + PAD * 2) * dpr;
    var sh = (CELL_H + PAD * 2) * dpr;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, index * sw, 0, sw, sh, (x - PAD) * dpr, (y - PAD) * dpr, sw, sh);
  }

  function draw(now, advance) {
    var t = (now - start) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var px = pointer.x;
    var py = pointer.y;
    var reach = 150;
    var reach2 = reach * reach;
    var i, j;

    if (advance) {
      // A few glyphs mutate every frame so the field never looks frozen.
      var mutations = Math.max(1, (cells.length * 0.012) | 0);
      for (i = 0; i < mutations; i++) cells[(Math.random() * cells.length) | 0] = randomGlyph();
      for (i = 0; i < cols; i++) {
        heads[i] += speeds[i];
        if (heads[i] > rows + 12) {
          heads[i] = -Math.random() * rows * 1.5;
          speeds[i] = 0.12 + Math.random() * 0.25;
        }
      }
    }

    for (i = 0; i < cols; i++) {
      var x = i * CELL_W;
      var head = heads[i];
      for (j = 0; j < rows; j++) {
        var y = j * CELL_H;
        var idx = j * cols + i;
        // Layered sine waves stand in for noise: cheap and smooth.
        var v = Math.sin(x * 0.011 + t * 0.45)
          + Math.sin(y * 0.016 - t * 0.3)
          + Math.sin((x + y) * 0.006 + t * 0.2);
        var n = (v + 3) / 6;
        var alpha = n * n * 0.32;

        // Rain: bright head with a fading tail above it.
        var hot = 0;
        var behind = head - j;
        if (behind >= 0 && behind < 10) hot = (1 - behind / 10) * 0.6;

        if (pointer.active) {
          var dx = x + CELL_W / 2 - px;
          var dy = y + CELL_H / 2 - py;
          var d2 = dx * dx + dy * dy;
          if (d2 < reach2) {
            var k = 1 - d2 / reach2;
            hot = Math.max(hot, k);
            if (advance && Math.random() < k * 0.25) cells[idx] = randomGlyph();
          }
        }

        if (hot > 0.08) {
          drawGlyph(atlas.hot, cells[idx], x, y, Math.min(1, 0.15 + hot * 0.95));
        } else if (alpha > 0.015) {
          drawGlyph(atlas.dim, cells[idx], x, y, alpha);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (now - lastFrame >= FRAME_MS) {
      lastFrame = now;
      draw(now, true);
    }
    rafId = requestAnimationFrame(loop);
  }

  function play() {
    if (running || reduceMotion.matches || !visible || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function renderStatic() {
    draw(start + 4000, false);
  }

  function init() {
    resize();
    if (reduceMotion.matches) renderStatic();
    else play();

    // Re-render the glyph atlases once the web font is in, so glyphs use JetBrains Mono.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        readColors();
        if (!running) renderStatic();
      });
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        resize();
        if (!running) renderStatic();
      }).observe(canvas);
    }

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) play(); else pause();
    }).observe(hero);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else play();
    });

    document.addEventListener('themechange', function () {
      readColors();
      if (!running) renderStatic();
    });

    reduceMotion.addEventListener('change', function () {
      if (reduceMotion.matches) { pause(); renderStatic(); } else play();
    });

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    hero.addEventListener('pointerleave', function () { pointer.active = false; });
  }

  // Start after the page has loaded so the canvas never competes with first paint.
  function whenIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 2000 });
    else setTimeout(init, 300);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle);
})();
