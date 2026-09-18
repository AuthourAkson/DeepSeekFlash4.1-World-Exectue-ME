/* ============================================================================
 * 12_svg.js — SVG 画板层
 * ----------------------------------------------------------------------------
 * 有 7 句歌词改成了 SVG 动画（见 src/43_scenes_svg.js）。它们不是画在 canvas 上，
 * 而是画在 canvas **上面**的一层真 <svg> 里：矢量、可无损缩放、
 * 抖动/网点用 <pattern> 做，描边生长用 stroke-dashoffset 做。
 *
 * 关键约束：整套验证工具不能因此失效。所以同一份几何描述有两个后端：
 *
 *   DOM 后端（浏览器）  → 真的 <path>/<circle>/<pattern>，带 transform 属性
 *   虚拟后端（node 工具）→ 把同一条 d 展平成折线，走 canvas 记录器，
 *                        于是 run-all.js 的"真的画出像素了吗"照样成立
 *
 * 两个后端接受完全相同的调用序列，场景代码里没有 if(是不是浏览器)。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D;
  var W = WX.W, H = WX.H;

  var SVG = WX.SVG = {
    W: W, H: H,
    t: 0,
    enabled: false,      // 浏览器里有 DOM 才为 true
    count: 0,            // 本帧发出的图元数（验证工具会读它）
    root: null,
    _buf: [],            // 本帧累积的 DOM 片段 / 虚拟调用
    _m: [1, 0, 0, 1, 0, 0],
    _stack: []
  };

  /* --------------------------------------------------------------- 生命周期 */

  /** 找（或建）页面上的 SVG 层。node 里没有 DOM，就走虚拟后端。 */
  SVG.attach = function (hostEl) {
    var doc = (typeof document !== 'undefined') ? document : null;
    if (!doc || typeof doc.createElementNS !== 'function') { SVG.enabled = false; return; }
    try {
      SVG._attach(doc, hostEl);
    } catch (e) {
      // 没有可用的 SVG DOM（例如 _tools 的无头运行台）→ 退回虚拟后端：
      // 同一份几何照样走 canvas 记录器，验证工具不会因此失效。
      SVG.enabled = false;
      SVG.root = null;
      SVG.lastError = String((e && e.message) || e);
      console.warn('[svg] 没有可用的 SVG DOM，退回虚拟后端（画在 canvas 上）：' + SVG.lastError);
    }
  };

  SVG._attach = function (doc, hostEl) {
    var el = doc.getElementById('svglayer');
    if (!el) {
      var host = hostEl || doc.getElementById('stagewrap') || doc.body;
      el = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.setAttribute('id', 'svglayer');
      el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      el.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
      if (!doc.getElementById('svglayer-defs')) {
        el.innerHTML = '<defs id="svglayer-defs">' +
          '<pattern id="sv-dots" width="6" height="6" patternUnits="userSpaceOnUse">' +
          '<circle cx="1.6" cy="1.6" r="1.15" fill="#ffffff"/></pattern>' +
          '<pattern id="sv-mesh" width="5" height="5" patternUnits="userSpaceOnUse">' +
          '<path d="M0 0 L5 5 M5 0 L0 5" stroke="#ffffff" stroke-width="0.9"/></pattern>' +
          '<pattern id="sv-lines" width="4" height="4" patternUnits="userSpaceOnUse">' +
          '<path d="M0 2.2 L4 2.2" stroke="#ffffff" stroke-width="1.5"/></pattern>' +
          '<pattern id="sv-cross" width="7" height="7" patternUnits="userSpaceOnUse">' +
          '<path d="M3.5 0 L3.5 7 M0 3.5 L7 3.5" stroke="#ffffff" stroke-width="1"/></pattern>' +
          '</defs>';
      }
      host.appendChild(el);
    }
    SVG.root = el;
    SVG.enabled = true;
    SVG.applyFilter();
  };

  /** MV 模式：SVG 层也跟着转灰（canvas 那层在合成器里做）。 */
  SVG.applyFilter = function () {
    if (!SVG.root) return;
    var on = !!(WX.MV && WX.MV.ON);
    SVG.root.style.filter = on ? 'grayscale(1) contrast(1.2)' : 'none';
  };

  var VIRT = WX.SVG && false;      // 占位，避免压缩器误判

  SVG.open = function (t) {
    SVG.t = t;
    SVG.count = 0;
    SVG._buf.length = 0;
    SVG._m = [1, 0, 0, 1, 0, 0];
    SVG._stack.length = 0;
  };

  /** 提交本帧。DOM 后端一次性替换，避免逐元素 append 的开销。 */
  SVG.close = function () {
    if (SVG.enabled && SVG.root) {
      SVG.root.innerHTML = '<defs>' + DEFS + '</defs>' + SVG._buf.join('');
    }
  };

  /** 场景没在用 SVG 时调用：清掉上一帧的残留。 */
  SVG.clear = function () {
    SVG.count = 0;
    if (SVG.enabled && SVG.root && SVG.root.childNodes.length) SVG.root.innerHTML = '<defs>' + DEFS + '</defs>';
  };

  var DEFS = '<pattern id="sv-dots" width="6" height="6" patternUnits="userSpaceOnUse">' +
    '<circle cx="1.7" cy="1.7" r="1.2" fill="#ffffff"/></pattern>' +
    '<pattern id="sv-dots2" width="9" height="9" patternUnits="userSpaceOnUse">' +
    '<circle cx="2.4" cy="2.4" r="1.5" fill="#ffffff"/>' +
    '<circle cx="6.9" cy="6.9" r="1.1" fill="#ffffff"/></pattern>' +
    '<pattern id="sv-mesh" width="5" height="5" patternUnits="userSpaceOnUse">' +
    '<path d="M0 0 L5 5 M5 0 L0 5" stroke="#ffffff" stroke-width="0.85"/></pattern>' +
    '<pattern id="sv-lines" width="4" height="4" patternUnits="userSpaceOnUse">' +
    '<path d="M0 2.2 L4 2.2" stroke="#ffffff" stroke-width="1.4"/></pattern>' +
    '<pattern id="sv-cross" width="7" height="7" patternUnits="userSpaceOnUse">' +
    '<path d="M3.5 0 L3.5 7 M0 3.5 L7 3.5" stroke="#ffffff" stroke-width="1"/></pattern>' +
    '<pattern id="sv-hatch" width="6" height="6" patternUnits="userSpaceOnUse">' +
    '<path d="M0 6 L6 0" stroke="#ffffff" stroke-width="1.2"/></pattern>' +
    '<pattern id="sv-b25" width="16" height="16" patternUnits="userSpaceOnUse">' +
    '<circle cx="2" cy="2" r="1.75" fill="#ffffff"/><circle cx="10" cy="2" r="1.75" fill="#ffffff"/><circle cx="2" cy="10" r="1.75" fill="#ffffff"/><circle cx="10" cy="10" r="1.75" fill="#ffffff"/></pattern>' +
    '<pattern id="sv-b50" width="16" height="16" patternUnits="userSpaceOnUse">' +
    '<circle cx="2" cy="2" r="1.75" fill="#ffffff"/><circle cx="10" cy="2" r="1.75" fill="#ffffff"/><circle cx="6" cy="6" r="1.75" fill="#ffffff"/><circle cx="14" cy="6" r="1.75" fill="#ffffff"/><circle cx="2" cy="10" r="1.75" fill="#ffffff"/><circle cx="10" cy="10" r="1.75" fill="#ffffff"/><circle cx="6" cy="14" r="1.75" fill="#ffffff"/><circle cx="14" cy="14" r="1.75" fill="#ffffff"/></pattern>' +
    '<pattern id="sv-b75" width="16" height="16" patternUnits="userSpaceOnUse">' +
    '<circle cx="2" cy="2" r="1.75" fill="#ffffff"/><circle cx="6" cy="2" r="1.75" fill="#ffffff"/><circle cx="10" cy="2" r="1.75" fill="#ffffff"/><circle cx="14" cy="2" r="1.75" fill="#ffffff"/><circle cx="6" cy="6" r="1.75" fill="#ffffff"/><circle cx="14" cy="6" r="1.75" fill="#ffffff"/><circle cx="2" cy="10" r="1.75" fill="#ffffff"/><circle cx="6" cy="10" r="1.75" fill="#ffffff"/><circle cx="10" cy="10" r="1.75" fill="#ffffff"/><circle cx="14" cy="10" r="1.75" fill="#ffffff"/><circle cx="6" cy="14" r="1.75" fill="#ffffff"/><circle cx="14" cy="14" r="1.75" fill="#ffffff"/></pattern>';

  /* ----------------------------------------------------------------- 变换 */

  SVG.push = function () { SVG._stack.push(SVG._m.slice()); };
  SVG.pop = function () { var m = SVG._stack.pop(); if (m) SVG._m = m; };
  SVG.T = function (x, y, rot, k) {
    var m = SVG._m, c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    k = (k === undefined ? 1 : k);
    var n = mul(m, [c * k, s * k, -s * k, c * k, x, y]);
    SVG._m = n;
  };
  /** 在局部坐标系里执行 fn（画完自动还原）。 */
  SVG.at = function (x, y, rot, k, fn) { SVG.push(); SVG.T(x, y, rot, k); fn(); SVG.pop(); };

  function mul(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  function tp(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function mat(m) { return 'matrix(' + m.map(function (v) { return Math.round(v * 1000) / 1000; }).join(',') + ')'; }

  /* ------------------------------------------------------------- 路径展平 */

  /** 迷你 d 解析器：支持 M m L l H h V v C c S s Q q T t A a Z z（本文件与 08_vectors 用到）。 */
  function flatten(d, m) {
    var toks = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    var subs = [], cur = null, x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = 'M';
    var pc1x = 0, pc1y = 0, pc2x = 0, pc2y = 0, pQx = 0, pQy = 0, hasC = false, hasQ = false;
    function pt(px, py) { cur.push(tp(m, px, py)); }
    function seg(ax, ay, bx, by, cx, cy, dx, dy) {   // 三次贝塞尔 → 折线
      for (var s = 1; s <= 8; s++) {
        var t = s / 8, u = 1 - t;
        pt(u * u * u * ax + 3 * u * u * t * bx + 3 * u * t * t * cx + t * t * t * dx,
          u * u * u * ay + 3 * u * u * t * by + 3 * u * t * t * cy + t * t * t * dy);
      }
    }
    function qseg(ax, ay, bx, by, cx, cy) {          // 二次贝塞尔 → 折线
      for (var s2 = 1; s2 <= 8; s2++) {
        var t2 = s2 / 8, u2 = 1 - t2;
        pt(u2 * u2 * ax + 2 * u2 * t2 * bx + t2 * t2 * cx, u2 * u2 * ay + 2 * u2 * t2 * by + t2 * t2 * cy);
      }
    }
    function arc(rx, ry, rot, laf, sf, ex, ey) {     // 椭圆弧 → 折线
      rx = Math.abs(rx); ry = Math.abs(ry);
      if (rx === 0 || ry === 0 || (x === ex && y === ey)) { pt(ex, ey); return; }
      var phi = rot * Math.PI / 180;
      var dx = (x - ex) / 2, dy = (y - ey) / 2;
      var x1p = Math.cos(phi) * dx + Math.sin(phi) * dy;
      var y1p = -Math.sin(phi) * dx + Math.cos(phi) * dy;
      var lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
      if (lam > 1) { var sq = Math.sqrt(lam); rx *= sq; ry *= sq; }
      var num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      var den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
      var coef = (laf !== sf ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
      var cxp = coef * rx * y1p / ry;
      var cyp = coef * -ry * x1p / rx;
      var cx = Math.cos(phi) * cxp - Math.sin(phi) * cyp + (x + ex) / 2;
      var cy = Math.sin(phi) * cxp + Math.cos(phi) * cyp + (y + ey) / 2;
      var th1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
      var dth = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - th1;
      if (!sf && dth > 0) dth -= 2 * Math.PI;
      else if (sf && dth < 0) dth += 2 * Math.PI;
      var n = Math.max(4, Math.ceil(Math.abs(dth) / 0.12));
      for (var k = 1; k <= n; k++) {
        var t3 = th1 + dth * k / n;
        var px = Math.cos(phi) * rx * Math.cos(t3) - Math.sin(phi) * ry * Math.sin(t3) + cx;
        var py = Math.sin(phi) * rx * Math.cos(t3) + Math.cos(phi) * ry * Math.sin(t3) + cy;
        pt(px, py);
      }
    }
    while (i < toks.length) {
      if (/[A-Za-z]/.test(toks[i])) { cmd = toks[i]; i++; if (cmd === 'Z' || cmd === 'z') { if (cur) pt(sx, sy); continue; } }
      var rel = cmd === cmd.toLowerCase();
      var n = function () { var v = parseFloat(toks[i++]); return isNaN(v) ? 0 : v; };
      if (cmd === 'M' || cmd === 'm') {
        var nx = n() + (rel ? x : 0), ny = n() + (rel ? y : 0);
        x = nx; y = ny; sx = x; sy = y;
        cur = []; subs.push(cur); pt(x, y); hasC = hasQ = false;
      } else if (cmd === 'L' || cmd === 'l') {
        var lx = n() + (rel ? x : 0), ly = n() + (rel ? y : 0);
        pt(lx, ly); x = lx; y = ly; hasC = hasQ = false;
      } else if (cmd === 'H' || cmd === 'h') {
        x = n() + (rel ? x : 0); pt(x, y); hasC = hasQ = false;
      } else if (cmd === 'V' || cmd === 'v') {
        y = n() + (rel ? y : 0); pt(x, y); hasC = hasQ = false;
      } else if (cmd === 'C' || cmd === 'c') {
        var x1 = n() + (rel ? x : 0), y1 = n() + (rel ? y : 0);
        var x2 = n() + (rel ? x : 0), y2 = n() + (rel ? y : 0);
        var x3 = n() + (rel ? x : 0), y3 = n() + (rel ? y : 0);
        if (!cur) { cur = []; subs.push(cur); pt(x, y); }
        seg(x, y, x1, y1, x2, y2, x3, y3);
        pc1x = x1; pc1y = y1; pc2x = x2; pc2y = y2; hasC = true; hasQ = false; x = x3; y = y3;
      } else if (cmd === 'S' || cmd === 's') {
        var sx1 = hasC ? 2 * x - pc2x : x, sy1 = hasC ? 2 * y - pc2y : y;
        var x2s = n() + (rel ? x : 0), y2s = n() + (rel ? y : 0);
        var x3s = n() + (rel ? x : 0), y3s = n() + (rel ? y : 0);
        if (!cur) { cur = []; subs.push(cur); pt(x, y); }
        seg(x, y, sx1, sy1, x2s, y2s, x3s, y3s);
        pc1x = sx1; pc1y = sy1; pc2x = x2s; pc2y = y2s; hasC = true; hasQ = false; x = x3s; y = y3s;
      } else if (cmd === 'Q' || cmd === 'q') {
        var qx = n() + (rel ? x : 0), qy = n() + (rel ? y : 0);
        var qx2 = n() + (rel ? x : 0), qy2 = n() + (rel ? y : 0);
        if (!cur) { cur = []; subs.push(cur); pt(x, y); }
        qseg(x, y, qx, qy, qx2, qy2);
        pQx = qx; pQy = qy; hasQ = true; hasC = false; x = qx2; y = qy2;
      } else if (cmd === 'T' || cmd === 't') {
        var tx = hasQ ? 2 * x - pQx : x, ty = hasQ ? 2 * y - pQy : y;
        var tx2 = n() + (rel ? x : 0), ty2 = n() + (rel ? y : 0);
        if (!cur) { cur = []; subs.push(cur); pt(x, y); }
        qseg(x, y, tx, ty, tx2, ty2);
        pQx = tx; pQy = ty; hasQ = true; hasC = false; x = tx2; y = ty2;
      } else if (cmd === 'A' || cmd === 'a') {
        var arx = n(), ary = n(), arot = n(), alaf = n(), asf = n();
        var aex = n() + (rel ? x : 0), aey = n() + (rel ? y : 0);
        if (!cur) { cur = []; subs.push(cur); pt(x, y); }
        arc(arx, ary, arot, alaf, asf, aex, aey);
        x = aex; y = aey; hasC = hasQ = false;
      } else { i++; }
    }
    return subs;
  }
  SVG.flatten = flatten;

  /* --------------------------------------------------------------- 样式 */

  var PATTERNS = { dots: 'sv-dots', dots2: 'sv-dots2', mesh: 'sv-mesh', lines: 'sv-lines', cross: 'sv-cross', hatch: 'sv-hatch',
    b25: 'sv-b25', b50: 'sv-b50', b75: 'sv-b75' };

  /* 网点图案一律是白色点阵，亮度靠元素自己的 fill-opacity 控制 ——
     这样同一套 <pattern> 能给所有画板复用（SVG 里 pattern 的 currentColor
     是按 pattern 自己继承的颜色解析的，不是引用它的元素，容易踩坑）。*/
  function paint(v) {
    if (v === undefined || v === null) return null;
    if (v && v.pattern) {
      var c0 = EM.parse(v.colour || [255, 255, 255]);
      return { kind: 'pattern', id: PATTERNS[v.pattern] || 'sv-dots', c: c0 };
    }
    return { kind: 'solid', c: EM.parse(v) };
  }
  function isPat(pa) { return pa && pa.kind === 'pattern'; }
  /** 虚拟后端（画在 canvas 上）看到的颜色：网点按半透明实心色近似。 */
  function css(pa) {
    if (!pa) return 'none';
    if (pa.kind === 'pattern') return EM.css(EM.withA([pa.c[0], pa.c[1], pa.c[2]], pa.c[3] * 0.62));
    return EM.css(pa.c);
  }
  function attrs(o, extra) {
    var s = '';
    for (var k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') s += ' ' + k + '="' + o[k] + '"';
    if (extra) for (var k2 in extra) if (extra[k2] !== undefined) s += ' ' + k2 + '="' + extra[k2] + '"';
    return s;
  }

  /** 样式对象 → 属性串。fill/stroke 可以是颜色、{pattern:'dots',colour:c}，或 'none'。 */
  function styleAttrs(st) {
    st = st || {};
    var a = {};
    /* 没写 fill 的元素一律 fill="none"。
       SVG 的默认填充是**黑色**：一条只描边的闭合路径（比如面板边框 M…Z）
       会顺手把整块画面填黑 —— 这个坑很隐蔽，靠"数元素个数"永远发现不了，
       必须真的把 SVG 光栅化读像素才看得见。 */
    if (st.fill === undefined) a.fill = 'none';
    if (st.fill !== undefined) {
      var fp = paint(st.fill);
      if (isPat(fp)) { a.fill = 'url(#' + fp.id + ')'; a['fill-opacity'] = r3(fp.c[3]); }
      else a.fill = css(fp);
    }
    if (st.stroke !== undefined) {
      var sp = paint(st.stroke);
      if (isPat(sp)) { a.stroke = 'url(#' + sp.id + ')'; a['stroke-opacity'] = r3(sp.c[3]); }
      else a.stroke = css(sp);
    }
    if (st.sw !== undefined) a['stroke-width'] = r3(st.sw);
    if (st.opacity !== undefined) a.opacity = r3(st.opacity);
    if (st.dash !== undefined) a['stroke-dasharray'] = st.dash;
    if (st.off !== undefined) a['stroke-dashoffset'] = r3(st.off);
    if (st.cap) a['stroke-linecap'] = st.cap;
    if (st.join) a['stroke-linejoin'] = st.join;
    return a;
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }

  /* ------------------------------------------------------------- 图元 API */

  function emit(dom, virt) {
    SVG.count++;
    if (SVG.enabled) {
      // 逐句淡入淡出是 D.alpha 在做（画布画板天然吃这一口），SVG 得自己跟上
      var a = D.alpha;
      SVG._buf.push(a >= 0.999 ? dom : '<g opacity="' + r3(a) + '">' + dom + '</g>');
    } else {
      virt();
    }
  }

  SVG.path = function (d, st) {
    emit('<path' + attrs({ d: d }, styleAttrs(st)) + ' transform="' + mat(SVG._m) + '"/>', function () {
      var subs = flatten(d, SVG._m), i, j;
      for (i = 0; i < subs.length; i++) {
        var p = subs[i];
        if (p.length < 2) continue;
        if (st && st.stroke !== undefined) D.line(p, css(paint(st.stroke)), st.sw || 1.5, false);
        if (st && st.fill !== undefined && p.length > 2) D.poly(p, css(paint(st.fill)));
      }
    });
  };

  /** 自绘路径：progress 0..1 决定画到哪（描边生长）。 */
  SVG.drawOn = function (d, st, progress) {
    progress = EM.clamp(progress, 0, 1);
    if (progress <= 0) return;
    var len = 0, subs = flatten(d, [1, 0, 0, 1, 0, 0]);
    for (var i = 0; i < subs.length; i++) for (var j = 1; j < subs[i].length; j++)
      len += EM.dist(subs[i][j - 1][0], subs[i][j - 1][1], subs[i][j][0], subs[i][j][1]);
    emit('<path' + attrs({ d: d }, styleAttrs(st)) +
      ' transform="' + mat(SVG._m) + '" stroke-dasharray="' + r3(len) + '" stroke-dashoffset="' + r3(len * (1 - progress)) + '"/>',
      function () {
        var ss = flatten(d, SVG._m), k, q;
        var want = len * progress;
        for (k = 0; k < ss.length; k++) {
          var pts = ss[k], out = [pts[0]];
          var acc = 0;
          for (q = 1; q < pts.length; q++) {
            var segLen = EM.dist(pts[q - 1][0], pts[q - 1][1], pts[q][0], pts[q][1]);
            if (acc + segLen <= want) { out.push(pts[q]); acc += segLen; }
            else {
              var f = segLen > 0 ? (want - acc) / segLen : 0;
              out.push([pts[q - 1][0] + (pts[q][0] - pts[q - 1][0]) * f, pts[q - 1][1] + (pts[q][1] - pts[q - 1][1]) * f]);
              break;
            }
          }
          if (out.length > 1) D.line(out, css(paint(st && st.stroke)), (st && st.sw) || 1.5, false);
        }
      });
  };

  SVG.circle = function (x, y, r, st) {
    var m = SVG._m, c = tp(m, x, y);
    var s = (Math.abs(m[0]) + Math.abs(m[3])) / 2;
    emit('<ellipse' + attrs({ cx: c[0], cy: c[1], rx: r * s, ry: r * s }, styleAttrs(st)) + '/>',
      function () {
        if (st && st.fill !== undefined) D.circle(c[0], c[1], r * s, css(paint(st.fill)));
        if (st && st.stroke !== undefined && (st.fill === undefined)) D.circle(c[0], c[1], r * s, css(paint(st.stroke)), st.sw || 1.5);
        else if (st && st.stroke !== undefined) D.circle(c[0], c[1], r * s, css(paint(st.stroke)), st.sw || 1.5);
      });
  };

  SVG.rect = function (x, y, w, h, st) {
    var m = SVG._m, p = [tp(m, x, y), tp(m, x + w, y), tp(m, x + w, y + h), tp(m, x, y + h)];
    emit('<polygon' + attrs({ points: p.map(function (q) { return r3(q[0]) + ',' + r3(q[1]); }).join(' ') }, styleAttrs(st)) + '/>',
      function () {
        if (st && st.fill !== undefined) D.poly(p, css(paint(st.fill)));
        if (st && st.stroke !== undefined) D.line(p, css(paint(st.stroke)), st.sw || 1.5, true);
      });
  };

  SVG.poly = function (points, st, close) {
    var m = SVG._m, p = points.map(function (q) { return tp(m, q[0], q[1]); });
    emit('<' + (close === false ? 'polyline' : 'polygon') + attrs({
      points: p.map(function (q) { return r3(q[0]) + ',' + r3(q[1]); }).join(' ')
    }, styleAttrs(st)) + '/>',
      function () {
        if (st && st.fill !== undefined && close !== false) D.poly(p, css(paint(st.fill)));
        if (st && st.stroke !== undefined) D.line(p, css(paint(st.stroke)), st.sw || 1.5, close !== false);
      });
  };

  SVG.line = function (x1, y1, x2, y2, st) {
    var m = SVG._m, a = tp(m, x1, y1), b = tp(m, x2, y2);
    emit('<line' + attrs({ x1: r3(a[0]), y1: r3(a[1]), x2: r3(b[0]), y2: r3(b[1]) }, styleAttrs(st)) + '/>',
      function () { D.seg(a[0], a[1], b[0], b[1], css(paint(st && st.stroke)), (st && st.sw) || 1.5); });
  };

  /** 文字：走和 canvas 画板同一条可读性下限（EM.readable）。 */
  SVG.text = function (s, x, y, size, colour, opts) {
    opts = opts || {};
    var bg = opts.bg || D.bg;
    var col = EM.readable(colour, bg, opts.minRatio === undefined ? 4.5 : opts.minRatio, opts.alpha === undefined ? 1 : opts.alpha);
    var m = SVG._m, p = tp(m, x, y);
    var k = (Math.abs(m[0]) + Math.abs(m[3])) / 2;
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var dom = '<text' + attrs({
      x: r3(p[0]), y: r3(p[1]), 'font-size': r3(size * k),
      'font-family': opts.font || (opts.mono ? 'ui-monospace,Consolas,monospace' : 'Inter,"Segoe UI",system-ui,sans-serif'),
      'font-weight': opts.weight || 400,
      'text-anchor': opts.align === 'center' ? 'middle' : (opts.align === 'right' ? 'end' : 'start'),
      'letter-spacing': opts.tracking ? r3(opts.tracking * k) : 0
    }, { fill: EM.css([col[0], col[1], col[2], 1]), opacity: r3(col[3] * (opts.opacity === undefined ? 1 : opts.opacity)) }) + '>' + esc(s) + '</text>';
    emit(dom, function () {
      var wdt = D.measure(s, size * k, opts.mono);
      var ax = opts.align === 'center' ? p[0] - wdt / 2 : (opts.align === 'right' ? p[0] - wdt : p[0]);
      var pts = [[ax, p[1] - size * k * 0.78], [ax + wdt, p[1] - size * k * 0.78], [ax + wdt, p[1] + size * k * 0.2], [ax, p[1] + size * k * 0.2]];
      D.poly(pts, EM.withA([col[0], col[1], col[2]], col[3]));
      if (D.S) D.S.texts.push({ s: s, colour: [col[0], col[1], col[2]], alpha: col[3], bg: bg.slice(0, 3), ratio: EM.contrast(EM.over([col[0], col[1], col[2], col[3]], bg), bg) });
    });
  };

  /* ------------------------------------------------------------ 常用零件 */

  /** 抖动画板：框 + 网点填充 + 角标。参考图里的"框住一张插图"就是这么来的。 */
  SVG.panel = function (x, y, w, h, colour, t, opts) {
    opts = opts || {};
    var k = opts.progress === undefined ? 1 : opts.progress;
    var per = Math.max(w, h) * 2;
    SVG.path('M' + x + ' ' + y + ' H' + (x + w) + ' V' + (y + h) + ' H' + x + ' Z',
      { stroke: colour, sw: opts.sw || 2, fill: opts.fill, cap: 'butt' });
    if (opts.fill) SVG.rect(x, y, w, h, { fill: opts.fill });
    // 四角：短角标
    var L = opts.corner === undefined ? 22 : opts.corner, sw = opts.sw || 2;
    var c = colour;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(function (q) {
      SVG.line(q[0], q[1], q[0] + q[2] * L, q[1], { stroke: c, sw: sw * 1.4 });
      SVG.line(q[0], q[1], q[0], q[1] + q[3] * L, { stroke: c, sw: sw * 1.4 });
    });
  };

  /** 扫描线 / 噪点：参考图的"颗粒感"。 */
  SVG.grain = function (x, y, w, h, seed, t, amount, colour) {
    amount = amount === undefined ? 1 : amount;
    var n = Math.round(70 * amount);
    for (var i = 0; i < n; i++) {
      var gx = x + EM.h(i, seed, 1) * w, gy = y + EM.h(i, seed, 2) * h;
      var v = EM.h(i, seed, (t * 8) | 0);
      if (v < 0.55) continue;
      SVG.rect(gx, gy, 1.6 + v * 2.2, 1.4, { fill: EM.withA(colour || [255, 255, 255], 0.05 + 0.16 * v * amount) });
    }
    var lines = Math.max(3, Math.round(h / 5));
    for (var j = 0; j < lines; j++) {
      var ly = y + (j + 0.5) * h / lines;
      SVG.line(x, ly, x + w, ly, { stroke: EM.withA(colour || [255, 255, 255], 0.035 * amount), sw: 1 });
    }
  };

  /* ---------------------------------------------------------- 几何生成器 */

  /** 椭圆 → 多边形（可旋转）。 */
  SVG.ellipsePoly = function (cx, cy, rx, ry, rot, n) {
    n = n || 48;
    var out = [], c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (var i = 0; i < n; i++) {
      var a = i / n * EM.TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  };

  /** 心形曲线 → 多边形（参考图 Proof-of-my-existence 里那颗心）。 */
  SVG.heartPoly = function (cx, cy, s, n) {
    n = n || 60;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * EM.TAU;
      var x = 16 * Math.pow(Math.sin(a), 3);
      var y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      out.push([cx + x * s / 16, cy + y * s / 16]);
    }
    return out;
  };

  /** 三角形 / 任意点集平移。 */
  SVG.move = function (pts, dx, dy) { return pts.map(function (q) { return [q[0] + dx, q[1] + dy]; }); };
  SVG.rot = function (pts, cx, cy, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return pts.map(function (q) {
      var x = q[0] - cx, y = q[1] - cy;
      return [cx + x * c - y * s, cy + x * s + y * c];
    });
  };
  SVG.scl = function (pts, cx, cy, kx, ky) {
    return pts.map(function (q) { return [cx + (q[0] - cx) * kx, cy + (q[1] - cy) * (ky === undefined ? kx : ky)]; });
  };

  /** 扫描线求交：一堆多边形在 y 上的 x 区间（偶奇规则）。 */
  SVG.spans = function (polys, y) {
    var xs = [], i, j;
    for (i = 0; i < polys.length; i++) {
      var p = polys[i];
      for (j = 0; j < p.length; j++) {
        var a = p[j], b = p[(j + 1) % p.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
    }
    xs.sort(function (u, v) { return u - v; });
    var out = [];
    for (i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.4) out.push([xs[i], xs[i + 1]]);
    return out;
  };

  /**
   * 网点/抖动画块 —— 参考图里那种"印刷出来的插图"就是这么做的。
   * 把多边形按横向条带切开，每一段落一块 <pattern> 填充的矩形：
   *   opts.wipe   0..1  只画到哪条带（自下而上的"印刷"进度）
   *   opts.band   条带高度
   *   opts.pattern 'dots' | 'dots2' | 'mesh' | 'lines' | 'cross' | 'hatch'
   *   opts.stripe 大于 1 时每隔 N 条带才画（虎斑条纹）
   */
  SVG.halftone = function (polys, opts) {
    opts = opts || {};
    var band = opts.band || 7, pat = opts.pattern || 'dots';
    var y0 = 1e9, y1 = -1e9, i, k;
    for (i = 0; i < polys.length; i++) for (k = 0; k < polys[i].length; k++) {
      y0 = Math.min(y0, polys[i][k][1]); y1 = Math.max(y1, polys[i][k][1]);
    }
    var wipe = opts.wipe === undefined ? 1 : EM.clamp(opts.wipe, 0, 1);
    var stop = y0 + (y1 - y0) * wipe;
    var n = Math.max(1, Math.ceil((y1 - y0) / band));
    for (i = 0; i < n; i++) {
      var y = y0 + i * band;
      if (y > stop) continue;
      if (opts.stripe && (i % opts.stripe !== 0)) continue;
      var sp = SVG.spans(polys, y + band * 0.5);
      for (k = 0; k < sp.length; k++) {
        var a = sp[k][0], b = sp[k][1];
        var jx = opts.jitter ? (EM.h(i, k, 3) - 0.5) * opts.jitter : 0;   // 手抖感
        SVG.rect(a + jx, y, Math.max(1, b - a), band * (opts.thick || 1.06),
          { fill: { pattern: pat, colour: EM.withA(opts.colour || [255, 255, 255], opts.alpha === undefined ? 1 : opts.alpha) } });
      }
    }
  };

  /** 多边形描边生长（轮廓自绘）。 */
  SVG.outline = function (polys, st, progress, close) {
    var i, d = '';
    for (i = 0; i < polys.length; i++) {
      var p = polys[i];
      d += 'M' + r3(p[0][0]) + ' ' + r3(p[0][1]);
      for (var j = 1; j < p.length; j++) d += ' L' + r3(p[j][0]) + ' ' + r3(p[j][1]);
      if (close !== false) d += ' Z';
    }
    SVG.drawOn(d, st, progress);
  };

  /** 一段"电平条"：给声音用的。 */
  SVG.meter = function (x, y, w, h, v, colour) {
    SVG.rect(x, y, w, h, { stroke: EM.withA(colour, 0.5), sw: 1 });
    SVG.rect(x, y, w * EM.clamp(v, 0, 1), h, { fill: EM.withA(colour, 0.7) });
  };

})(typeof window !== 'undefined' ? window : globalThis);
