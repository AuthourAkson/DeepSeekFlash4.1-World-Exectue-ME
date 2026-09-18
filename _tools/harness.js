/* ============================================================================
 * _tools/harness.js — 无头运行台
 * ----------------------------------------------------------------------------
 * 在 node 里把 src/*.js 原封不动地跑起来，用"记录型 canvas 2D 上下文"接住
 * 每一次绘图调用，然后**真的光栅化**一遍，数出像素。
 *
 * 为什么非要光栅化：
 *   本项目真实踩过的坑 —— 131 块画板全部抛异常、一个图元都没画出来，
 *   而"131/131 已注册、覆盖率 100%"照样通过。注册 ≠ 画出来了。
 *   所以这里的判据是"这块画板让画面**多了**多少像素"，不是"注册表里有它"。
 *
 * 工具的已知近似（先说清楚，免得用它去判断作品时被它骗了）：
 *   · 文字不做字形光栅化，按 measureText 的包围盒落成实心块（覆盖率是准的，
 *     预览图里的字会是方块）
 *   · clip() 用裁剪路径的包围盒近似（只会裁得更少，不会造成"看起来没画"）
 *   · 渐变按扫描线中点取样（不做逐像素插值）
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------ 记录型上下文 */

const INIT = {
  fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineJoin: 'miter', lineCap: 'butt',
  globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif',
  textAlign: 'start', textBaseline: 'alphabetic'
};

function mul(m, n) {          // m ∘ n
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}
function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

function gradient(kind, args) {
  return { kind: kind, args: Array.prototype.slice.call(args), stops: [], addColorStop: function (o, c) { this.stops.push([o, c]); } };
}

