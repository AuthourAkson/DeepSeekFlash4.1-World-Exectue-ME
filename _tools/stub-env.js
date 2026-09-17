/* ============================================================================
   stub-env.js — a headless DOM/Canvas/Audio harness for the film's engine.
   Loads index.html's scripts in order in a vm context with recording stubs.

   The canvas records EVERY drawing call it receives. Hashing that call stream
   gives a frame fingerprint: identical fingerprints mean identical pictures,
   which is exactly what "a seek restores the correct frame" requires.
   ==========================================================================*/
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeCtx(log, canvas) {
  const st = { fillStyle: '#000', strokeStyle: '#fff', lineWidth: 1, font: '', textAlign: 'left',
               textBaseline: 'alphabetic', globalAlpha: 1, globalCompositeOperation: 'source-over',
               lineDashOffset: 0, shadowBlur: 0, shadowColor: '', filter: 'none',
               lineCap: 'butt', lineJoin: 'miter', imageSmoothingEnabled: true };
  const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 1000) / 1000 : v);
  const rec = (op, args) => { log.push(op + '(' + args.map(num).join(',') + ')'); };
  const grad = () => ({ addColorStop(o, c) { log.push('stop(' + num(o) + ',' + c + ')'); } });
  const ctx = {
    canvas,
    save() { rec('save', []); }, restore() { rec('restore', []) },
    setTransform(...a) { rec('setTransform', a) }, resetTransform() { rec('resetTransform', []) },
    translate(...a) { rec('translate', a) }, rotate(...a) { rec('rotate', a) }, scale(...a) { rec('scale', a) },
    beginPath() { rec('beginPath', []) }, closePath() { rec('closePath', []) },
    moveTo(...a) { rec('moveTo', a) }, lineTo(...a) { rec('lineTo', a) },
    quadraticCurveTo(...a) { rec('quadraticCurveTo', a) }, bezierCurveTo(...a) { rec('bezierCurveTo', a) },
    arc(...a) { rec('arc', a) }, arcTo(...a) { rec('arcTo', a) }, ellipse(...a) { rec('ellipse', a) },
    rect(...a) { rec('rect', a) },
    stroke() { rec('stroke', [st.strokeStyle, st.lineWidth]) },
    fill() { rec('fill', [st.fillStyle]) },
    clip() { rec('clip', []) },
    fillRect(...a) { rec('fillRect', a) }, strokeRect(...a) { rec('strokeRect', a) }, clearRect(...a) { rec('clearRect', a) },
    fillText(t, x, y) { rec('fillText', [String(t).slice(0, 40), x, y, st.font, st.textAlign, st.fillStyle]) },
    strokeText(t, x, y) { rec('strokeText', [String(t).slice(0, 40), x, y, st.font]) },
    measureText(t) {
      /* Monospace metrics that actually track the font size. A constant width
         here made every centred / right-aligned string in the preview sit in
         the wrong place, which quietly invalidated layout checks. */
      const s = String(t);
      const px = parseFloat((st.font.match(/(\d+(?:\.\d+)?)px/) || [0, 14])[1]) || 14;
      const mono = !/sans/i.test(st.font);
      return { width: s.length * px * (mono ? 0.60 : 0.52) };
    },
    setLineDash(a) { rec('setLineDash', a || []) }, getLineDash() { return []; },
    createLinearGradient(...a) { rec('linearGradient', a); return grad(); },
    createRadialGradient(...a) { rec('radialGradient', a); return grad(); },
    createPattern() { return null; },
    drawImage(img, ...a) { rec('drawImage', a); },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }; },
    putImageData() {}, createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }; },
    isPointInPath() { return false; },
    getContextAttributes() { return { alpha: true }; }
  };
  Object.keys(st).forEach(k => {
    Object.defineProperty(ctx, k, { get: () => st[k], set: v => { st[k] = v; }, enumerable: true });
  });
  return ctx;
}

