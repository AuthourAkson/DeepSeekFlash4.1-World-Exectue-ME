/* ============================================================================
   world.execute(me); — 10_draw.js
   A small vector/diagram kernel. Every scene is written with these primitives,
   which is what gives 95 different tableaux a single consistent hand:
   thin technical strokes, dashed measurement lines, monospace labels,
   terminal type with block cursors.
   ==========================================================================*/
(function (EM) {
  'use strict';

  var TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba;
  var ctx = null, W = 1600, H = 900;
  var curStroke = '#fff', curFill = 'rgba(0,0,0,0)', curWidth = 1.4;
  var MONO = '"Consolas","SFMono-Regular","DejaVu Sans Mono","Liberation Mono",Menlo,monospace';
  var SANS = '"Segoe UI","Helvetica Neue",Arial,"Noto Sans",sans-serif';

  function bind(c, w, h) { ctx = c; W = w; H = h; }
  function getCtx() { return ctx; }
  function size() { return { w: W, h: H }; }

  function stroke(s) { if (s != null) { curStroke = s; ctx.strokeStyle = s; } return curStroke; }
  function fill(s) { if (s != null) { curFill = s; ctx.fillStyle = s; } return curFill; }

  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function lw(w) { if (w != null) { curWidth = w; ctx.lineWidth = w; } return curWidth; }
  function dash(pat) { ctx.setLineDash(pat || []); return pat; }

  /* rect / circle helpers -------------------------------------------------- */
  function rect(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); }
  function srect(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke(); }
  function frect(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); }
  function circle(x, y, r, a0, a1) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), a0 === undefined ? 0 : a0, a1 === undefined ? TAU : a1); }
  function scircle(x, y, r, a0, a1) { circle(x, y, r, a0, a1); ctx.stroke(); }
  function fcircle(x, y, r, a0, a1) { circle(x, y, r, a0, a1); ctx.fill(); }
  function dot(x, y, r, a) {
    fill(rgba(a || [255, 255, 255], 1));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* regular polygon -------------------------------------------------------- */
  function ngon(x, y, r, n, rot, R) {
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = (rot || 0) + i / n * TAU;
      var rr = R ? R(i) : r;
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  function sngon(x, y, r, n, rot, R) { ngon(x, y, r, n, rot, R); ctx.stroke(); }
  function fngon(x, y, r, n, rot, R) { ngon(x, y, r, n, rot, R); ctx.fill(); }

  /* star / burst ----------------------------------------------------------- */
  function star(x, y, rOut, rIn, spikes, rot) {
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rr = i % 2 ? rIn : rOut;
      var a = (rot || 0) + i / (spikes * 2) * TAU;
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* bezier / path ---------------------------------------------------------- */
  function path(pts, close) {
    if (!pts || !pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].length === 2) ctx.lineTo(pts[i][0], pts[i][1]);
      else if (pts[i].length === 4) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3]);
      else ctx.bezierCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3], pts[i][4], pts[i][5]);
    }
    if (close) ctx.closePath();
    ctx.stroke();
  }

  /* polyline sampler: returns points of a smooth Catmull-Rom-ish spline ----- */
  function smooth(pts, samples) {
    var out = [], n = pts.length;
    if (n < 2) return pts.slice();
    samples = samples || 8;
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[i > 0 ? i - 1 : 0], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < n ? i + 2 : n - 1];
      for (var s = 0; s < samples; s++) {
        var t = s / samples, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }

  /* text ------------------------------------------------------------------- */
  function font(px, weight, family) {
    ctx.font = (weight ? weight + ' ' : '') + px + 'px ' + (family === 'sans' ? SANS : MONO);
  }
  function text(s, x, y, align, baseline) {
    var c = ctx;
    var f = readable(curFill, 4.5);
    c.save();
    c.fillStyle = f;
    c.textAlign = align || 'left';
    c.textBaseline = baseline || 'alphabetic';
    /* a whisper of shadow keeps type legible over bright plates without
       changing the colour or the geometry of the drawing underneath */
    if (EM.Polish.textShadow) {
      c.shadowColor = 'rgba(0,0,0,0.55)';
      c.shadowBlur = 4;
      c.shadowOffsetY = 1;
    }
    c.fillText(s, x, y);
    c.restore();
  }
  function measure(s, px, weight, family) { font(px, weight, family); return ctx.measureText(s).width; }

  /* typewriter: writes s char by char at tracking, with a block cursor.
     Returns width consumed. Deterministic from p (0..1) — seek-safe.        */
  function type(s, x, y, px, p, opt) {
    opt = opt || {};
    var track = opt.track === undefined ? px * 0.08 : opt.track;
    p = clamp(p, 0, 1);
    var n = Math.ceil(s.length * p);
    var c = ctx, prevFill = curFill;
    c.save();
    font(px, opt.weight, opt.family);
    c.textAlign = 'left';
    c.textBaseline = opt.baseline || 'alphabetic';
    var gc = readable(curFill, 4.5);
    if (opt.glow) {
      c.shadowBlur = px * 0.7;
      c.shadowColor = gc;
    } else if (EM.Polish.textShadow) {
      c.shadowColor = 'rgba(0,0,0,0.48)';
      c.shadowBlur = 3;
      c.shadowOffsetY = 1;
    }
    var cx = x, i, ch, cw;
    for (i = 0; i < n; i++) {
      ch = s.charAt(i);
      cw = c.measureText(ch).width;
      c.fillStyle = gc;
      c.fillText(ch, cx, y);
      cx += cw + track;
    }
    c.shadowBlur = 0;
    if (opt.cursor !== false) {
      var blink = opt.blink === undefined ? 1 : opt.blink;
      if (blink > 0.35 && p < 1) {
        c.globalAlpha = 0.5 + 0.5 * blink;
        c.fillStyle = curStroke;
        c.fillRect(cx + track, y - px * 0.78, px * 0.5, px * 0.86);
        c.globalAlpha = 1;
      }
    }
    c.restore();
    /* keep the module-level paint state exactly where the caller left it */
    fill(prevFill);
    return cx - x;
  }

  /* spaced monospace text (the "terminal heading" look) */
  function spaced(s, x, y, px, tracking, align) {
    var c = ctx;
    c.save();
    font(px);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    var t = tracking === undefined ? px * 0.34 : tracking;
    var gc = readable(curFill, 4.5);
    var total = 0, i, wds = [];
    for (i = 0; i < s.length; i++) { wds.push(c.measureText(s.charAt(i)).width); total += wds[i] + t; }
    total -= t;
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    c.fillStyle = gc;
    if (EM.Polish.textShadow) {
      c.shadowColor = 'rgba(0,0,0,0.50)';
      c.shadowBlur = 4;
      c.shadowOffsetY = 1;
    }
    for (i = 0; i < s.length; i++) { c.fillText(s.charAt(i), cx, y); cx += wds[i] + t; }
    c.restore();
    return total;
  }

  /* measurement dimension line with arrowheads and a centred label */
  function dim(x1, y1, x2, y2, label, off, labelPx) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    off = off || 0;
    var ax1 = x1 + nx * off, ay1 = y1 + ny * off, ax2 = x2 + nx * off, ay2 = y2 + ny * off;
    line(ax1, ay1, ax2, ay2);
    arrow(ax2, ay2, Math.atan2(dy, dx), 9);
    arrow(ax1, ay1, Math.atan2(-dy, -dx), 9);
    if (label) {
      var mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
      var px = labelPx || 15;
      font(px);
      var w = ctx.measureText(label).width;
      var a = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(mx, my);
      if (Math.abs(a) > Math.PI / 2) ctx.rotate(a + Math.PI); else ctx.rotate(a);
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      frect(-w / 2 - 5, -px - 3, w + 10, px + 6);
      ctx.fillText(label, 0, -3);
      ctx.restore();
    }
  }
  function arrow(x, y, ang, s) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.32) * s, y - Math.sin(ang - 0.32) * s);
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang + 0.32) * s, y - Math.sin(ang + 0.32) * s);
    ctx.stroke();
  }

  /* corner brackets — the "selected object" frame */
  function bracket(x, y, w, h, s) {
    s = s || 22;
    ctx.beginPath();
    ctx.moveTo(x, y + s); ctx.lineTo(x, y); ctx.lineTo(x + s, y);
    ctx.moveTo(x + w - s, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + s);
    ctx.moveTo(x + w, y + h - s); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - s, y + h);
    ctx.moveTo(x + s, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - s);
    ctx.stroke();
  }

  /* reticle: crosshair + ring — used to mark measurable quantities */
  function reticle(x, y, r, rot) {
    scircle(x, y, r);
    scircle(x, y, r * 0.62);
    var a, i;
    for (i = 0; i < 4; i++) {
      a = (rot || 0) + i * Math.PI / 2;
      line(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * r * 1.22, y + Math.sin(a) * r * 1.22);
    }
  }

  /* axis/grid in local space */
  function grid(x, y, w, h, cell, alpha) {
    ctx.globalAlpha = alpha === undefined ? 0.5 : alpha;
    var i;
    ctx.beginPath();
    for (i = Math.ceil(x / cell) * cell; i <= x + w; i += cell) { ctx.moveTo(i, y); ctx.lineTo(i, y + h); }
    for (i = Math.ceil(y / cell) * cell; i <= y + h; i += cell) { ctx.moveTo(x, i); ctx.lineTo(x + w, i); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function axes(cx, cy, len, labelX, labelY, px) {
    line(cx - len, cy, cx + len, cy);
    line(cx, cy - len, cx, cy + len);
    arrow(cx + len, cy, 0, 9);
    arrow(cx, cy - len, -Math.PI / 2, 9);
    if (labelX) { font(px || 14); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(labelX, cx + len + 8, cy + 5); }
    if (labelY) { font(px || 14); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(labelY, cx + 7, cy - len - 5); }
  }

  /* audio-ish waveform: deterministic, driven by time, no analyser needed */
  function waveform(x, y, w, h, t, freq, amp, phase) {
    ctx.beginPath();
    var n = Math.max(24, Math.floor(w / 3)), i, px, py;
    for (i = 0; i <= n; i++) {
      var u = i / n;
      var env = Math.sin(u * Math.PI);
      var v = Math.sin(u * (freq || 8) * TAU + (t || 0) * 4 + (phase || 0)) * 0.6
            + Math.sin(u * (freq || 8) * 2.3 * TAU - (t || 0) * 2.7) * 0.28
            + (EM.noise1(u * 22 + (t || 0) * 1.5) - 0.5) * 0.5;
      px = x + u * w; py = y + h / 2 - v * env * (h / 2) * (amp === undefined ? 1 : amp);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /* glitchy slice displacement of whatever is currently on the canvas */
  function sliceGlitch(canvas, amt, t) {
    if (amt <= 0.001) return;
    var n = Math.round(6 + amt * 16);
    for (var i = 0; i < n; i++) {
      var r = EM.hash((i * 977 + Math.floor(t * 13) * 131) | 0);
      var sy = Math.floor(r * canvas.height);
      var sh = Math.max(2, Math.floor((0.004 + r * 0.05) * amt * canvas.height));
      var dx = (EM.hash((i * 313 + Math.floor(t * 13) * 71) | 0) - 0.5) * amt * 190;
      try { ctx.drawImage(canvas, 0, sy, canvas.width, sh, dx, sy, canvas.width, sh); } catch (e) { /* ignore */ }
    }
  }

  /* shard: a triangle used for world-shatter debris, deterministic from seed */
  function shard(seed, x, y, r, rot, alpha) {
    var a0 = seed * TAU;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = a0 + rot + i / 3 * TAU;
      var rr = r * (0.6 + EM.hash((seed * 1000 + i * 37) | 0) * 0.7);
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* a "bar" meter, e.g. [-20dB ----|---- ] */
  function meter(x, y, w, h, v, segs) {
    segs = segs || 24;
    var i, on = Math.round(v * segs);
    for (i = 0; i < segs; i++) {
      if (i < on) { fill(curStroke); } else { ctx.globalAlpha = 0.16; fill(curStroke); }
      frect(x + i * (w / segs), y, (w / segs) * 0.62, h);
      ctx.globalAlpha = 1;
    }
    fill(curFill);
  }

  /* ---------- seeded structural randomness for scenery -------------------- */
  function rnd(seed) { return EM.hash(Math.floor(seed * 100003) | 0); }
  function rr(seed, a, b) { return a + rnd(seed) * (b - a); }

  /* --------------------------------------------------------------------------
     CONTRAST FLOOR FOR TYPE
     Every caption in the film sits on a near-black ground, so the only way a
     label becomes unreadable is by being mixed down towards that ground. A
     plain rgba(accent, 0.5) over rgb(5,7,12) measures about 2:1 — visible as a
     shape but not as words. These two helpers take the colour's own luminance
     and lift the alpha until the text clears a legible ratio (4.5:1 for body
     copy), which is why the film can stay dim and atmospheric without ever
     losing its annotations.
     ------------------------------------------------------------------------ */
  var BG_LUM = 0.0055;                 /* ~rgb(5,7,12) in relative luminance */

  function relLum(c) {
    var f = function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  /* the alpha this colour needs to reach `min` contrast against near-black */
  function parseCSS(s) {
    if (typeof s !== 'string' || s.charAt(0) !== 'r') return null;
    var m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  /* decorative linework keeps its translucency: shapes are only lifted when
     fully opaque, so washes and hairlines stay delicate */
  function readableShape(cur, min) {
    min = min || 3.0;
    var c = parseCSS(cur);
    if (!c || c.a < 0.99) return cur;
    var need = min * (BG_LUM + 0.05) - 0.05;
    if (relLum([c.r, c.g, c.b]) >= need) return cur;
    return cur;
  }
  function minAlpha(c, min, from) {
    min = min || 4.5;
    from = (from === undefined || !(from > 0)) ? 0.05 : from;
    var need = min * (BG_LUM + 0.05) - 0.05;
    if (need <= 0) return from;
    /* if even the full-strength colour cannot reach the target, go solid */
    if (relLum(c) <= need) return 1;
    /* solve the sRGB compositing for alpha. The bracket must start BELOW the
       alpha we were given, otherwise a nearly-transparent input jumps straight
       to near-opaque instead of being nudged up to the threshold. */
    var lo = Math.max(0.001, Math.min(from, 0.999)), hi = 1;
    if (relLum([c[0] * lo, c[1] * lo, c[2] * lo]) >= need) return lo;   /* already fine */
    for (var i = 0; i < 28; i++) {
      var mid = (lo + hi) / 2;
      var m = [c[0] * mid, c[1] * mid, c[2] * mid];   /* over black */
      var r = relLum(m);
      if (r < need) lo = mid; else hi = mid;
    }
    return Math.min(1, hi);
  }
  /* readable label colour: keeps the hue, guarantees the contrast */
  function inkColor(c, want) {
    return rgba(c, minAlpha(c, want || 4.5));
  }
  /* readable dim/secondary: same guarantee at a lower bar, still legible */
  function dimColor(c) { return rgba(c, minAlpha(c, 3.2)); }

  /* --------------------------------------------------------------------------
     A last line of defence applied to EVERY piece of type in the film.
     Plates ask for colours at whatever alpha suits them; before a glyph is
     drawn the colour is checked and, if it would fall below the legibility
     floor against the near-black ground, it is lifted. The lift is done in two
     stages, in this order, because that is the order a designer would use:

       1. raise the alpha — keeps the hue exactly, enough for most colours;
       2. if the colour is simply too dark for any alpha to clear the floor
          (the grid line colour at peak heat measures under 2:1 even fully
          opaque), blend it toward the film's own text colour by the minimum
          amount that works.

     Nothing becomes bright that was not already meant to be read: this only
     ever runs on type, never on the decorative linework.
     ------------------------------------------------------------------------ */
  var TEXT_NUDGE = [226, 240, 248];      /* PAL.white: the film's text colour */

  function alphaLift(col, min, from) {
    min = min || 4.5;
    from = (from === undefined || !(from > 0)) ? 0.05 : from;
    var need = min * (BG_LUM + 0.05) - 0.05;
    if (need <= 0) return from;
    if (relLum(col) <= need) return 1;
    var lo = Math.max(0.001, Math.min(from, 0.999)), hi = 1;
    if (relLum([col[0] * lo, col[1] * lo, col[2] * lo]) >= need) return lo;
    for (var i = 0; i < 28; i++) {
      var mid = (lo + hi) / 2;
      if (relLum([col[0] * mid, col[1] * mid, col[2] * mid]) < need) lo = mid; else hi = mid;
    }
    return Math.min(1, hi);
  }
  /* kept for callers that only want the alpha answer */
  function minAlpha(c, min, from) { return alphaLift(c, min, from); }

  function readable(cur, min) {
    min = min || 4.5;
    var c = parseCSS(cur);
    if (!c) return cur;
    var need = min * (BG_LUM + 0.05) - 0.05;
    var col = [c.r, c.g, c.b];
    var eff = c.a >= 0.99 ? col : [c.r * c.a, c.g * c.a, c.b * c.a];
    if (relLum(eff) >= need) return cur;             /* already legible */
    if (relLum(col) > need) return rgba(col, alphaLift(col, min, c.a));
    /* too dark to fix with alpha: blend toward the text colour */
    var t = 0, hi = 1;
    for (var i = 0; i < 22; i++) {
      t = (t + hi) / 2;
      var m = [col[0] + (TEXT_NUDGE[0] - col[0]) * t,
               col[1] + (TEXT_NUDGE[1] - col[1]) * t,
               col[2] + (TEXT_NUDGE[2] - col[2]) * t];
      if (relLum(m) < need) t = t;                     /* keep going brighter */
      else hi = t;
    }
    var out = [col[0] + (TEXT_NUDGE[0] - col[0]) * hi,
               col[1] + (TEXT_NUDGE[1] - col[1]) * hi,
               col[2] + (TEXT_NUDGE[2] - col[2]) * hi];
    return rgba(out, Math.max(c.a, 0.9));
  }

  EM.D = {
    bind: bind, ctx: getCtx, size: size,
    stroke: stroke, fill: fill, lw: lw, dash: dash,
    line: line, rect: rect, srect: srect, frect: frect,
    circle: circle, scircle: scircle, fcircle: fcircle, dot: dot,
    ngon: ngon, sngon: sngon, fngon: fngon, star: star,
    path: path, smooth: smooth,
    font: font, text: text, measure: measure, type: type, spaced: spaced,
    dim: dim, arrow: arrow, bracket: bracket, reticle: reticle,
    grid: grid, axes: axes, waveform: waveform,
    sliceGlitch: sliceGlitch, shard: shard, meter: meter,
    rnd: rnd, rr: rr,
    relLum: relLum, minAlpha: minAlpha, ink: inkColor, dimInk: dimColor,
    readable: readable, readableShape: readableShape, parseCSS: parseCSS,
    MONO: MONO, SANS: SANS
  };
})(window.EM);