function Context(w, h) {
  this.width = w; this.height = h;
  this.ops = [];
  this.m = [1, 0, 0, 1, 0, 0];
  this.stack = [];
  this.path = [];
  this.sub = null;
  this.clipRect = null;
  Object.assign(this, INIT);
}
Context.prototype.save = function () {
  this.stack.push({ m: this.m.slice(), s: { fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, globalAlpha: this.globalAlpha, font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline, clipRect: this.clipRect } });
};
Context.prototype.restore = function () {
  const t = this.stack.pop(); if (!t) return;
  this.m = t.m; Object.assign(this, t.s);
};
Context.prototype.setTransform = function (a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; };
Context.prototype.getTransform = function () { return { a: this.m[0], b: this.m[1], c: this.m[2], d: this.m[3], e: this.m[4], f: this.m[5] }; };
Context.prototype.translate = function (x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); };
Context.prototype.rotate = function (a) { const c = Math.cos(a), s = Math.sin(a); this.m = mul(this.m, [c, s, -s, c, 0, 0]); };
Context.prototype.scale = function (x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); };
Context.prototype.beginPath = function () { this.path = []; this.sub = null; };
Context.prototype.moveTo = function (x, y) { this.sub = [apply(this.m, x, y)]; this.path.push(this.sub); };
Context.prototype.lineTo = function (x, y) { if (!this.sub) this.moveTo(x, y); else this.sub.push(apply(this.m, x, y)); };
Context.prototype.closePath = function () { this.closed = true; };
Context.prototype.rect = function (x, y, w, h) {
  const p = [apply(this.m, x, y), apply(this.m, x + w, y), apply(this.m, x + w, y + h), apply(this.m, x, y + h)];
  this.sub = p; this.path.push(p);
};
Context.prototype.bezierCurveTo = function (x1, y1, x2, y2, x3, y3) {
  const m = this.m;
  const p0 = this.sub ? this.sub[this.sub.length - 1] : apply(m, x1, y1);
  const c1 = apply(m, x1, y1), c2 = apply(m, x2, y2), p1 = apply(m, x3, y3);
  for (let i = 1; i <= 8; i++) {                      // 贝塞尔采样
    const t = i / 8, u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
    this.lineTo(x, y);
  }
};
Context.prototype.quadraticCurveTo = function (x1, y1, x2, y2) {
  const m = this.m;
  const p0 = this.sub ? this.sub[this.sub.length - 1] : apply(m, x1, y1);
  const c1 = apply(m, x1, y1), p1 = apply(m, x2, y2);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, u = 1 - t;
    this.lineTo(u * u * p0[0] + 2 * u * t * c1[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * p1[1]);
  }
};
Context.prototype.clip = function () {
  let b = null;
  for (const sub of this.path) for (const p of sub) {
    if (!b) b = [p[0], p[1], p[0], p[1]];
    else { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }
  }
  if (b) this.clipRect = this.clipRect ? [Math.max(b[0], this.clipRect[0]), Math.max(b[1], this.clipRect[1]), Math.min(b[2], this.clipRect[2]), Math.min(b[3], this.clipRect[3])] : b;
};
Context.prototype.fill = function () { this._op('fill'); };
Context.prototype.stroke = function () { this._op('stroke'); };
Context.prototype._op = function (kind) {
  if (!this.path.length) return;
  const polys = this.path.map(s => s.slice());
  this.ops.push({ kind: kind, polys: polys, style: this.fillStyle, colour: kind === 'stroke' ? this.strokeStyle : this.fillStyle, alpha: this.globalAlpha, lw: this.lineWidth, clip: this.clipRect });
};
Context.prototype.fillRect = function (x, y, w, h) {
  const p = [apply(this.m, x, y), apply(this.m, x + w, y), apply(this.m, x + w, y + h), apply(this.m, x, y + h)];
  this.ops.push({ kind: 'fill', polys: [p], colour: this.fillStyle, style: this.fillStyle, alpha: this.globalAlpha, lw: 0, clip: this.clipRect });
};
Context.prototype.clearRect = function (x, y, w, h) {
  this.ops.push({ kind: 'clear', polys: [[apply(this.m, x, y), apply(this.m, x + w, y), apply(this.m, x + w, y + h), apply(this.m, x, y + h)]], alpha: 1, clip: this.clipRect });
};
Context.prototype.createLinearGradient = function () { return gradient('linear', arguments); };
Context.prototype.createRadialGradient = function () { return gradient('radial', arguments); };
Context.prototype.setLineDash = function () { };
Context.prototype.measureText = function (s) {
  const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 10])[1]);
  const mono = /mono|Consolas|Courier/i.test(this.font);
  return { width: String(s).length * size * (mono ? 0.6 : 0.56) };
};
Context.prototype.fillText = function (s, x, y) {
  s = String(s);
  const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 10])[1]);
  const w = this.measureText(s).width;
  const m = this.m;
  let ax = x, ay = y;
  if (this.textAlign === 'center') ax = x - w / 2; else if (this.textAlign === 'right') ax = x - w;
  let ty = y;
  if (this.textBaseline === 'middle') ty = y + size * 0.35; else if (this.textBaseline === 'top') ty = y + size * 0.8;
  const p = [apply(m, ax, ty - size * 0.78), apply(m, ax + w, ty - size * 0.78), apply(m, ax + w, ty + size * 0.2), apply(m, ax, ty + size * 0.2)];
  this.ops.push({ kind: 'text', text: s, polys: [p], colour: this.fillStyle, style: this.fillStyle, alpha: this.globalAlpha, lw: 0, clip: this.clipRect, size: size });
};
Context.prototype.drawImage = function () { this.ops.push({ kind: 'image', alpha: this.globalAlpha }); };

/* --------------------------------------------------------------- 光栅化 */

const RW = 320, RH = 180;        // 覆盖率网格（1/5 舞台分辨率）
const SX = RW / 1600, SY = RH / 900;
const STAGE_W = 1600, STAGE_H = 900;

