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
    if (themeMeta) themeMeta.setAttribute('content', light ? '#f5f5f4' : '#0b0b0d');
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
     Hero background: a slow-moving dot field drawn on canvas.
     Pauses off-screen and in background tabs; a single static frame
     is drawn when reduced motion is preferred.
     ------------------------------------------------------------------------ */

  var hero = document.querySelector('.hero');
  var canvas = document.querySelector('.hero__canvas');
  if (!hero || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var SPACING = 26;
  var dpr = 1;
  var width = 0;
  var height = 0;
  var cols = 0;
  var rows = 0;
  var dotRgb = '237,237,238';
  var accentRgb = '255,106,61';
  var pointer = { x: -9999, y: -9999, active: false };
  var running = false;
  var visible = true;
  var rafId = 0;
  var start = performance.now();

  function readColors() {
    var styles = getComputedStyle(root);
    dotRgb = styles.getPropertyValue('--dot').trim().split(/\s+/).join(',');
    accentRgb = styles.getPropertyValue('--dot-accent').trim().split(/\s+/).join(',');
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / SPACING) + 1;
    rows = Math.ceil(height / SPACING) + 1;
  }

  function draw(now) {
    var t = (now - start) / 1000;
    ctx.clearRect(0, 0, width, height);

    var px = pointer.x;
    var py = pointer.y;
    var reach = 160;
    var reach2 = reach * reach;

    for (var j = 0; j < rows; j++) {
      var y0 = j * SPACING;
      for (var i = 0; i < cols; i++) {
        var x0 = i * SPACING;
        // Layered sine waves stand in for noise: cheap and smooth.
        var v = Math.sin(x0 * 0.011 + t * 0.5)
          + Math.sin(y0 * 0.017 - t * 0.35)
          + Math.sin((x0 + y0) * 0.006 + t * 0.25);
        var n = (v + 3) / 6; // 0..1
        var x = x0;
        var y = y0 + Math.sin(x0 * 0.02 + t * 0.6) * 3;

        var r = 0.6 + n * 1.4;
        var alpha = 0.06 + n * 0.32;
        var color = dotRgb;

        if (pointer.active) {
          var dx = x - px;
          var dy = y - py;
          var d2 = dx * dx + dy * dy;
          if (d2 < reach2) {
            var k = 1 - d2 / reach2;
            r += k * 1.6;
            alpha = Math.min(1, alpha + k * 0.6);
            if (k > 0.25) color = accentRgb;
          }
        }

        ctx.fillStyle = 'rgba(' + color + ',' + alpha.toFixed(3) + ')';
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }
  }

  function loop(now) {
    draw(now);
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
    draw(start + 4000);
  }

  function init() {
    readColors();
    resize();
    if (reduceMotion.matches) renderStatic();
    else play();

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
    if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 1500 });
    else setTimeout(init, 200);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle);
})();