function makeEl(tag, log) {
  const listeners = {};
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    nodeName: (tag || 'div').toUpperCase(),
    style: new Proxy({ setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } }, {
      get(t, k) { return k in t ? t[k] : ''; }, set(t, k, v) { t[k] = v; return true; }
    }),
    dataset: {}, children: [], childNodes: [], textContent: '', value: '0.85', title: '', src: '',
    width: 1280, height: 720, videoWidth: 0, videoHeight: 0, duration: 211.984, currentTime: 0,
    paused: true, ended: false, volume: 0.85, muted: true, playbackRate: 1, preload: 'auto',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); }
    },
    getContext(kind) { if (!el._ctx) { el._ctx = makeCtx(log || [], el); } return el._ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }; },
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { el.children.push(c); return c; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    removeEventListener(t, f) { const a = listeners[t]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } },
    dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); return true; },
    setAttribute(k, v) { el._attrs[k] = String(v); if (k === 'src') el.src = String(v); },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    removeAttribute(k) { delete el._attrs[k]; if (k === 'src') el.src = ''; },
    hasAttribute(k) { return k in el._attrs; },
    focus() {}, blur() {}, click() {},
    play() {
      el.paused = false; el.ended = false;
      /* a real element resolves play() asynchronously and then reports
         readiness; schedule rather than fire inline */
      queueMicrotask(() => {
        (listeners.play || []).forEach(f => f({ type: 'play' }));
        if (el.duration > 1) (listeners.playing || []).forEach(f => f({ type: 'playing' }));
      });
      return Promise.resolve();
    },
    pause() { el.paused = true; queueMicrotask(() => (listeners.pause || []).forEach(f => f({ type: 'pause' }))); },
    load() {
      /* browsers do this asynchronously; only report metadata when there is
         really a usable duration, exactly like a successful open */
      queueMicrotask(() => {
        /* Simulated browser semantics for file:// media:
           A CORS-mode request (a crossorigin attribute) can never be answered
           by a local file, so Chrome fails it with MEDIA_ERR_SRC_NOT_SUPPORTED
           — exactly the error that made the film silent. */
        var corsBlocked = el._corsBlock || (el._attrs.crossorigin !== undefined && el._corsStrict);
        if (corsBlocked) {
          el.error = { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
          el.networkState = 3;
          (listeners.error || []).forEach(f => f({ type: 'error' }));
          return;
        }
        el.error = null;
        if (el.duration > 1) {
          el.networkState = 1;
          (listeners.loadedmetadata || []).forEach(f => f({ type: 'loadedmetadata' }));
        }
      });
    },
    /* test helper: make this element fail every load with the error Chrome
       reports for a blocked / CORS-mode media request */
    failLoads(on) { el._corsBlock = !!on; },
    /* test helper: emulate the file:// CORS rule for crossorigin attributes */
    corsStrict(on) { el._corsStrict = !!on; },
    canPlayType() { return 'probably'; },
    setPointerCapture() {}, releasePointerCapture() {},
    get _listeners() { return listeners; },
    fire(type, ev) { (listeners[type] || []).forEach(f => f(ev || { type })); }
  };
  el.id = '';
  el.className = '';
  el._attrs = {};
  el._corsStrict = true;
  return el;
}