function colourOf(style, sx, sy, w, h) {
  if (typeof style === 'string') return style;
  if (!style || !style.stops || !style.stops.length) return '#808080';
  const st = style.stops, a = style.args;
  let t = 0;
  if (style.kind === 'linear') {
    const x0 = a[0], y0 = a[1], x1 = a[2], y1 = a[3];
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    t = ((sx - x0) * dx + (sy - y0) * dy) / L2;
  } else {
    const r1 = a[4] || Math.hypot(w, h);
    t = Math.hypot(sx - a[0], sy - a[1]) / (r1 || 1);
  }
  t = Math.max(0, Math.min(1, t));
  for (let i = st.length - 1; i >= 0; i--) if (t >= st[i][0]) return mixStyle(st[i][1], st[Math.min(i + 1, st.length - 1)][1], st[i][0] === st[Math.min(i + 1, st.length - 1)][0] ? 0 : (t - st[i][0]) / (st[Math.min(i + 1, st.length - 1)][0] - st[i][0]));
  return st[0][1];
}
function parseCol(c) {
  if (typeof c !== 'string') return [128, 128, 128, 1];
  c = c.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1]; }
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) { const v = parseInt(m[1], 16); return [((v >> 8) & 15) * 17, ((v >> 4) & 15) * 17, (v & 15) * 17, 1]; }
  m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) { const p = m[1].split(',').map(Number); return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1]; }
  return [128, 128, 128, 1];
}
function mixStyle(a, b, t) {
  const A = parseCol(a), B = parseCol(b);
  return 'rgba(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ',' + (A[3] + (B[3] - A[3]) * t) + ')';
}

/** 把记录下来的绘图调用光栅化成 RW×RH 的 RGB + 覆盖计数。 */
function raster(ops, opts) {
  opts = opts || {};
  const buf = new Float32Array(RW * RH * 3);
  const cover = new Uint16Array(RW * RH);
  const clipOn = opts.noClip ? null : true;

  for (const op of ops) {
    if (op.kind === 'image' || op.kind === 'clear') continue;
    const clip = op.clip && clipOn ? [op.clip[0] * SX, op.clip[1] * SY, op.clip[2] * SX, op.clip[3] * SY] : null;
    for (const poly of op.polys) {
      const pts = poly.map(p => [p[0] * SX, p[1] * SY]);
      if (op.kind === 'stroke') strokePoly(pts, op, buf, cover, clip);
      else if (op.kind === 'text') fillPoly(pts, op, buf, cover, clip);
      else fillPoly(pts, op, buf, cover, clip);
    }
  }
  return { rgb: buf, cover: cover };
}

function bounds(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1];
}

function fillPoly(pts, op, buf, cover, clip) {
  if (pts.length < 3) return;
  let b = bounds(pts);
  if (clip) b = [Math.max(b[0], clip[0]), Math.max(b[1], clip[1]), Math.min(b[2], clip[2]), Math.min(b[3], clip[3])];
  const y0 = Math.max(0, Math.floor(b[1])), y1 = Math.min(RH - 1, Math.ceil(b[3]));
  if (y1 < y0) return;
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length];
      if ((a[1] <= cy && c[1] > cy) || (c[1] <= cy && a[1] > cy)) {
        xs.push(a[0] + (cy - a[1]) / (c[1] - a[1]) * (c[0] - a[0]));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(RW - 1, Math.floor(xs[k + 1] - 0.5));
      if (clip) { xa = Math.max(xa, Math.ceil(clip[0] - 0.5)); xb = Math.min(xb, Math.floor(clip[2] - 0.5)); }
      for (let x = xa; x <= xb; x++) paint(buf, cover, x, y, colourOf(op.colour, (x + 0.5) / SX, cy / SY, STAGE_W, STAGE_H), op.alpha);
    }
  }
}

function strokePoly(pts, op, buf, cover, clip) {
  const r = Math.max(0.55, (op.lw || 1) * 0.5 * ((RW / 1600 + RH / 900) / 2));
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(L / (r * 0.8)));
    for (let s = 0; s <= steps; s++) {
      const x = a[0] + (b[0] - a[0]) * s / steps, y = a[1] + (b[1] - a[1]) * s / steps;
      disc(x, y, r, op, buf, cover, clip);
    }
  }
}

function disc(cx, cy, r, op, buf, cover, clip) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(RW - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(RH - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (clip && (x < clip[0] - 1 || x > clip[2] + 1 || y < clip[1] - 1 || y > clip[3] + 1)) continue;
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) paint(buf, cover, x, y, colourOf(op.colour, (x + 0.5) / SX, (y + 0.5) / SY, STAGE_W, STAGE_H), op.alpha);
  }
}

