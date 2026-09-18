/* ============================================================================
 * 10_draw.js — 矢量绘图内核
 * ----------------------------------------------------------------------------
 * 舞台是 1600×900 的虚拟坐标系，画布再等比缩放到窗口（支持 HiDPI）。
 * 所有画板都用这里的 API 作画；内核自己维护变换矩阵，
 * 于是每画一个图元都能被记账（primitive 数 / 覆盖面积 / 文字颜色）——
 * 覆盖率验证才能验证"真的画出来了"，而不只是"注册过了"。
 *
 * 文字一律经过 EM.readable()：先抬 alpha，再（必要时）向白混一点点，
 * 保证在任意世界底色上对比度不低于 minRatio。装饰线条不走这条路。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM;
  var W = WX.W, H = WX.H;

  var D = WX.D = {
    W: W, H: H, U: 1,
    ctx: null,
    m: [1, 0, 0, 1, 0, 0],          // 舞台变换
    base: [1, 0, 0, 1, 0, 0],       // 适配窗口的基准变换
    stack: [],
    alpha: 1,
    bg: [6, 9, 14],                 // 当前底色估计（文字对比度用）
    strokeW: 1.5,
    S: null                         // 本帧统计
  };

  /* ------------------------------------------------------------------ 生命周期 */

  D.newStats = function () {
    return { calls: 0, ink: 0, textInk: 0, texts: [], bbox: null, colours: {}, labels: {} };
  };

  D.bind = function (ctx) { D.ctx = ctx; D.S = D.newStats(); };

  D.setBase = function (sx, sy, ox, oy) { D.base = [sx, 0, 0, sy, ox, oy]; };

  D.begin = function () {
    D.m = [1, 0, 0, 1, 0, 0];
    D.stack.length = 0;
    D.alpha = 1;
    D.S = D.newStats();
    if (D.ctx) { D.ctx.setTransform.apply(D.ctx, D.apply()); D.ctx.globalAlpha = 1; D.ctx.lineJoin = 'round'; D.ctx.lineCap = 'round'; }
  };

  /** 舞台矩阵 × 基准矩阵。 */
  D.apply = function () {
    var m = D.m, b = D.base;
    return [b[0] * m[0], b[1] * m[1], b[2] * m[2], b[3] * m[3], b[0] * m[4] + b[4], b[1] * m[5] + b[5]];
  };
  D.sync = function () { if (D.ctx) D.ctx.setTransform.apply(D.ctx, D.apply()); };

  /** 把一个舞台坐标点映射到屏幕（只用于统计/校验）。 */
  D.tp = function (x, y) {
    var m = D.m;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  };

  /* ------------------------------------------------------------------- 变换 */

  D.save = function () {
    D.stack.push({ m: D.m.slice(), a: D.alpha, w: D.strokeW });
    if (D.ctx) D.ctx.save();
  };
  D.restore = function () {
    var s = D.stack.pop();
    if (!s) return;
    D.m = s.m; D.alpha = s.a; D.strokeW = s.w;
    if (D.ctx) { D.ctx.restore(); D.sync(); D.ctx.globalAlpha = D.alpha; }
  };
  D.translate = function (x, y) {
    var m = D.m;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
    if (D.ctx) D.ctx.translate(x, y);
  };
  D.rotate = function (a) {
    var m = D.m, c = Math.cos(a), s = Math.sin(a);
    var a0 = m[0] * c + m[2] * s, b0 = m[1] * c + m[3] * s;
    var c0 = m[0] * -s + m[2] * c, d0 = m[1] * -s + m[3] * c;
    m[0] = a0; m[1] = b0; m[2] = c0; m[3] = d0;
    if (D.ctx) D.ctx.rotate(a);
  };
  D.scale = function (sx, sy) {
    var m = D.m; sy = sy === undefined ? sx : sy;
    m[0] *= sx; m[1] *= sx; m[2] *= sy; m[3] *= sy;
    if (D.ctx) D.ctx.scale(sx, sy);
  };
  /** translate(x,y) + rotate(a) 的简写；cx/cy 为可选的自转中心。 */
  D.at = function (x, y, a, s) {
    D.translate(x, y);
    if (a) D.rotate(a);
    if (s !== undefined) D.scale(s);
  };

  /* ------------------------------------------------------------------- 样式 */

  D.a = function (v) { D.alpha = EM.clamp(v, 0, 1); if (D.ctx) D.ctx.globalAlpha = D.alpha; return D; };
  D.am = function (v) { return D.a(D.alpha * v); };
  D.w = function (v) { D.strokeW = v; if (D.ctx) D.ctx.lineWidth = v; return D; };
  D.bgIs = function (c) { D.bg = c; return D; };
  D.dash = function (arr) { if (D.ctx) D.ctx.setLineDash(arr || []); return D; };

  D.linear = function (x0, y0, x1, y1, stops) {
    if (!D.ctx) return EM.css(stops[stops.length - 1][1]);
    var g = D.ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], EM.css(stops[i][1]));
    return g;
  };
  D.radial = function (x, y, r0, r1, stops) {
    if (!D.ctx) return EM.css(stops[stops.length - 1][1]);
    var g = D.ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], EM.css(stops[i][1]));
    return g;
  };

  /* ------------------------------------------------------------------- 记账 */

  function track(pts, ink, kind) {
    var S = D.S;
    if (!S) return;
    S.calls++;
    if (kind) S.labels[kind] = (S.labels[kind] || 0) + 1;
    var i, p, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (i = 0; i < pts.length; i++) {
      p = D.tp(pts[i][0], pts[i][1]);
      if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
      if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
    }
    if (!S.bbox) S.bbox = [minx, miny, maxx, maxy];
    else {
      S.bbox[0] = Math.min(S.bbox[0], minx); S.bbox[1] = Math.min(S.bbox[1], miny);
      S.bbox[2] = Math.max(S.bbox[2], maxx); S.bbox[3] = Math.max(S.bbox[3], maxy);
    }
    S.ink += (ink || 0) * D.alpha;
  }

  /** 多边形面积（鞋带公式，舞台坐标）。 */
  function areaOf(pts) {
    var a = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return Math.abs(a) / 2;
  }

  /* --------------------------------------------------------------- 路径工具 */

  function build(pts, close) {
    var c = D.ctx, i;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (close) c.closePath();
  }

  /* ----------------------------------------------------------------- 图元 */

  /** 实心多边形。 */
  D.poly = function (pts, colour) {
    if (!pts || pts.length < 3) return;
    track(pts, areaOf(pts), 'poly');
    if (!D.ctx) return;
    build(pts, true);
    D.ctx.fillStyle = EM.css(colour); D.ctx.fill();
  };

  /** 折线 / 闭合线框。 */
  D.line = function (pts, colour, w, close) {
    if (!pts || pts.length < 2) return;
    var i, len = 0;
    for (i = 1; i < pts.length; i++) len += EM.dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    if (close) len += EM.dist(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
    track(pts, len * (w || D.strokeW), 'line');
    if (!D.ctx) return;
    build(pts, close);
    D.ctx.lineWidth = w || D.strokeW;
    D.ctx.strokeStyle = EM.css(colour);
    D.ctx.stroke();
  };

  /** 单段直线。 */
  D.seg = function (x1, y1, x2, y2, colour, w) { D.line([[x1, y1], [x2, y2]], colour, w); };

  D.rect = function (x, y, w, h, colour, sw) {
    if (sw) {
      D.line([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], colour, sw, true);
    } else {
      D.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], colour);
    }
  };

  D.rrect = function (x, y, w, h, r, colour, sw) {
    var pts = [], i, a;
    var cx = [x + r, x + w - r, x + w - r, x + r], cy = [y + r, y + r, y + h - r, y + h - r];
    var a0 = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5];
    for (var q = 0; q < 4; q++) for (i = 0; i <= 4; i++) {
      a = a0[q] + (Math.PI / 2) * (i / 4);
      pts.push([cx[q] + Math.cos(a) * r, cy[q] + Math.sin(a) * r]);
    }
    if (sw) D.line(pts, colour, sw, true); else D.poly(pts, colour);
  };

  D.circle = function (x, y, r, colour, sw) {
    var pts = [], i, n = 28;
    for (i = 0; i < n; i++) pts.push([x + Math.cos(i / n * EM.TAU) * r, y + Math.sin(i / n * EM.TAU) * r]);
    if (sw) D.line(pts, colour, sw, true); else D.poly(pts, colour);
  };

  /** 圆弧（描边）。 */
  D.arc = function (x, y, r, a0, a1, colour, sw) {
    var pts = [], n = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 0.25)), i;
    for (i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * (i / n); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    D.line(pts, colour, sw);
  };

  /** 环形（描边的圆）。 */
  D.ring = function (x, y, r, colour, sw) { D.circle(x, y, r, colour, sw || D.strokeW); };

  /** Catmull-Rom 平滑曲线：给一串点，画一条穿过它们的曲线。 */
  D.curve = function (pts, colour, w, close) {
    if (pts.length < 2) return;
    var i, len = 0;
    for (i = 1; i < pts.length; i++) len += EM.dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    track(pts, len * 1.15 * (w || D.strokeW), 'curve');
    if (!D.ctx) return;
    var c = D.ctx, n = pts.length;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (i = 0; i < n - 1; i++) {
      var p0 = pts[i > 0 ? i - 1 : 0], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i < n - 2 ? i + 2 : n - 1];
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    c.lineWidth = w || D.strokeW; c.strokeStyle = EM.css(colour); c.stroke();
  };

  /** 函数曲线：y = f(x) 采样。 */
  D.fn = function (x0, x1, f, colour, w, steps) {
    steps = steps || 48;
    var pts = [], i;
    for (i = 0; i <= steps; i++) { var x = x0 + (x1 - x0) * i / steps; pts.push([x, f(x)]); }
    D.curve(pts, colour, w);
    return pts;
  };

  /** 正弦波。 */
  D.wave = function (x0, x1, y, amp, freq, phase, colour, w, steps) {
    steps = steps || 64;
    var pts = [], i;
    for (i = 0; i <= steps; i++) {
      var x = x0 + (x1 - x0) * i / steps;
      pts.push([x, y + Math.sin((i / steps) * freq * EM.TAU + phase) * amp]);
    }
    D.curve(pts, colour, w);
    return pts;
  };

  D.grid = function (x, y, w, h, nx, ny, colour, sw) {
    var i;
    for (i = 0; i <= nx; i++) D.seg(x + w * i / nx, y, x + w * i / nx, y + h, colour, sw);
    for (i = 0; i <= ny; i++) D.seg(x, y + h * i / ny, x + w, y + h * i / ny, colour, sw);
  };

  /** 虚线（自己画，避免 setLineDash 在工具里还要模拟）。 */
  D.dashed = function (x1, y1, x2, y2, colour, w, dash, gap) {
    dash = dash || 10; gap = gap === undefined ? 8 : gap;
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    var ux = dx / len, uy = dy / len, pos = 0;
    while (pos < len) {
      var e = Math.min(len, pos + dash);
      D.seg(x1 + ux * pos, y1 + uy * pos, x1 + ux * e, y1 + uy * e, colour, w);
      pos = e + gap;
    }
  };

  /** 小刻度（机械感的关键零件）。 */
  D.ticks = function (x, y, len, n, colour, w, every, longLen) {
    for (var i = 0; i < n; i++) {
      var big = every && i % every === 0;
      var l = big ? (longLen || len * 2) : len;
      D.seg(x, y + i * (len * 2.2), x + l, y + i * (len * 2.2), colour, big ? w * 1.6 : w);
    }
  };

  /** 粒子/星点：位置由 (seed,t) 决定，纯函数。 */
  D.sparks = function (x, y, r, n, colour, seed, t, size) {
    for (var i = 0; i < n; i++) {
      var a = EM.h(i, seed, 1) * EM.TAU;
      var rr = r * (0.25 + 0.75 * EM.h(i, seed, 2));
      var sp = 0.4 + EM.h(i, seed, 3) * 1.6;
      var ph = (EM.h(i, seed, 4) * 6 + t * sp) % 1;
      var d = rr * (1 - ph) * (0.6 + 0.4 * EM.h(i, seed, 5));
      var s = (size || 2) * (0.4 + 0.6 * (1 - ph));
      D.circle(x + Math.cos(a + ph * 2) * d, y + Math.sin(a + ph * 2) * d, s, colour);
    }
  };

  /** 十字准星。 */
  D.cross = function (x, y, r, colour, w) {
    D.seg(x - r, y, x - r * 0.25, y, colour, w); D.seg(x + r * 0.25, y, x + r, y, colour, w);
    D.seg(x, y - r, x, y - r * 0.25, colour, w); D.seg(x, y + r * 0.25, x, y + r, colour, w);
  };

  /** 角括号（HUD 感）。 */
  D.bracket = function (x, y, w, h, len, colour, sw) {
    D.seg(x, y, x + len, y, colour, sw); D.seg(x, y, x, y + len, colour, sw);
    D.seg(x + w - len, y, x + w, y, colour, sw); D.seg(x + w, y, x + w, y + len, colour, sw);
    D.seg(x, y + h - len, x, y + h, colour, sw); D.seg(x, y + h, x + len, y + h, colour, sw);
    D.seg(x + w - len, y + h, x + w, y + h, colour, sw); D.seg(x + w, y + h - len, x + w, y + h, colour, sw);
  };

  /* ------------------------------------------------------------------- 文字 */

  D.measure = function (s, size, mono) {
    if (D.ctx && D.ctx.measureText) {
      D.ctx.font = (mono ? '' : '') + size + 'px ' + (mono ? 'ui-monospace,Consolas,monospace' : 'Inter,system-ui,sans-serif');
      return D.ctx.measureText(s).width;
    }
    return s.length * size * (mono ? 0.6 : 0.56);
  };

  /**
   * 画文字。opts: { align, baseline, weight, mono, tracking, minRatio, alpha, ink }
   * 颜色先过 EM.readable()，再乘上当前 alpha，保证"读得清"这条底线。
   */
  D.text = function (s, x, y, size, colour, opts) {
    opts = opts || {};
    s = String(s);
    var minRatio = opts.minRatio === undefined ? 4.5 : opts.minRatio;
    var base = opts.alpha === undefined ? 1 : opts.alpha;
    var bg = opts.bg ? EM.parse(opts.bg) : D.bg;      // 局部背景（比如白底弹窗上的深色字）
    var col = EM.readable(colour, bg, minRatio, base);
    var alpha = col[3] * D.alpha;
    if (D.S) {
      D.S.texts.push({ s: s, colour: [col[0], col[1], col[2]], alpha: col[3], bg: bg.slice(0, 3), ratio: EM.contrast(EM.over([col[0], col[1], col[2], col[3]], bg), bg) });
      D.S.textInk += size * size * 0.42 * s.length * D.alpha;
    }
    var wdt = D.measure(s, size, opts.mono);
    var tx = opts.align === 'center' ? x - wdt / 2 : (opts.align === 'right' ? x - wdt : x);
    var ty = opts.baseline === 'middle' ? y + size * 0.35 : (opts.baseline === 'top' ? y + size * 0.8 : y);
    track([[tx, ty - size * 0.8], [tx + wdt, ty + size * 0.2]], size * size * 0.42 * s.length, 'text');
    if (!D.ctx) return;
    D.ctx.globalAlpha = alpha;
    D.ctx.font = (opts.weight ? opts.weight + ' ' : '') + size + 'px ' + (opts.mono
      ? 'ui-monospace,Consolas,"Courier New",monospace'
      : 'Inter,"Segoe UI",system-ui,-apple-system,sans-serif');
    D.ctx.fillStyle = EM.css([col[0], col[1], col[2], 1]);
    D.ctx.textAlign = opts.align === 'center' ? 'center' : (opts.align === 'right' ? 'right' : 'left');
    D.ctx.textBaseline = opts.baseline === 'middle' ? 'middle' : (opts.baseline === 'top' ? 'top' : 'alphabetic');
    D.ctx.fillText(s, x, y);
    D.ctx.globalAlpha = D.alpha;
  };

  /** 等宽小字，机器感的基础零件。 */
  D.mono = function (s, x, y, size, colour, opts) {
    opts = opts || {}; opts.mono = true;
    D.text(s, x, y, size === undefined ? 13 : size, colour, opts);
  };

  /* ------------------------------------------------------------------- 裁剪 */

  /** 只支持轴对齐矩形裁剪（工具也能精确复现）。 */
  D.clipRect = function (x, y, w, h) {
    if (!D.ctx) return;
    D.ctx.beginPath(); D.ctx.rect(x, y, w, h); D.ctx.clip();
  };

  /** 底色估计：世界层每帧调用一次，文字对比度据此计算。 */
  D.setBg = function (c) { D.bg = EM.parse(c); };

})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
 * 10b — 母题（motifs）：131 块画板共用的一套"零件"
 * ----------------------------------------------------------------------------
 * 全部是纯函数：给定参数就画，不看任何外部状态。
 * 画板因此可以短、可以专注在"这一句该怎么表达"上。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D;
  var W = WX.W, H = WX.H;
  var M = D.m = {};
  var TAU = EM.TAU;

  /** 逐句文字：随时间一个字一个字亮起来（p = 本句进度）。 */
  M.lyric = function (text, x, y, size, colour, p, opts) {
    opts = opts || {};
    if (text === undefined || text === null || text === '') return;
    var n = text.length;
    var rev = opts.instant ? 1 : EM.clamp((p - (opts.delay || 0)) / (opts.span || 0.55), 0, 1);
    var shown = Math.max(1, Math.round(n * rev));
    if (opts.align === 'center' || opts.align === 'right') {
      D.text(text, x, y, size, colour, opts);
      if (shown < n && !opts.instant) {
        var wdt = D.measure(text, size, opts.mono);
        var hx = opts.align === 'center' ? x + wdt / 2 : x;
        var seen = D.measure(text.slice(0, shown), size, opts.mono);
        var cx = opts.align === 'center' ? x - wdt / 2 + seen : x - wdt + seen;
        D.rect(cx + 2, y - size * 0.62, size * 0.52, size * 0.78, EM.withA(colour, (Math.sin(performance.now() / 240) > 0 ? 1 : 0.15)));
        // 用一块底色把已显示部分之后盖掉：不可行（背景非纯色），改为整句淡出重绘
        D.rect(hx - wdt, y - size * 0.62, wdt, size * 0.78, [0, 0, 0, 0.001]);
      }
      return;
    }
    var t2 = text.slice(0, shown);
    D.text(t2, x, y, size, colour, opts);
    if (!opts.instant && shown < n) {
      var cx2 = x + D.measure(t2, size, opts.mono) + 3;
      D.rect(cx2, y - size * 0.66, size * 0.55, size * 0.8, EM.withA(colour, 0.9));
    }
  };

  /** 大标题字：可选描边、可选字距（用逐字定位实现）。 */
  M.head = function (text, x, y, size, colour, opts) {
    opts = opts || {};
    if (opts.track) {
      var wt = 0, i, tw = D.measure(text, size, opts.mono) + opts.track * (text.length - 1);
      var sx = opts.align === 'center' ? x - tw / 2 : (opts.align === 'right' ? x - tw : x);
      // 逐字绘制时强制左对齐：否则 align:'center' 会让每个字符按自身宽度重新居中，
      // 造成字母间距粗细不等。
      var o = {};
      for (var k in opts) if (k !== 'align' && k !== 'track') o[k] = opts[k];
      for (i = 0; i < text.length; i++) {
        var ch = text[i];
        D.text(ch, sx + wt, y, size, colour, o);
        wt += D.measure(ch, size, opts.mono) + opts.track;
      }
      return;
    }
    D.text(text, x, y, size, colour, opts);
  };

  /** 故障重影：同一行字画三遍，红/青分离 + 随机错位。 */
  M.glitch = function (text, x, y, size, colour, t, amt, opts) {
    opts = opts || {};
    amt = amt === undefined ? 1 : amt;
    var i, j;
    for (i = 0; i < 3; i++) {
      var dx = (EM.h(i, 3, (t * 12) | 0) - 0.5) * 16 * amt;
      var dy = (EM.h(i, 7, (t * 12) | 0) - 0.5) * 5 * amt;
      var mvOn = !!(WX.MV && WX.MV.ON);
      var col = i === 0 ? EM.withA(mvOn ? [255, 255, 255] : [255, 70, 90], 0.5)
        : (i === 1 ? EM.withA(mvOn ? [200, 200, 200] : [80, 230, 255], 0.5) : colour);
      D.save();
      D.translate(dx, dy);
      D.text(text, x, y, size, col, opts);
      D.restore();
    }
    // 横向切片错位
    if (amt > 0.4) {
      for (j = 0; j < 5; j++) {
        var yy = y - size * 0.7 + EM.h(j, 11, (t * 9) | 0) * size * 0.9;
        var ww = size * 0.9 * (2 + EM.h(j, 13, (t * 9) | 0) * 4);
        var xx = x + (EM.h(j, 17, (t * 9) | 0) - 0.5) * 120;
        D.rect(xx, yy, ww, size * 0.09, EM.withA(colour, 0.5));
      }
    }
  };

  /** 机器 UI 面板：一个窗口 + 左上角标签 + 角标。 */
  M.panel = function (x, y, w, h, label, colour, opts) {
    opts = opts || {};
    var a = opts.a === undefined ? 1 : opts.a;
    D.rect(x, y, w, h, EM.withA(colour, 0.035 * a));
    D.rect(x, y, w, h, EM.withA(colour, 0.34 * a), 1.2);
    D.seg(x, y + 22, x + w, y + 22, EM.withA(colour, 0.22 * a), 1);
    D.mono(label, x + 8, y + 15, 12, EM.withA(colour, 0.8 * a));
    D.bracket(x - 3, y - 3, w + 6, h + 6, 14, EM.withA(colour, 0.18 * a), 1);
  };

  /** 判断菱形。 */
  M.diamond = function (x, y, r, colour, sw, opts) {
    opts = opts || {};
    var pts = [[x, y - r], [x + r * 1.35, y], [x, y + r], [x - r * 1.35, y]];
    if (sw) D.line(pts, colour, sw, true); else D.poly(pts, colour);
    return pts;
  };

  /** 箭头。 */
  M.arrow = function (x1, y1, x2, y2, colour, sw, head) {
    head = head === undefined ? 11 : head;
    D.seg(x1, y1, x2, y2, colour, sw);
    var a = Math.atan2(y2 - y1, x2 - x1);
    D.line([[x2, y2], [x2 - Math.cos(a - 0.4) * head, y2 - Math.sin(a - 0.4) * head]], colour, sw);
    D.line([[x2, y2], [x2 - Math.cos(a + 0.4) * head, y2 - Math.sin(a + 0.4) * head]], colour, sw);
  };

  /** 印章：粗框 + 大字 + 倾斜。 */
  M.stamp = function (x, y, w, h, text, colour, rot, size) {
    D.save();
    D.translate(x, y); D.rotate(rot || 0);
    D.rect(-w / 2, -h / 2, w, h, EM.withA(colour, 0.22));
    D.rect(-w / 2, -h / 2, w, h, colour, 4);
    D.rect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, EM.withA(colour, 0.7), 1.6);
    D.text(text, 0, h * 0.13, size || 46, colour, { align: 'center', weight: 'bold' });
    D.restore();
  };

  /** 计数刻痕（每 5 条划一道）。 */
  M.tally = function (x, y, n, colour, scale, sw) {
    scale = scale || 1;
    for (var i = 0; i < n; i++) {
      var g = Math.floor(i / 5), k = i % 5;
      if (k === 0 && i > 0) {
        D.seg(x + g * 26 * scale - 22 * scale, y, x + g * 26 * scale + 4 * scale, y, colour, (sw || 2) * 1.4);
      } else {
        var xx = x + g * 26 * scale + k * 5 * scale;
        D.seg(xx, y, xx - 5 * scale, y + 18 * scale, colour, sw || 2);
      }
    }
  };

  /** 齿轮。 */
  M.gear = function (x, y, r, teeth, colour, rot, sw) {
    var pts = [], i;
    for (i = 0; i < teeth * 2; i++) {
      var a = rot + i / (teeth * 2) * TAU;
      var rr = i % 2 === 0 ? r : r * 0.82;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    D.line(pts, colour, sw || 2, true);
    D.circle(x, y, r * 0.3, colour, sw || 2);
    D.circle(x, y, r * 0.13, colour);
  };

  /** 活塞：上下往复。 */
  M.piston = function (x, y, w, h, phase, colour, sw) {
    var k = (Math.sin(phase) + 1) / 2;
    D.rect(x - w / 2, y - h, w, h * 0.42, EM.withA(colour, 0.25));
    D.rect(x - w / 2, y - h, w, h * 0.42, colour, sw || 2);
    var rodY = y - h * 0.58 - k * h * 0.3;
    D.seg(x, y - h * 0.42, x, rodY, colour, 3);
    D.circle(x, rodY, w * 0.16, colour, sw || 2);
    D.seg(x, y, x, y - h * 0.42, EM.withA(colour, 0.4), 1.4);
    return k;
  };

  /** 眼睛：open 0..1。 */
  M.eye = function (x, y, r, open, colour, sw) {
    open = EM.clamp(open, 0, 1);
    var pts = [], i;
    for (i = 0; i <= 16; i++) { var a = Math.PI + i / 16 * Math.PI; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * open]); }
    for (i = 16; i >= 0; i--) { var b = i / 16 * Math.PI; pts.push([x + Math.cos(b) * r, y - Math.sin(b) * r * open]); }
    D.line(pts, colour, sw || 2, true);
    if (open > 0.15) D.circle(x, y, r * 0.26 * open, colour);
    else D.seg(x - r, y, x + r, y, EM.withA(colour, 0.6), sw || 2);
  };

  /** 心形（broken = 裂缝）。 */
  M.heart = function (x, y, s, colour, broken, sw) {
    var pts = [], i;
    for (i = 0; i <= 48; i++) {
      var t = i / 48 * TAU;
      var px = 16 * Math.pow(Math.sin(t), 3);
      var py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([x + px * s / 16, y + py * s / 16]);
    }
    D.line(pts, colour, sw || 2.4, true);
    if (broken) {
      D.line([[x - 2, y - s * 0.55], [x + 6, y - s * 0.1], [x - 8, y + s * 0.12], [x + 3, y + s * 0.62]], EM.withA([0, 0, 0], 1), 3.4);
      D.line([[x - 2, y - s * 0.55], [x + 6, y - s * 0.1], [x - 8, y + s * 0.12], [x + 3, y + s * 0.62]], colour, 1.2);
    }
  };

  /** 精细线稿手：手掌 + 四指 + 拇指 + 指节 + 掌纹。open: 0 收拢，1 张开。 */
  M.hand = function (x, y, s, colour, open, sw) {
    sw = sw || 2;
    var k = EM.clamp(open, 0, 1), j;
    function P(px, py) { return [x + px * s, y + py * s]; }
    function poly(pts, w) {
      var out = [], q;
      for (q = 0; q < pts.length; q++) out.push(P(pts[q][0], pts[q][1]));
      D.line(out, colour, w === undefined ? sw : w);
    }
    function smooth(pts, w) {
      var out = [], q;
      for (q = 0; q < pts.length; q++) out.push(P(pts[q][0], pts[q][1]));
      D.curve(out, colour, w === undefined ? sw : w);
    }
    // 一根手指：从指根向上，len 长、wid 宽、ang 张角、curl 每节弯曲
    function finger(bx, by, len, wid, ang, curl) {
      var seg = [0.44, 0.32, 0.24];
      var L = [], R = [], C = [], a = ang, cx = bx, cy = by;
      for (j = 0; j <= 3; j++) {
        var w = wid * (1 - j * 0.13);
        var pxn = Math.cos(a), pyn = Math.sin(a);
        L.push([cx - pxn * w * 0.5, cy - pyn * w * 0.5]);
        R.push([cx + pxn * w * 0.5, cy + pyn * w * 0.5]);
        C.push([cx, cy]);
        if (j < 3) {
          cx += Math.sin(a) * len * seg[j];
          cy += -Math.cos(a) * len * seg[j];
          a += curl;
        }
      }
      // 指尖半圆：从右侧绕到左侧
      var wTip = wid * (1 - 3 * 0.13) * 0.5;
      var dx = Math.sin(a), dy = -Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
      var tip = [];
      for (j = 0; j <= 6; j++) {
        var t = j / 6 * Math.PI;
        tip.push([C[3][0] + nx * wTip * Math.cos(t) + dx * wTip * Math.sin(t),
                  C[3][1] + ny * wTip * Math.cos(t) + dy * wTip * Math.sin(t)]);
      }
      var outline = L.slice();
      for (j = 1; j < tip.length; j++) outline.push(tip[j]);
      for (j = R.length - 1; j >= 0; j--) outline.push(R[j]);
      var outPts = [], q;
      for (q = 0; q < outline.length; q++) outPts.push(P(outline[q][0], outline[q][1]));
      D.line(outPts, colour, sw);
      for (j = 1; j <= 3; j++) {                       // 指节横纹
        D.line([P(L[j][0], L[j][1]), P(R[j][0], R[j][1])], colour, sw * 0.72);
      }
    }
    // 手掌：闭合曲线（首点重复一次收口）
    var palm = [[-0.58, 1.90], [-0.76, 1.35], [-0.86, 0.60], [-0.80, -0.10],
      [-0.56, -0.40], [-0.20, -0.52], [0.20, -0.52], [0.56, -0.40],
      [0.80, -0.10], [0.86, 0.60], [0.76, 1.35], [0.58, 1.90], [-0.58, 1.90]];
    smooth(palm, sw * 1.25);
    // 手腕
    poly([[-0.58, 1.90], [-0.70, 2.48], [-0.40, 2.58]], sw * 1.1);
    poly([[0.58, 1.90], [0.70, 2.48], [0.40, 2.58]], sw * 1.1);
    poly([[-0.70, 2.48], [0.70, 2.48]], sw * 0.85);
    poly([[-0.54, 2.18], [0.54, 2.18]], sw * 0.7);
    // 掌纹
    smooth([[-0.72, 1.22], [-0.58, 0.76], [-0.18, 0.42], [0.28, 0.32]], sw * 0.7);
    smooth([[-0.80, 0.70], [-0.52, 0.45], [0.05, 0.34], [0.54, 0.44]], sw * 0.7);
    smooth([[-0.58, 0.08], [-0.24, -0.04], [0.14, -0.02], [0.54, 0.14]], sw * 0.7);
    // 四指 + 拇指
    finger(-0.58, -0.30, 0.96, 0.30, -0.34 * k, 0.05 * (1 - k));
    finger(-0.20, -0.48, 1.28, 0.32, -0.13 * k, 0.05 * (1 - k));
    finger(0.20, -0.52, 1.50, 0.33, 0.03 * k, 0.05 * (1 - k));
    finger(0.58, -0.38, 1.22, 0.32, 0.18 * k, 0.05 * (1 - k));
    finger(-0.90, 0.78, 1.05, 0.42, -1.12 - 0.12 * k, 0.03 * (1 - k));
  };

  /** 人形剪影。variant: 'stand' | 'leaving' | 'reach' | 'run' | 'pray' */
  M.person = function (x, y, s, colour, variant, sw) {
    sw = sw || 2.6;
    variant = variant || 'stand';
    D.circle(x, y - 4.2 * s, 1.05 * s, colour, sw);
    if (variant === 'leaving') {
      D.line([[x, y - 3.1 * s], [x - 0.6 * s, y - 0.6 * s], [x - 1.6 * s, y + 1.6 * s]], colour, sw);
      D.line([[x - 0.6 * s, y - 0.6 * s], [x + 1.2 * s, y + 1.7 * s]], colour, sw);
      D.line([[x, y - 2.7 * s], [x - 1.6 * s, y - 1.6 * s]], colour, sw);
      D.line([[x, y - 2.7 * s], [x + 0.8 * s, y - 1.0 * s]], colour, sw);
    } else if (variant === 'reach') {
      D.line([[x, y - 3.1 * s], [x, y - 0.7 * s], [x - 1.0 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 0.7 * s], [x + 0.9 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 2.8 * s], [x + 2.6 * s, y - 3.6 * s]], colour, sw);
      D.line([[x, y - 2.6 * s], [x - 1.5 * s, y - 1.4 * s]], colour, sw);
    } else if (variant === 'run') {
      D.line([[x, y - 3.1 * s], [x + 0.3 * s, y - 0.7 * s], [x - 1.8 * s, y + 1.7 * s]], colour, sw);
      D.line([[x + 0.3 * s, y - 0.7 * s], [x + 2.0 * s, y + 1.4 * s]], colour, sw);
      D.line([[x, y - 2.8 * s], [x + 2.2 * s, y - 3.4 * s]], colour, sw);
      D.line([[x, y - 2.6 * s], [x - 2.0 * s, y - 3.0 * s]], colour, sw);
    } else if (variant === 'pray') {
      D.line([[x, y - 3.1 * s], [x, y - 0.7 * s], [x - 1.2 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 0.7 * s], [x + 1.2 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 2.6 * s], [x + 0.7 * s, y - 3.4 * s]], colour, sw);
      D.line([[x, y - 2.6 * s], [x - 0.7 * s, y - 3.4 * s]], colour, sw);
    } else {
      D.line([[x, y - 3.1 * s], [x, y - 0.6 * s], [x - 1.2 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 0.6 * s], [x + 1.2 * s, y + 1.8 * s]], colour, sw);
      D.line([[x, y - 2.7 * s], [x - 1.6 * s, y - 1.3 * s]], colour, sw);
      D.line([[x, y - 2.7 * s], [x + 1.6 * s, y - 1.3 * s]], colour, sw);
    }
  };

  M.silhouette = function (x, y, s, colour) {
    D.poly([[x - 1.5 * s, y + 4 * s], [x - 1.2 * s, y - 2 * s], [x - 0.7 * s, y - 3.4 * s], [x, y - 4.4 * s],
      [x + 0.7 * s, y - 3.4 * s], [x + 1.2 * s, y - 2 * s], [x + 1.5 * s, y + 4 * s]], colour);
  };

  /** 一扇亮着的窗。 */
  M.window = function (x, y, w, h, frame, glow, lit) {
    if (lit) {
      D.rect(x, y, w, h, EM.withA(glow, 0.9));
      D.circle(x + w / 2, y + h / 2, w * 1.5, EM.withA(glow, 0.09));
    } else {
      D.rect(x, y, w, h, EM.withA(frame, 0.12));
    }
    D.rect(x, y, w, h, frame, 3);
    D.seg(x + w / 2, y, x + w / 2, y + h, frame, 2);
    D.seg(x, y + h / 2, x + w, y + h / 2, frame, 2);
  };

  /** 笼子。 */
  M.cage = function (x, y, w, h, bars, colour, sw) {
    D.rect(x - w / 2, y - h / 2, w, h, EM.withA(colour, 0.06));
    D.rect(x - w / 2, y - h / 2, w, h, colour, sw || 2);
    for (var i = 1; i < bars; i++) {
      var bx = x - w / 2 + w * i / bars;
      D.seg(bx, y - h / 2, bx, y + h / 2, EM.withA(colour, 0.75), (sw || 2) * 0.8);
    }
  };

  /** 循环箭头（while (true) 的形状）。 */
  M.loopPath = function (x, y, r, colour, sw, phase) {
    D.arc(x, y, r, -Math.PI * 0.15 + phase, Math.PI * 1.75 + phase, colour, sw || 2.4);
    var a = Math.PI * 1.75 + phase;
    var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    var tang = a + Math.PI / 2;
    D.line([[px, py], [px - Math.cos(tang - 0.5) * 15, py - Math.sin(tang - 0.5) * 15]], colour, sw || 2.4);
    D.line([[px, py], [px - Math.cos(tang + 0.5) * 15, py - Math.sin(tang + 0.5) * 15]], colour, sw || 2.4);
  };

  /** 表盘。 */
  M.clock = function (x, y, r, hh, mm, colour, sw) {
    D.circle(x, y, r, colour, sw || 2);
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * TAU;
      D.seg(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96, colour, 1.4);
    }
    var ah = (hh % 12) / 12 * TAU - Math.PI / 2, am = mm / 60 * TAU - Math.PI / 2;
    D.seg(x, y, x + Math.cos(ah) * r * 0.5, y + Math.sin(ah) * r * 0.5, colour, (sw || 2) * 1.4);
    D.seg(x, y, x + Math.cos(am) * r * 0.78, y + Math.sin(am) * r * 0.78, colour, sw || 2);
    D.circle(x, y, r * 0.06, colour);
  };

  /** 分子式：中心 + 卫星原子 + 化学键。 */
  M.molecule = function (x, y, r, n, colour, seed, sw) {
    var pts = [[x, y]], i;
    D.circle(x, y, r * 0.22, EM.withA(colour, 0.35));
    D.circle(x, y, r * 0.22, colour, sw || 2);
    for (i = 0; i < n; i++) {
      var a = i / n * TAU + (EM.h(i, seed, 1) - 0.5) * 0.5;
      var rr = r * (0.7 + EM.h(i, seed, 2) * 0.4);
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      D.seg(x, y, px, py, EM.withA(colour, 0.6), sw || 2);
      D.circle(px, py, r * 0.12, EM.withA(colour, 0.3));
      D.circle(px, py, r * 0.12, colour, sw || 2);
      pts.push([px, py]);
    }
    return pts;
  };

  M.barcode = function (x, y, w, h, colour, seed) {
    var p = 0, i = 0;
    while (p < w - 4 && i < 200) {
      var bw = 1 + EM.h(i, seed, 1) * 5;
      if (EM.h(i, seed, 2) > 0.35) D.rect(x + p, y, bw, h, EM.withA(colour, 0.55 + 0.4 * EM.h(i, seed, 3)));
      p += bw + 1.5 + EM.h(i, seed, 4) * 3;
      i++;
    }
  };

  /** 波形（vals 为 -1..1）。 */
  M.waveform = function (x, y, w, h, vals, colour, sw) {
    var pts = [], i;
    for (i = 0; i < vals.length; i++) pts.push([x + w * i / (vals.length - 1), y + vals[i] * h * 0.5]);
    D.line(pts, colour, sw || 2);
  };

  /** 数据栈：一层层往上叠。 */
  M.stack = function (x, y, w, rows, colour, t, label) {
    for (var i = 0; i < rows; i++) {
      var yy = y - i * 26;
      var a = 0.15 + 0.5 * EM.h(i, 3, 0);
      D.rect(x, yy, w, 22, EM.withA(colour, 0.06));
      D.rect(x, yy, w, 22, EM.withA(colour, a), 1.4);
      D.seg(x + 6, yy + 11, x + 6 + (w - 12) * (0.2 + 0.8 * EM.h(i, 5, (t * 0.4) | 0)), yy + 11, EM.withA(colour, a * 1.4), 3);
      if (label) D.mono(label + '[' + i + ']', x + 8, yy + 16, 11, EM.withA(colour, 0.5));
    }
  };

  /** 5×7 点阵字：机器的"计数"。 */
  var FONT57 = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
    '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
    'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
    'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'N': ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
  };
  M.dotText = function (str, x, y, s, colour, opts) {
    opts = opts || {};
    var cx = x, i, j, k;
    for (k = 0; k < str.length; k++) {
      var g = FONT57[str[k]];
      if (!g) { cx += s * 3.5; continue; }
      for (j = 0; j < 7; j++) for (i = 0; i < 5; i++) {
        if (g[j][i] === '1') D.circle(cx + i * s * 1.5, y + j * s * 1.5, s * (opts.r || 0.5), colour);
      }
      cx += s * 8.2;
    }
    return cx - x;
  };
  M.dotTextWidth = function (str, s) { return str.length * s * 8.2; };

  /** 等宽字：D.mono 的别名，方便画板里写 M.mono(...)。 */
  M.mono = function (s, x, y, size, colour, opts) {
    opts = opts || {}; opts.mono = true;
    D.text(s, x, y, size === undefined ? 13 : size, colour, opts);
  };

  /** 光标（闪烁由 t 决定，纯函数）。 */
  M.caret = function (x, y, size, colour, t, period) {
    period = period || 0.53;
    if ((t % (period * 2)) < period) D.rect(x, y - size * 0.7, size * 0.5, size * 0.85, colour);
  };

  /** 阈值 / 进度计。 */
  M.gauge = function (x, y, w, h, v, colour, label) {
    D.rect(x, y, w, h, EM.withA(colour, 0.12));
    D.rect(x, y, w * EM.clamp(v, 0, 1), h, EM.withA(colour, 0.75));
    D.rect(x, y, w, h, colour, 1.2);
    for (var i = 0; i <= 10; i++) D.seg(x + w * i / 10, y, x + w * i / 10, y + h, EM.withA(colour, 0.3), 1);
    if (label) D.mono(label, x, y - 6, 12, EM.withA(colour, 0.7));
  };

  /** 刻度尺。 */
  M.ruler = function (x, y, w, n, colour, every) {
    for (var i = 0; i <= n; i++) {
      var big = i % (every || 5) === 0;
      D.seg(x + w * i / n, y, x + w * i / n, y + (big ? 12 : 6), EM.withA(colour, big ? 0.7 : 0.3), big ? 1.6 : 1);
      if (big && i < n) D.mono(String(i), x + w * i / n + 3, y + 24, 10, EM.withA(colour, 0.4));
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