function createEnv(opts) {
  opts = opts || {};
  const opLog = [];
  const els = {};
  const ids = ['audio', 'video', 'view', 'stage', 'shell', 'btn-play', 'btn-replay', 'wave', 'wave-fill',
    'wave-buf', 'wave-head', 'marks', 't-cur', 't-tot', 'vol', 'btn-full', 'offset', 'off-val',
    'off-reset', 'lyric-line', 'lyric-next', 'lyric-meta', 'hud-top', 'clock', 'state', 'dbg',
    'media', 'boot-msg', 'toast'];
  ids.forEach(id => { els[id] = makeEl(id === 'audio' || id === 'video' ? 'audio' : 'div', opLog); els[id].id = id; });
  els.view.getContext = () => els.view._ctx || (els.view._ctx = makeCtx(opLog, els.view));
  els.audio.currentTime = 0; els.audio.duration = 211.984; els.audio.paused = true;
  els.video.currentTime = 0; els.video.duration = 211.984; els.video.paused = true;

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const lrcMatch = html.match(/<script id="lrc-source"[^>]*>([\s\S]*?)<\/script>/);
  const lrcEl = makeEl('script', opLog);
  lrcEl.textContent = lrcMatch ? lrcMatch[1] : '';
  els['lrc-source'] = lrcEl;

  const rafQueue = [];
  let rafId = 1;
  const intervals = [];
  const errors = [];
  /* a virtual wall clock: each simulated frame advances 16.667 ms, so
     time-based logic (the fallback clock, fps, easing) behaves as it would
     in a browser instead of always seeing a zero delta */
  let virtualNow = 1000;
  const FRAME_MS = 1000 / 60;

  const document = {
    getElementById(id) { return els[id] || null; },
    createElement(tag) { return makeEl(tag, opLog); },
    createDocumentFragment() { return makeEl('fragment', opLog); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body', opLog),
    documentElement: makeEl('html', opLog),
    fullscreenElement: null, webkitFullscreenElement: null,
    exitFullscreen() {}, webkitExitFullscreen() {},
    hidden: false, visibilityState: 'visible'
  };

  const win = {
    devicePixelRatio: 1,
    innerWidth: 1280, innerHeight: 720,
    document,
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafId++; },
    cancelAnimationFrame() {},
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 1)),
    clearTimeout, setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    clearInterval: () => {},
    __intervals: intervals,
    performance: { now: () => virtualNow },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    console: {
      log: (...a) => { if (opts.quiet) return; console.log('[page]', ...a.map(x => typeof x === 'string' ? x : JSON.stringify(x))); },
      warn: (...a) => console.log('[page warn]', ...a),
      error: (...a) => { errors.push(a.map(String).join(' ')); console.log('[page ERROR]', ...a); },
      info() {}, debug() {}, trace() {}
    },
    location: { href: 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html', protocol: 'file:' },
    navigator: { userAgent: 'stub', platform: 'stub' },
    WebSocket: undefined,
    Event, CustomEvent: Event,
    Promise, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, TypeError, parseFloat, parseInt, isFinite, isNaN,
    Uint8ClampedArray, Float32Array, Map, Set, Symbol, RegExp
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  win.top = win;
  win.parent = win;

  const ctx = vm.createContext(win);

  /* load the engine in the same order as index.html */
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const loaded = [];
  for (const s of scripts) {
    const code = fs.readFileSync(path.join(ROOT, s), 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: s });
      loaded.push(s);
    } catch (e) {
      errors.push(s + ': ' + e.message);
      console.log('[load ERROR] ' + s + ': ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n'));
      break;
    }
  }

  return {
    win, ctx, document, els, opLog, errors, loaded,
    EM: win.EM,
    audio: els.audio, video: els.video,
    /* run any queued animation frames; the virtual clock advances one frame
       per iteration so dt-based logic sees a realistic 16.667 ms */
    flush(n) {
      let ran = 0;
      for (let i = 0; i < (n || 1); i++) {
        const q = rafQueue.splice(0, rafQueue.length);
        if (!q.length) break;
        virtualNow += FRAME_MS;
        q.forEach(fn => { try { fn(virtualNow); ran++; } catch (e) { errors.push('raf: ' + e.message); } });
      }
      return ran;
    },
    pendingFrames() { return rafQueue.length; },
    /* fire every timer the page registered (the heartbeat) and then run the
       animation frames it queued — the browser's idle behaviour */
    beat(times) {
      let n = 0;
      for (let k = 0; k < (times || 1); k++) {
        intervals.forEach(iv => { try { iv.fn(); } catch (e) { errors.push('timer: ' + e.message); } });
        const q = rafQueue.splice(0, rafQueue.length);
        virtualNow += FRAME_MS;
        q.forEach(fn => { try { fn(virtualNow); n++; } catch (e) { errors.push('raf: ' + e.message); } });
      }
      return n;
    },
    /* how much virtual wall time has passed */
    now() { return virtualNow; },
    advance(ms) { virtualNow += ms; },
    /* let queued microtasks (the async media events) run, then draw any frames
       they queued — this is how a real browser interleaves them */
    async settle(frames) {
      for (let i = 0; i < (frames || 3); i++) {
        await Promise.resolve();
        this.beat(1);
      }
    },
    /* reset the recorded call stream and return a fingerprint of what follows */
    sig(fn) {
      opLog.length = 0;
      fn();
      let h = 2166136261 >>> 0;
      for (const line of opLog) {
        for (let i = 0; i < line.length; i++) { h ^= line.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      }
      return { hash: h.toString(16), ops: opLog.length };
    }
  };
}

module.exports = { createEnv, makeEl };