function paint(buf, cover, x, y, css, alpha) {
  const c = parseCol(css);
  const a = alpha * c[3];
  if (!isFinite(a) || !isFinite(c[0]) || !isFinite(c[1]) || !isFinite(c[2])) { cover[y * RW + x]++; return; }
  const i = (y * RW + x) * 3;
  buf[i] += (c[0] - buf[i]) * a;
  buf[i + 1] += (c[1] - buf[i + 1]) * a;
  buf[i + 2] += (c[2] - buf[i + 2]) * a;
  cover[y * RW + x]++;
}

/* ------------------------------------------------------------------ 运行台 */

function fakeElement(id) {
  const el = {
    id: id, style: {}, children: [], className: '', innerHTML: '', textContent: '', value: '0',
    min: 0, max: 0, step: 1, title: '', dataset: {}, offsetWidth: 1600, offsetHeight: 900,
    clientWidth: 1600, clientHeight: 842,
    addEventListener: function () { }, removeEventListener: function () { },
    appendChild: function (c) { this.children.push(c); }, removeChild: function () { },
    getContext: function () { return null; },
    classList: { add: function () { }, remove: function () { }, toggle: function () { } },
    focus: function () { }, blur: function () { }
  };
  return el;
}

function boot(opts) {
  opts = opts || {};
  const els = {};
  const listeners = {};
  const doc = {
    readyState: 'complete',
    activeElement: null,
    fullscreenElement: null,
    documentElement: fakeElement('html'),
    title: '',
    addEventListener: function (k, f) { (listeners[k] = listeners[k] || []).push(f); },
    removeEventListener: function () { },
    createElement: function (tag) {
      const el = fakeElement(tag);
      if (tag === 'canvas') el.getContext = function () { return new Context(1600, 900); };
      return el;
    },
    createDocumentFragment: function () { return fakeElement('fragment'); },
    getElementById: function (id) { return els[id] || null; },
    querySelector: function () { return null; },
    exitFullscreen: function () { }
  };
  const IDS = ['stage', 'bar', 'play', 'replay', 'seek', 'time', 'vol', 'off', 'offlabel', 'offreset', 'fs', 'hide', 'dbg', 'status', 'stats', 'banner', 'debug', 'start', 'ticks', 'playhead', 'lrc-source', 'stagewrap'];
  for (const id of IDS) els[id] = fakeElement(id);
  // 把 index.html 里内嵌的 LRC 交给 50_lrc.js 的自检（运行时它就是从这里读的）
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const m = /<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
    if (m) els['lrc-source'].textContent = m[1];
  } catch (e) { }
  let singleton = opts.ctx || null;
  els.stage.getContext = function () { if (!singleton) singleton = new Context(1600, 900); return singleton; };

  const win = {
    innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
    location: { search: '' },
    document: doc,
    matchMedia: function () { return { matches: false }; },
    requestAnimationFrame: function (f) { win.__raf = f; return 1; },
    cancelAnimationFrame: function () { },
    addEventListener: function (k, f) { (listeners[k] = listeners[k] || []).push(f); },
    removeEventListener: function () { },
    performance: { now: function () { return Date.now(); } },
    // vm 沙箱里没有 atob/Buffer，给 05_mv.js 的 base64 解码用
    atob: function (b64) { return Buffer.from(b64, 'base64').toString('binary'); },
    console: opts.quiet ? { log: function () { }, warn: function () { }, info: function () { }, error: console.error } : console,
    _listeners: listeners,
    _els: els
  };
  win.window = win;
  win.globalThis = win;

  // 假的 Audio：默认全部加载失败 —— 顺便验证"音频缺失也能播"的降级路径
  class FakeAudio {
    constructor() {
      this.listeners = {};
      this.duration = NaN;
      this.currentTime = 0;
      this.volume = 1;
      this.error = { code: 4 };
      const self = this;
      Object.defineProperty(this, 'src', {
        get() { return self._src; },
        set(v) {
          self._src = v;
          // 同步触发失败：让降级路径在一次 tick 内走完，便于无头检查
          (self.listeners.error || []).forEach(f => f({}));
        }
      });
    }
    addEventListener(k, f) { (this.listeners[k] = this.listeners[k] || []).push(f); }
    play() { return Promise.resolve(); }
    pause() { }
    load() { }
  }
  win.Audio = opts.Audio || FakeAudio;

  const vm = require('vm');
  const ctxVm = vm.createContext(win);
  const FILES = ['00_core', '05_mv', '06_mv-text', '07_gauge', '08_vectors', '10_draw', '09_photos', '12_svg', '15_sceneapi', '01_world', '20_lyrics', '30_world_layer',
    '40_scenes_a', '41_scenes_b', '42_scenes_c', '43_scenes_svg', '50_lrc', '60_app'];
  const loaded = [];
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(ROOT, 'src', f + '.js'), 'utf8');
    vm.runInContext(code, ctxVm, { filename: 'src/' + f + '.js' });
    loaded.push(f);
  }
  win.__loaded = loaded;
  return win;
}

/* --------------------------------------------------------- 画面：一次渲染 */

function makeRenderer(WX, ctx) {
  const D = WX.D, S = WX.S, WL = WX.WL, WORLD = WX.WORLD;
  function frame(t, withScene) {
    ctx.ops.length = 0;
    const w = WORLD.at(t);
    D.begin(); D.setBg(w.bg);
    WL.under(t, w);
    const sceneStart = ctx.ops.length;
    let idx = S.cueIndexAt(t);
    if (withScene) idx = S.render(t);
    const sceneEnd = ctx.ops.length;
    WL.over(t, w, '');
    const ops = ctx.ops.slice();
    return { ops: ops, sceneOps: ops.slice(sceneStart, sceneEnd), idx: idx, w: w, stats: D.S, t: t };
  }
  return { frame: frame };
}

function signature(ops) {
  let h = 2166136261 >>> 0, n = 0;
  for (const op of ops) {
    if (op.kind === 'image') continue;
    const parts = [op.kind, op.polys.length];
    for (const p of op.polys) for (const q of p) { parts.push(Math.round(q[0] * 4), Math.round(q[1] * 4)); }
    parts.push(String(op.colour), Math.round(op.alpha * 100), Math.round(op.lw * 10));
    const s = parts.join(',');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    n++;
  }
  return (h >>> 0).toString(16) + '-' + n;
}

function ink(r, x, y) { const i = ((y | 0) * RW + (x | 0)) * 3; return r.rgb[i] + r.rgb[i + 1] + r.rgb[i + 2]; }

/** 两次光栅结果里"变了多少格"（0..1）。画板有没有真的画出来，就看这个。 */
function diffCells(a, b, thresh) {
  thresh = thresh === undefined ? 12 : thresh;
  let n = 0;
  for (let i = 0; i < RW * RH; i++) {
    const j = i * 3;
    if (Math.abs(a.rgb[j] - b.rgb[j]) + Math.abs(a.rgb[j + 1] - b.rgb[j + 1]) + Math.abs(a.rgb[j + 2] - b.rgb[j + 2]) > thresh) n++;
  }
  return n / (RW * RH);
}

/** 画面非空比例（亮度超过阈值）。 */
function litFraction(r, thresh) {
  thresh = thresh === undefined ? 14 : thresh;
  let n = 0;
  for (let i = 0; i < RW * RH; i++) {
    const j = i * 3;
    if (r.rgb[j] + r.rgb[j + 1] + r.rgb[j + 2] > thresh * 3) n++;
  }
  return n / (RW * RH);
}

/** 把光栅结果写成 PNG（最小实现：zlib + 手写 IHDR/IDAT/IEND）。 */
function writePng(file, r, scale) {
  const zlib = require('zlib');
  const w = RW, h = RH;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) raw[y * (w * 3 + 1) + 1 + x * 3 + c] = Math.max(0, Math.min(255, Math.round(r.rgb[i + c])));
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
  return png.length;
}
let CRC_T = null;
function crc32(buf) {
  if (!CRC_T) {
    CRC_T = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

module.exports = {
  ROOT, RW, RH, boot, Context, raster, makeRenderer, signature, diffCells, litFraction, writePng, ink,
  frameFiles: ['00_core', '05_mv', '06_mv-text', '07_gauge', '08_vectors', '10_draw', '12_svg', '15_sceneapi', '01_world', '20_lyrics', '30_world_layer', '40_scenes_a', '41_scenes_b', '42_scenes_c', '43_scenes_svg', '50_lrc', '60_app']
};
