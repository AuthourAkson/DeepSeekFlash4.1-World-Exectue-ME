/* ============================================================================
   world.execute(me); — 40_scenes.js
   PLATE LIBRARY (part 1/3)
   Act I  — BOOT          00:00.0 - 00:16.0   the system is switched on
   Act II — THEOREMS      00:29.7 - 00:59.2   the singer offers geometry
   Each plate: e(w, p, s)  w = world state, p = line progress 0..1, s = data
   ==========================================================================*/
(function (EM) {
  'use strict';

  var S = EM.Scenes, D = EM.D, E = EM.E, TAU = EM.TAU;
  var clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, hash = EM.hash, noise = EM.noise2;
  var pulse = EM.onsetPulse, near = EM.onsetNear;
  /* Stage constants. Every plate works in the film's 1600x900 virtual stage:
     the renderer applies the letterbox transform to the canvas, so one stage
     unit is one drawing unit and the scale factor is exactly 1. These live
     inside 10_draw.js, and forgetting to bring them into scope made every
     single plate throw "U is not defined" and draw nothing at all — while
     coverage still reported 100%. */
  var W = 1600, H = 900, U = 1;

  /* shared echo of the "attack" curve: quick in, hold, quick out.
     Prevents two adjacent lines from ever both being fully lit.          */
  function vis(p, a) {
    a = a === undefined ? 0.16 : a;
    if (p < 0) return 0;
    if (p < a) return E.outCubic(p / a);
    if (p > 1 - a * 0.8) return E.outCubic(clamp((1 - p) / (a * 0.8), 0, 1));
    return 1;
  }
  var LIFE = EM.Life = {
    vis: vis,
    /* per-character stagger progress */
    stagger: function (p, i, n, span) {
      span = span || 0.55;
      var st = n > 1 ? i / (n - 1) * span : 0;
      return clamp((p - st) / (1 - span), 0, 1);
    }
  };

  /* ==========================================================================
     ACT I — BOOT
     ======================================================================== */

  /* 00:00.000 — (pre-roll). Absolute black. One amber stand-by lamp. */
  S('boot.pre', [
    { l: 60, e: function (w, p) {
      var a = vis(p, 0.4);
      D.fill(rgba([255, 168, 46], 0.9 * a));
      D.circle(0, 0, lerp(2, 5, pulse(w.time, 0.5)) * U); D.ctx().fill();
      D.lw(1.2); D.stroke(rgba([255, 168, 46], 0.35 * a));
      var r = lerp(16, 130, E.outCubic(clamp(p / 0.45, 0, 1))) * U;
      D.scircle(0, 0, r);
      D.scircle(0, 0, r * 0.94);
      D.font(15 * U); D.fill(rgba([255, 168, 46], 0.75 * a));
      D.spaced('STANDBY', 0, 62 * U, 15 * U, 4 * U, 'center');
    } }
  ]);

  /* 00:00.100 — Switch on the power line */
  S('boot.power', [
    /* horizontal bus bar + travelling charge front, vertically centred */
    { l: 40, e: function (w, p) {
      var a = vis(p, 0.10);
      var on = clamp(p / 0.55, 0, 1);
      D.lw(2); D.stroke(rgba(w.heat > 0.4 ? w.pal.hot : w.pal.accent, 0.30 * a));
      D.line(-W * 0.46, 0, W * 0.46, 0);
      D.lw(3.4); D.stroke(rgba(w.pal.accent, 0.95 * a));
      D.line(-W * 0.46, 0, -W * 0.46 + W * 0.92 * E.outQuart(on), 0);
      /* the charge itself */
      var hx = -W * 0.46 + W * 0.92 * E.outQuart(on);
      var g = D.ctx().createRadialGradient(hx, 0, 0, hx, 0, 120 * U);
      g.addColorStop(0, rgba(w.pal.ink, 0.85 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.circle(hx, 0, 120 * U); D.ctx().fill();
      /* breaker ticks along the bus */
      for (var i = 0; i <= 14; i++) {
        var x = -W * 0.46 + W * 0.92 * i / 14;
        var lit = x <= hx + 1;
        D.lw(lit ? 2 : 1);
        D.stroke(rgba(w.pal.accent, (lit ? 0.8 : 0.18) * a));
        D.line(x, -13 * U, x, 13 * U);
      }
    } },
    { l: 44, e: function (w, p) {
      var a = vis(p, 0.10);
      if (a < 0.02) return;
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.96 * a)); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.ctx().textAlign = 'center'; D.ctx().textBaseline = 'alphabetic';
      D.ctx().fillText('Switch on the power line', 0, 178 * U);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.55 * a));
      D.spaced('V_SUPPLY  =  ' + (5.00 + 0.02 * Math.sin(w.time * 9)).toFixed(2) + ' V   //  I = ' + (0.30 + 0.4 * pulse(w.time, 0.4)).toFixed(2) + ' A',
        0, 208 * U, 15 * U, 2.4 * U, 'center');
    } }
  ]);

  /* 00:01.740 — Remember to put on */
  S('boot.remember', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a helmet / visor lowering into place */
      var drop = E.outCubic(clamp(p / 0.6, 0, 1));
      var cy = lerp(-320, -40, drop) * U;
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.ctx().beginPath();
      D.ctx().arc(0, cy + 100 * U, 118 * U, Math.PI * 1.06, Math.PI * 1.94);
      D.ctx().stroke();
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.35 * a));
      for (var i = -4; i <= 4; i++) {
        var an = Math.PI * 1.5 + i * 0.16;
        D.line(Math.cos(an) * 118 * U, cy + 100 * U + Math.sin(an) * 118 * U,
               Math.cos(an) * 138 * U, cy + 100 * U + Math.sin(an) * 138 * U);
      }
      /* checkmark */
      var t2 = clamp((p - 0.5) / 0.35, 0, 1);
      if (t2 > 0) {
        D.lw(3); D.stroke(rgba(w.pal.accent, 0.9 * a));
        D.line(-16 * U, 170 * U, -4 * U, 182 * U);
        D.line(-4 * U, 182 * U, -4 * U + 30 * U * E.outQuart(t2), 182 * U - 30 * U * E.outQuart(t2));
      }
    } },
    { l: 36, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Remember to put on', 0, 268 * U);
    } }
  ]);

  /* 00:02.920 — PROTECTION. A shield mesh that takes a hit. */
  S('boot.protect', [
    { l: 36, e: function (w, p) {
      var a = vis(p, 0.06);
      var s = E.pop(clamp(p / 0.28, 0, 1));
      D.ctx().save(); D.ctx().scale(s, s);
      /* shield outline */
      var pts = [], i;
      for (i = 0; i <= 40; i++) {
        var u = i / 40;
        var ang = -Math.PI / 2 + u * TAU;
        var rr = 220 * U * (1 + 0.08 * Math.cos(6 * ang)) * (ang > 0 ? 1 - 0.35 * Math.sin(ang) : 1);
        pts.push([Math.cos(ang) * rr * 0.86, Math.sin(ang) * rr + 20 * U]);
      }
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.95 * a));
      D.path(pts, true);
      /* hex mesh inside */
      D.lw(1); D.stroke(rgba(w.pal.accent, 0.28 * a));
      for (var hy = -160; hy <= 200; hy += 42) {
        for (var hx = -170; hx <= 170; hx += 48) {
          var off = ((hy / 42) | 0) % 2 ? 24 : 0;
          if (Math.hypot(hx + off, hy - 20) > 200) continue;
          D.sngon(hx + off, hy, 24 * U, 6, 0);
        }
      }
      /* impacts */
      var hits = [0.22, 0.45, 0.68, 0.86];
      for (i = 0; i < hits.length; i++) {
        var hp = clamp((p - hits[i]) / 0.22, 0, 1);
        if (hp <= 0 || hp >= 1) continue;
        var ha = (hash(i * 313) - 0.5) * 2.2;
        var hxx = Math.cos(ha) * 190 * U, hyy = Math.sin(ha) * 190 * U * 0.9 - 20 * U;
        D.lw(2); D.stroke(rgba(w.pal.hot, (1 - hp) * 0.95));
        D.star(hxx, hyy, 10 * U + hp * 70 * U, 4 * U + hp * 26 * U, 9, hp * 2);
        D.ctx().stroke();
        D.lw(3); D.stroke(rgba(w.pal.ink, (1 - hp) * 0.7));
        D.scircle(hxx, hyy, 8 * U + hp * 90 * U);
      }
      D.ctx().restore();
    } },
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.08);
      D.font(68 * U, '700'); D.fill(rgba(w.pal.ink, 0.98 * a));
      D.stroke(rgba(w.pal.accent, 0.55 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('PROTECTION', 0, 322 * U);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.7 * a));
      var wd = D.measure('PROTECTION', 68 * U, '700') / 2 + 22 * U;
      D.line(-wd, 336 * U, wd, 336 * U);
    } },
    { l: 78, e: function (w, p) {
      var a = vis(p, 0.2);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.5 * a));
      var s = ['INTEGRITY  ' + (100 - 6 * Math.sin(w.time * 3) * 4).toFixed(1) + '%', 'THREAT VECTOR  LOCKED'];
      D.spaced(s[0], -W * 0.30, -H * 0.31, 13 * U, 2 * U);
      D.spaced(s[1], -W * 0.30, -H * 0.31 + 22 * U, 13 * U, 2 * U);
    } }
  ]);

  /* 00:03.873 — Lay down your pieces */
  S('boot.pieces', [
    { l: 36, e: function (w, p) {
      var a = vis(p, 0.10);
      var n = 64;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 3571 + 11), s2 = hash(i * 7919 + 23);
        var tgtX = (s1 - 0.5) * W * 0.72;
        var tgtY = (s2 - 0.5) * H * 0.52 + 30 * U;
        var delay = s1 * 0.5;
        var k = E.outBack(clamp((p - delay) / 0.42, 0, 1));
        var symX = (s2 - 0.5) * W * 1.4;      /* where it came from */
        var symY = lerp(-H * 0.8, tgtY, k);
        var x = lerp(symX, tgtX, k), y = symY;
        var rot = lerp((s1 - 0.5) * 6, 0, k);
        D.lw(1.4); D.stroke(rgba(w.pal.accent, (0.20 + s2 * 0.55) * a));
        D.fill(rgba(w.pal.accent, 0.10 * a));
        D.ctx().save(); D.ctx().translate(x, y); D.ctx().rotate(rot);
        D.rect(-8 * U, -8 * U, 16 * U, 16 * U); D.ctx().fill(); D.ctx().stroke();
        D.ctx().restore();
      }
    } },
    { l: 44, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.94 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Lay down your pieces', 0, H * 0.34);
    } }
  ]);

  /* 00:05.491 — And let's begin */
  S('boot.begin', [
    { l: 40, e: function (w, p) {
      var a = vis(p, 0.08);
      /* the "begin" bracket: two arms closing on a gap */
      var close = E.outCubic(clamp(p / 0.6, 0, 1));
      var gap = lerp(430, 96, close) * U;
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.line(-gap, -150 * U, -gap, 150 * U);
      D.line(gap, -150 * U, gap, 150 * U);
      D.line(-gap, -150 * U, -gap + 90 * U, -150 * U);
      D.line(-gap, 150 * U, -gap + 90 * U, 150 * U);
      D.line(gap, -150 * U, gap - 90 * U, -150 * U);
      D.line(gap, 150 * U, gap - 90 * U, 150 * U);
      /* the space between them is where the world will be born */
      var gg = D.ctx().createLinearGradient(-gap, 0, gap, 0);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(0.5, rgba(w.pal.ink, 0.16 * a));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(gg); D.frect(-gap, -150 * U, gap * 2, 300 * U);
    } },
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.10);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("And let's begin", 0, H * 0.30);
    } }
  ]);

  /* 00:06.380 — OBJECT CREATION. A body assembles out of primitives. */
  S('boot.object', [
    { l: 38, e: function (w, p) {
      var a = vis(p, 0.08);
      var k = [0, 0.14, 0.28, 0.42, 0.58];
      var parts = [
        function (q) { D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.9 * a)); D.scircle(0, -190 * U, 54 * U); },
        function (q) { D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.9 * a)); D.line(0, -136 * U, 0, 70 * U); },
        function (q) { D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.9 * a)); D.line(-92 * U, -90 * U, 92 * U, -90 * U); },
        function (q) { D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.9 * a)); D.line(0, 70 * U, -62 * U, 214 * U); D.line(0, 70 * U, 62 * U, 214 * U); },
        function (q) {
          D.lw(1.4); D.stroke(rgba(w.pal.hot, 0.85 * a)); D.fill(rgba(w.pal.hot, 0.5 * a));
          D.scircle(0, -190 * U, 11 * U); D.ctx().fill();
        }
      ];
      for (var i = 0; i < parts.length; i++) {
        var q = clamp((p - k[i]) / 0.3, 0, 1);
        if (q <= 0) continue;
        D.ctx().save();
        var sc = lerp(1.9, 1, E.outBack(q));
        D.ctx().globalAlpha = E.outQuad(q) * a;
        D.ctx().translate(0, 0); D.ctx().scale(sc, sc);
        parts[i](q);
        D.ctx().restore();
      }
      /* survey grid behind */
      D.lw(1); D.stroke(rgba(w.pal.grid, 0.18 * a));
      D.grid(-260 * U, -300 * U, 520 * U, 600 * U, 52 * U, 0.6);
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.10);
      D.font(46 * U, '700'); D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('OBJECT', -140 * U, -330 * U);
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.ctx().fillText('CREATION', 60 * U, -330 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.line(-140 * U + D.measure('OBJECT', 46 * U, '700') / 2 + 14 * U, -334 * U,
             -140 * U + D.measure('OBJECT', 46 * U, '700') / 2 + 40 * U, -334 * U);
    } }
  ]);

  /* 00:07.446 — Fill in my data parameters */
  S('boot.parameters', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.10);
      /* a form the world fills in by itself */
      var rows = [
        ['NAME', 'world.execute(me);'],
        ['MASS', '0x1F.4A'],
        ['HEIGHT', '192.0 cm'],
        ['EYES', '2 / #56D6E8'],
        ['HEART', '<unset>'],
        ['PURPOSE', '?']
      ];
      var bx = -W * 0.30, by = -H * 0.30;
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.srect(bx, by, W * 0.60, 44 * U + rows.length * 40 * U);
      for (var i = 0; i < rows.length; i++) {
        var q = clamp((p - i * 0.13) / 0.30, 0, 1);
        if (q <= 0) continue;
        var y = by + 40 * U + i * 40 * U;
        D.font(17 * U); D.fill(rgba(w.pal.accent, 0.62 * a));
        D.spaced(rows[i][0], bx + 20 * U, y, 17 * U, 2.6 * U);
        D.lw(1); D.stroke(rgba(w.pal.grid, 0.4 * a));
        D.line(bx + 150 * U, y - 20 * U, bx + 150 * U, y + 6 * U);
        var isUnset = rows[i][0] === 'HEART' || rows[i][0] === 'PURPOSE';
        D.fill(isUnset ? rgba(w.pal.hot, 0.9 * a) : rgba(w.pal.ink, 0.95 * a));
        D.type(rows[i][1], bx + 168 * U, y, 17 * U, q, { track: 0, cursor: true, blink: Math.sin(w.time * 8) > 0 ? 1 : 0 });
        D.type('', 0, 0, 1, 0, { cursor: false });
        D.fill(isUnset ? rgba(w.pal.hot, 0.9 * a) : rgba(w.pal.ink, 0.95 * a));
        if (q < 1) D.ctx().fillRect(bx + 168 * U + D.measure(rows[i][1].slice(0, Math.ceil(rows[i][1].length * q)), 17 * U) + 2 * U, y - 14 * U, 9 * U, 18 * U);
      }
      /* a caret row waiting for input */
      var blink = Math.sin(w.time * 7) > 0;
      if (blink && p > 0.75) {
        D.fill(rgba(w.pal.accent, 0.9 * a));
        D.frect(bx + 20 * U, by + 44 * U + rows.length * 40 * U, 11 * U, 20 * U);
      }
    } },
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(24 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Fill in my data parameters', 0, H * 0.36);
    } }
  ]);

  /* 00:10.091 — INITIALIZATION */
  S('boot.init', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.06);
      /* a progress bar that is really a countdown of everything not yet real */
      var k = E.outQuart(clamp(p / 0.72, 0, 1));
      var bx = -W * 0.32, bw = W * 0.64;
      D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.55 * a));
      D.srect(bx, 0, bw, 34 * U);
      D.fill(rgba(w.pal.ink, 0.20 * a)); D.frect(bx, 0, bw, 34 * U);
      D.fill(rgba(w.pal.accent, 0.85 * a)); D.frect(bx, 0, bw * k, 34 * U);
      /* segments */
      D.lw(1); D.stroke(rgba(w.pal.bg0 === undefined ? [0, 0, 0] : [0, 0, 0], 0.8));
      for (var i = 1; i < 28; i++) D.line(bx + bw * i / 28, 0, bx + bw * i / 28, 34 * U);
      D.font(20 * U); D.fill(rgba(w.pal.ink, 0.95 * a));
      D.text('INIT  ' + (k * 100).toFixed(1).padStart(5) + ' %', bx, -22 * U);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      var tasks = ['allocating memory', 'seeding rng', 'binding senses', 'compiling self'];
      for (i = 0; i < tasks.length; i++) {
        var q = clamp((k - i * 0.24) / 0.12, 0, 1);
        D.text((q >= 1 ? '[ok] ' : '[..] ') + tasks[i], bx, 66 * U + i * 26 * U);
      }
    } },
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.10);
      D.font(52 * U, '700'); D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('INITIALIZATION', 0, H * 0.34);
    } }
  ]);

  /* 00:11.095 — Set up our new world */
  S('boot.world', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.14);
      /* a small world being assembled: shell, then continents, then a moon */
      var grow = E.outCubic(clamp(p / 0.55, 0, 1));
      var R = 170 * U * grow;
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.scircle(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * grow);
      if (grow > 0.55) {
        var g2 = clamp((p - 0.45) / 0.4, 0, 1);
        D.lw(1.1); D.stroke(rgba(w.pal.accent, 0.45 * a));
        for (var i = 0; i < 6; i++) {
          var s1 = hash(i * 911 + 3), s2 = hash(i * 613 + 17);
          var an = s1 * TAU, rr = (0.25 + s2 * 0.62) * R;
          D.ctx().beginPath();
          D.ctx().ellipse(Math.cos(an) * rr, Math.sin(an) * rr * 0.9, 44 * U * g2 * (0.5 + s2), 30 * U * g2 * (0.5 + s1), an, 0, TAU);
          D.ctx().stroke();
        }
      }
      D.lw(1); D.stroke(rgba(w.pal.grid, 0.5 * a));
      D.ctx().beginPath();
      D.ctx().ellipse(0, 20 * U, R * 1.8, R * 0.42, 0.3, 0, TAU * clamp((p - 0.3) / 0.5, 0, 1));
      D.ctx().stroke();
      if (p > 0.62) {
        var m = clamp((p - 0.62) / 0.3, 0, 1);
        var ma = m * TAU * 0.8;
        D.fill(rgba(w.pal.ink, 0.9 * a));
        D.circle(Math.cos(ma) * R * 1.7, 20 * U + Math.sin(ma) * R * 0.4, 9 * U); D.ctx().fill();
      }
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.94 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Set up our new world', 0, H * 0.36);
    } }
  ]);

  /* 00:12.906 — And let's begin the */
  S('boot.begin2', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.10);
      /* a big switch being thrown */
      var th = E.outBack(clamp(p / 0.42, 0, 1));
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.line(0, 150 * U, 0, 40 * U);
      D.lw(6); D.stroke(rgba(w.pal.hot, 0.9 * a));
      var an = lerp(-0.9, 0.9, th);
      D.line(0, 40 * U, Math.sin(an) * 120 * U, 40 * U - Math.cos(an) * 120 * U);
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.circle(Math.sin(an) * 120 * U, 40 * U - Math.cos(an) * 120 * U, 12 * U); D.ctx().fill();
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.55 * a));
      D.scircle(0, 40 * U, 17 * U);
      /* spark at contact */
      var sp = clamp((p - 0.42) / 0.18, 0, 1);
      if (sp > 0 && sp < 1) {
        D.lw(2); D.stroke(rgba(w.pal.ink, (1 - sp) * 0.95));
        D.star(Math.sin(an) * 120 * U, 40 * U - Math.cos(an) * 120 * U, 14 * U + sp * 90 * U, 5 * U + sp * 34 * U, 12, sp * 3);
        D.ctx().stroke();
      }
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.94 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("And let's begin the", 0, H * 0.34);
    } }
  ]);

  /* 00:13.891 — SIMULATION. Wide title card, world inhales. */
  S('boot.sim', [
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      /* concentric shockwave rings on each MIDI onset */
      var ons = EM.onsetsBetween(w.time - 1.6, w.time);
      for (var i = 0; i < ons.length; i++) {
        var dt = w.time - ons[i][0] / 1000;
        var q = clamp(dt / 1.6, 0, 1);
        if (q >= 1) continue;
        D.lw(lerp(3, 0.6, q));
        D.stroke(rgba(w.pal.accent, (1 - q) * 0.55 * a));
        D.scircle(0, 0, E.outQuart(q) * 620 * U);
      }
    } },
    { l: 8, e: function (w, p) {
      var a = vis(p, 0.08);
      var k = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 30 * U); D.ctx().scale(k, k);
      D.font(112 * U, '700'); D.ctx().textAlign = 'center';
      D.stroke(rgba(w.pal.hot, 0.85 * a)); D.lw(5);
      D.ctx().lineWidth = 5; D.ctx().strokeStyle = rgba(w.pal.hot, 0.85 * a);
      D.ctx().lineJoin = 'round';
      D.ctx().strokeText('SIMULATION', 0, 0);
      D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().fillText('SIMULATION', 0, 0);
      D.ctx().restore();
      D.font(16 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('t = 0.000   |   ENTITIES = 1   |   OBSERVERS = 1', 0, 130 * U, 16 * U, 3 * U, 'center');
    } }
  ]);

  /* 00:16.000 — (instrumental — world boot). 13.7 s with no words:
     the world finishes being built, and the camera falls into it. */
  S('inst.boot', [
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.06);
      /* a boot log scrolling; every entry lands on a real note onset */
      var ons = EM.onsetsBetween(w.time - 7, w.time + 0.2);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.55 * a));
      for (var i = 0; i < ons.length; i++) {
        var dt = w.time - ons[i][0] / 1000;
        if (dt < 0) continue;
        var row = Math.round(dt * 3.4);
        var line = bootLine(Math.round(ons[i][0]));
        var yy = H * 0.34 - row * 24 * U;
        if (yy < -H * 0.5) continue;
        D.ctx().globalAlpha = clamp((dt) / 1.4, 0, 1) * clamp((H * 0.34 - yy) / (60 * U) + 1, 0, 1) * a;
        D.text(line, -W * 0.42, yy);
      }
      D.ctx().globalAlpha = 1;
    } },
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.10);
      /* a cross-section cutaway of the self: rings rotating into alignment */
      var al = 1 - clamp((p - 0.72) / 0.28, 0, 1);
      D.lw(1.2);
      for (var i = 0; i < 7; i++) {
        var s1 = hash(i * 733 + 5);
        D.stroke(rgba(w.pal.accent, (0.12 + s1 * 0.2) * a * al));
        D.ctx().save();
        D.ctx().rotate(w.time * (0.08 + s1 * 0.3) * (i % 2 ? 1 : -1));
        D.ctx().beginPath();
        D.ctx().ellipse(0, 0, (60 + i * 46) * U, (18 + i * 9) * U, i * 0.5, 0, TAU);
        D.ctx().stroke();
        D.ctx().restore();
      }
    } },
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.16);
      D.font(20 * U); D.fill(rgba(w.pal.ink, 0.85 * a));
      D.spaced('W O R L D   B O O T', 0, -H * 0.40, 20 * U, 6 * U, 'center');
      D.lw(1); D.stroke(rgba(w.pal.accent, 0.4 * a));
      D.line(-150 * U, -H * 0.40 + 14 * U, 150 * U, -H * 0.40 + 14 * U);
    } },
    { l: 60, e: function (w, p) {
      var a = vis(p, 0.14);
      if (p < 0.45) return;
      var k = E.outCubic(clamp((p - 0.45) / 0.5, 0, 1));
      D.font(19 * U); D.fill(rgba(w.pal.ink, 0.6 * a * k));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('…are you there?', 0, H * 0.40);
    } }
  ]);

  function bootLine(tick) {
    var pool = [
      'init  memory      ................ ok',
      'mount /dev/self   ................ ok',
      'load  axioms      [ 12 rules ]',
      'build lattice     4096 nodes',
      'solve euler       dt = 0.461538',
      'calibrate retina  gamma 2.2',
      'spin  gyros       drift 0.003',
      'grow  skin        uv unwrap',
      'open  eyes        ',
      'taste salt        first sample',
      'feel  gravity     9.80665 m/s2',
      'hear  a voice     ???'
    ];
    var h = Math.abs((tick * 2654435761) % pool.length);
    return pool[h | 0];
  }

  /* ==========================================================================
     ACT II — THEOREMS
     ======================================================================== */

  /* 00:29.709 — If I'm a set of points */
  S('p.points', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      var n = Math.round(lerp(6, 90, clamp(p / 0.55, 0, 1)));
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 1097 + 3), s2 = hash(i * 6151 + 19);
        var ang = s1 * TAU + w.time * 0.06;
        var rad = (30 + s2 * 330) * U;
        var x = Math.cos(ang) * rad, y = Math.sin(ang * 1.1) * rad * 0.7;
        var pl = pulse(w.time - s2 * 0.3, 0.23);
        D.ctx().fillStyle = rgba(w.pal.accent, 0.25 + s1 * 0.5);
        D.ctx().beginPath(); D.ctx().arc(x, y, (1.2 + s2 * 2.6 + pl * 3) * U, 0, TAU); D.ctx().fill();
        if (i > 0 && s2 > 0.72) {
          D.lw(0.6); D.stroke(rgba(w.pal.accent, 0.10 * a));
          D.line(x, y, 0, 0);
        }
      }
      /* coordinate labels for the first few */
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.5 * a));
      for (i = 0; i < 4; i++) {
        var s3 = hash(i * 337 + 7);
        var an2 = s3 * TAU;
        var rr = (140 + s3 * 220) * U;
        D.text('P' + i + '(' + (Math.cos(an2) * 3).toFixed(2) + ', ' + (Math.sin(an2) * 3).toFixed(2) + ')',
               Math.cos(an2) * rr, Math.sin(an2) * rr * 0.7 - 12 * U);
      }
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm a set of points", 0, H * 0.40);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.45 * a));
      D.spaced('P = { p1, p2, ... pn }', 0, H * 0.40 + 30 * U, 14 * U, 2 * U, 'center');
    } }
  ]);

  /* 00:31.116 — Then I will give you my  (variant A) */
  S('p.giveA', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.14);
      /* an open hand made of vectors, offering a dot */
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.8 * a));
      var base = [0, 210 * U];
      for (var f = -2; f <= 2; f++) {
        var len = (120 + (2 - Math.abs(f)) * 26) * U * k;
        var dx = f * 30 * U;
        var tipY = base[1] - len;
        D.ctx().beginPath();
        D.ctx().moveTo(base[0] + dx * 0.5, base[1]);
        D.ctx().quadraticCurveTo(base[0] + dx * 1.4, base[1] - len * 0.6, base[0] + dx * 1.9, tipY);
        D.ctx().stroke();
        D.ctx().beginPath(); D.ctx().arc(base[0] + dx * 1.9, tipY, 6 * U * k, 0, TAU); D.ctx().stroke();
      }
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.ctx().beginPath();
      D.ctx().ellipse(0, 176 * U, 76 * U * k, 48 * U * k, 0, 0, TAU); D.ctx().stroke();
      /* the offered object */
      var hl = pulse(w.time, 0.32);
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.circle(0, -80 * U, (7 + hl * 5) * U); D.ctx().fill();
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I will give you my', 0, -H * 0.34);
    } }
  ]);

  /* 00:32.682 — DIMENSION. Three axes unfold. */
  S('p.dimension', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.07);
      var k = E.outQuart(clamp(p / 0.45, 0, 1));
      var L = 300 * U * k;
      var labels = ['x', 'y', 'z'];
      var dirs = [[1, 0, 0], [0, -1, 0], [-0.66, 0.55, 0]];
      for (var i = 0; i < 3; i++) {
        var d = dirs[i];
        var ex = d[0] * L, ey = d[1] * L;
        D.lw(3); D.stroke(rgba(w.pal.accent, 0.9 * a));
        D.line(0, 0, ex, ey);
        D.arrow(ex, ey, Math.atan2(ey, ex), 13 * U);
        D.font(22 * U); D.fill(rgba(w.pal.ink, 0.95 * a));
        D.text(labels[i], ex * 1.12 + 6 * U, ey * 1.12 + 6 * U);
      }
      /* the volume that the three axes enclose */
      if (k > 0.8) {
        var v = clamp((p - 0.4) / 0.35, 0, 1);
        D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.4 * a * v));
        D.fill(rgba(w.pal.accent, 0.05 * a * v));
        D.ctx().beginPath();
        D.ctx().moveTo(0, 0); D.ctx().lineTo(L, 0); D.ctx().lineTo(L - L * 0.66, L * -0.55);
        D.ctx().lineTo(-L * 0.66, L * -0.55); D.ctx().closePath();
        D.ctx().lineTo(L - L * 0.66, L * -0.55 + L); D.ctx().lineTo(L, L);
        D.ctx().lineTo(L, 0);
        D.ctx().stroke();
        D.ctx().beginPath();
        D.ctx().moveTo(0, 0); D.ctx().lineTo(-L * 0.66, L * -0.55); D.ctx().lineTo(-L * 0.66, L * -0.55 + L); D.ctx().lineTo(0, L); D.ctx().closePath();
        D.ctx().fill(); D.ctx().stroke();
      }
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(76 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('DIMENSION', 0, -H * 0.36);
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.8 * a));
      var wd = D.measure('DIMENSION', 76 * U, '700') / 2 + 26 * U;
      D.line(-wd, -H * 0.36 + 18 * U, wd, -H * 0.36 + 18 * U);
      D.ctx().restore();
    } }
  ]);

  /* 00:33.412 — If I'm a circle */
  S('p.circle', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.10);
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      var R = 230 * U;
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.92 * a));
      D.circle(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * k); D.ctx().stroke();
      /* the centre point that defines everything */
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.circle(0, 0, 4.5 * U); D.ctx().fill();
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.dim(0, 0, Math.cos(-Math.PI / 2 + TAU * k) * R, Math.sin(-Math.PI / 2 + TAU * k) * R, 'r', 0, 15 * U);
      /* a point tracing the circumference */
      var an = -Math.PI / 2 + TAU * k;
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.circle(Math.cos(an) * R, Math.sin(an) * R, 6 * U); D.ctx().fill();
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm a circle", 0, -H * 0.36);
    } }
  ]);

  /* 00:34.646 — Then I will give you my  (variant B: handed upward) */
  S('p.giveB', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.14);
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      /* the same gesture, but mirrored — the offering changes hands */
      D.ctx().save(); D.ctx().scale(-1, 1);
      D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.8 * a));
      for (var f = -2; f <= 2; f++) {
        var len = (120 + (2 - Math.abs(f)) * 26) * U * k;
        var dx = f * 30 * U;
        D.ctx().beginPath();
        D.ctx().moveTo(dx * 0.5, 210 * U);
        D.ctx().quadraticCurveTo(dx * 1.4, 210 * U - len * 0.6, dx * 1.9, 210 * U - len);
        D.ctx().stroke();
      }
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 176 * U, 76 * U * k, 48 * U * k, 0, 0, TAU); D.ctx().stroke();
      D.ctx().restore();
      /* a radius vector leaving the palm */
      var hv = pulse(w.time, 0.3);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.85 * a));
      D.line(0, 140 * U, 0, 140 * U - (60 + hv * 40) * U);
      D.arrow(0, 140 * U - (60 + hv * 40) * U, -Math.PI / 2, 10 * U);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I will give you my', 0, -H * 0.34);
    } }
  ]);

  /* 00:36.287 — CIRCUMFERENCE. The circle unrolls into a straight line. */
  S('p.circumference', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.07);
      var k = E.inOutQuad(clamp(p / 0.62, 0, 1));
      var R = 150 * U;
      var C = TAU * R;
      D.lw(3);
      /* top half stays a circle while the bottom straightens */
      D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.circle(0, -60 * U, R, Math.PI, TAU); D.ctx().stroke();
      D.lw(3); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.ctx().beginPath();
      var N = 90;
      for (var i = 0; i <= N; i++) {
        var u = i / N;
        var ang = Math.PI + u * Math.PI;
        var cx = Math.cos(ang) * R, cy = Math.sin(ang) * R - 60 * U;
        var lx = -C / 2 + u * C, ly = 220 * U;
        var x = lerp(cx, lx, k), y = lerp(cy, ly, k);
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      if (k > 0.9) {
        D.font(17 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
        D.dim(-C / 2, 220 * U + 44 * U, C / 2, 220 * U + 44 * U, 'C = 2πr', 0, 16 * U);
      }
    } },
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.09);
      D.font(60 * U, '700'); D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('CIRCUMFERENCE', 0, -H * 0.34);
    } }
  ]);

  /* 00:37.067 — If I'm a sine wave */
  S('p.sine', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.10);
      var amp = 170 * U, sw = W * 0.94;
      D.lw(1); D.stroke(rgba(w.pal.grid, 0.34 * a));
      D.axes(0, 0, 240 * U, 't', 'y', 14 * U);
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.95 * a));
      var draw = clamp(p / 0.55, 0, 1);
      D.ctx().beginPath();
      var n = 200;
      for (var i = 0; i <= n; i++) {
        var u = i / n;
        var x = (u - 0.5) * sw;
        var y = Math.sin(u * TAU * 2 + w.time * 1.2) * amp;
        if (i === 0) D.ctx().moveTo(x, y);
        else if (u <= draw) D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      /* the dot that is the singer, sitting on the curve */
      var du = draw;
      var dx = (du - 0.5) * sw, dy = Math.sin(du * TAU * 2 + w.time * 1.2) * amp;
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.circle(dx, dy, 7 * U); D.ctx().fill();
      D.lw(1.4); D.stroke(rgba(w.pal.hot, 0.5 * a));
      D.dim(dx, dy, dx, 0, 'A', 0, 13 * U);
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm a sine wave", 0, -H * 0.38);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.5 * a));
      D.spaced('y = A sin(ωt + φ)', 0, -H * 0.38 + 28 * U, 14 * U, 2 * U, 'center');
    } }
  ]);

  /* 00:38.596 — Then you can sit on all my */
  S('p.sit', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.12);
      /* tangent segments appearing one by one along the curve */
      var amp = 160 * U, sw = W * 0.92;
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.7 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 160; i++) {
        var u = i / 160, x = (u - 0.5) * sw, y = Math.sin(u * TAU * 2 + w.time * 1.1) * amp;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      var marks = 9;
      for (i = 0; i < marks; i++) {
        var q = clamp((p - i * 0.07) / 0.3, 0, 1);
        if (q <= 0) continue;
        var uu = (i + 0.5) / marks;
        var xx = (uu - 0.5) * sw, yy = Math.sin(uu * TAU * 2 + w.time * 1.1) * amp;
        var slope = Math.cos(uu * TAU * 2 + w.time * 1.1) * amp * TAU * 2 / sw;
        var tl = 130 * U * E.outCubic(q);
        D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.9 * a * q));
        D.line(xx - tl, yy - slope * tl, xx + tl, yy + slope * tl);
        D.fill(rgba(w.pal.ink, 0.95 * a));
        D.circle(xx, yy, 5 * U); D.ctx().fill();
      }
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then you can sit on all my', 0, H * 0.38);
    } }
  ]);

  /* 00:40.049 — TANGENTS */
  S('p.tangents', [
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.07);
      var amp = 150 * U, sw = W * 1.0;
      /* curve recedes; the tangents take over */
      D.lw(1.2); D.stroke(rgba(w.pal.grid, 0.5 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 160; i++) {
        var u = i / 160, x = (u - 0.5) * sw, y = Math.sin(u * TAU * 2 + w.time * 1.1) * amp;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      var marks = 13;
      for (i = 0; i < marks; i++) {
        var q = clamp((p - i * 0.045) / 0.22, 0, 1);
        if (q <= 0) continue;
        var uu = (i + 0.5) / marks;
        var xx = (uu - 0.5) * sw, yy = Math.sin(uu * TAU * 2 + w.time * 1.1) * amp;
        var slope = Math.cos(uu * TAU * 2 + w.time * 1.1) * amp * TAU * 2 / sw;
        var tl = 190 * U * E.outQuart(q);
        D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.92 * a * (1 - q * 0.35)));
        D.line(xx - tl, yy - slope * tl, xx + tl, yy + slope * tl);
        D.fill(rgba(w.pal.ink, 0.95 * a));
        D.circle(xx, yy, 5.5 * U); D.ctx().fill();
      }
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.5 * a));
      D.spaced('dy/dx  ·  ' + marks + ' contact points', -W * 0.44, H * 0.40, 14 * U, 2 * U);
    } },
    { l: 10, e: function (w, p) {
      var a = vis(p, 0.06);
      var k = E.pop(clamp(p / 0.25, 0, 1));
      D.ctx().save(); D.ctx().scale(k, k);
      D.font(96 * U, '700'); D.ctx().textAlign = 'center';
      D.stroke(rgba(w.pal.accent, 0.7 * a)); D.lw(4);
      D.ctx().strokeText('TANGENTS', 0, -H * 0.34);
      D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().fillText('TANGENTS', 0, -H * 0.34);
      D.ctx().restore();
    } }
  ]);

  /* 00:40.706 — If I approach infinity */
  S('p.infinity', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.10);
      /* the lemniscate, drawn with a pen that runs out of resolution */
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      var sc = 250 * U;
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.ctx().beginPath();
      var N = 240;
      for (var i = 0; i <= N * k; i++) {
        var t2 = i / N * TAU;
        var x = Math.cos(t2) / (1 + Math.sin(t2) * Math.sin(t2)) * sc;
        var y = Math.sin(t2) * Math.cos(t2) / (1 + Math.sin(t2) * Math.sin(t2)) * sc;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      /* zoom rectangles converging on the crossing point */
      for (i = 0; i < 6; i++) {
        var q = clamp((p - 0.45 - i * 0.07) / 0.22, 0, 1);
        if (q <= 0) continue;
        var size = lerp(520, 40, i / 6) * U * (0.4 + 0.6 * E.outCubic(q));
        D.lw(1.2); D.stroke(rgba(w.pal.hot, 0.6 * a * (1 - q * 0.4)));
        D.srect(-size / 2, -size / 2, size, size);
      }
      D.font(15 * U); D.fill(rgba(w.pal.ink, 0.85 * a));
      D.text('lim  x → ∞', -W * 0.42, -H * 0.36);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('If I approach infinity', 0, H * 0.36);
    } }
  ]);

  /* 00:42.346 — Then you can be my */
  S('p.bemine', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.14);
      /* a curve bending towards an asymptote it will never touch */
      var k = E.outCubic(clamp(p / 0.55, 0, 1));
      D.lw(1.2); D.stroke(rgba(w.pal.grid, 0.55 * a)); D.dash([8 * U, 8 * U]);
      D.line(150 * U, -H * 0.42, 150 * U, H * 0.42);
      D.dash([]);
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.92 * a));
      D.ctx().beginPath();
      var n = 120;
      for (var i = 0; i <= n * k; i++) {
        var u = i / n;
        var x = lerp(-W * 0.44, 148 * U, u);
        var y = (110 - 120 / (1 - u * 0.94 + 0.06)) * U * 1.5;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      D.font(15 * U); D.fill(rgba(w.pal.ink, 0.85 * a));
      D.text('asymptote', 160 * U, -H * 0.38);
      /* a small gap marker: the closest approach */
      var cp = clamp((p - 0.6) / 0.3, 0, 1);
      if (cp > 0) {
        D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.9 * a));
        D.dim(150 * U, 0, 150 * U - 60 * U * (1 - cp), 0, 'never 0', 0, 14 * U);
      }
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then you can be my', 0, -H * 0.38);
    } }
  ]);

  /* 00:43.507 — LIMITATIONS */
  S('p.limitations', [
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.07);
      /* an epsilon-delta window shrinking around a limit point */
      var k = E.inQuart(clamp(p / 0.6, 0, 1));
      var box = lerp(620, 90, k) * U;
      D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.8 * a)); D.dash([10 * U, 7 * U]);
      D.srect(-box / 2, -box / 2, box, box);
      D.dash([]);
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 200; i++) {
        var u = i / 200, x = (u - 0.5) * W * 0.9;
        var y = Math.sin(u * 7 + 1) * 120 * U * Math.exp(-u * 2.2);
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.circle(0, 0, 6 * U); D.ctx().fill();
      D.font(15 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.text('|f(x) − L| < ε', -box / 2 - 8 * U, -box / 2 - 10 * U, 'right');
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.28, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(68 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().fillText('LIMITATIONS', 0, -H * 0.36);
      D.ctx().restore();
    } }
  ]);

  /* 00:44.452 — Switch my current */
  S('p.current', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      var k = clamp(p / 0.45, 0, 1);
      /* a relay arm swinging between two contacts */
      var ang = lerp(-0.7, 0.7, E.outBack(k));
      var pivY = 130 * U;
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.line(-220 * U, pivY + 90 * U, 220 * U, pivY + 90 * U);
      D.fill(rgba(w.pal.accent, 0.9 * a));
      D.circle(-190 * U, pivY + 90 * U, 9 * U); D.ctx().fill();
      D.circle(190 * U, pivY + 90 * U, 9 * U); D.ctx().fill();
      D.lw(4); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.line(0, pivY, Math.sin(ang) * 190 * U, pivY + 90 * U - Math.cos(ang) * 90 * U);
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.circle(0, pivY, 11 * U); D.ctx().fill();
      D.scircle(0, pivY, 11 * U);
      /* current flowing as a travelling dash */
      var flow = (w.time * 1.6) % 1;
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.dash([10 * U, 14 * U]);
      D.ctx().lineDashOffset = -flow * 24 * U;
      D.line(-220 * U, pivY + 90 * U, 220 * U, pivY + 90 * U);
      D.ctx().lineDashOffset = 0;
      D.dash([]);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Switch my current', 0, -H * 0.36);
    } }
  ]);

  /* 00:45.850 — To AC, to DC. The wave flips between two regimes. */
  S('p.acdc', [
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.09);
      var alt = Math.floor(w.time / 0.9231) % 2;   /* flips on the half-bar */
      var sw = W * 0.86, amp = 130 * U;
      D.lw(1); D.stroke(rgba(w.pal.grid, 0.4 * a));
      D.line(-sw / 2, 0, sw / 2, 0);
      D.lw(3.4); D.stroke(rgba(alt ? w.pal.hot : w.pal.accent, 0.95 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 220; i++) {
        var u = i / 220, x = (u - 0.5) * sw;
        var y = alt ? amp : Math.abs(Math.sin(u * TAU * 3 + w.time * 2)) * amp * 0.9 - amp * 0.1;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      D.font(56 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.96 * a));
      D.ctx().fillText(alt ? 'AC' : 'DC', 0, -H * 0.34);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.55 * a));
      D.spaced(alt ? 'alternating  ·  50 Hz' : 'direct  ·  rectified', 0, -H * 0.34 + 28 * U, 14 * U, 2 * U, 'center');
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(24 * U); D.fill(rgba(w.pal.ink, 0.88 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('To AC, to DC', 0, H * 0.38);
    } }
  ]);

  /* 00:47.672 — And then blind my vision */
  S('p.blind', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.12);
      /* an iris closing over the world */
      var k = E.inOutQuad(clamp(p / 0.62, 0, 1));
      var R = 340 * U;
      var open = lerp(R, 6 * U, k);
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.9 * a));
      /* eyelids */
      for (var i = 0; i < 22; i++) {
        var an = i / 22 * TAU;
        var x1 = Math.cos(an) * R, y1 = Math.sin(an) * R * 0.62;
        var x2 = Math.cos(an) * open, y2 = Math.sin(an) * open * 0.62;
        D.line(x1, y1, x2, y2);
      }
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.85 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 0, open, open * 0.62, 0, 0, TAU); D.ctx().stroke();
      /* the last thing seen: a bright point */
      var fade = clamp((p - 0.6) / 0.3, 0, 1);
      D.fill(rgba(w.pal.ink, (1 - fade) * 0.95 * a));
      D.circle(0, 0, (7 + pulse(w.time, 0.3) * 6) * U); D.ctx().fill();
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('And then blind my vision', 0, H * 0.38);
    } }
  ]);

  /* 00:49.534 — So dizzy, so dizzy */
  S('p.dizzy', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.10);
      var spin = w.time * 1.9;
      /* two counter-rotating spirals = vertigo */
      for (var dir = 0; dir < 2; dir++) {
        D.lw(2 - dir * 0.6);
        D.stroke(rgba(dir ? w.pal.hot : w.pal.accent, (dir ? 0.6 : 0.85) * a));
        D.ctx().beginPath();
        for (var i = 0; i <= 320; i++) {
          var u = i / 320;
          var an = u * TAU * 4 * (dir ? 1 : -1) + spin * (dir ? -1 : 1);
          var rad = u * 360 * U;
          var x = Math.cos(an) * rad, y = Math.sin(an) * rad * 0.86;
          if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
        }
        D.ctx().stroke();
      }
      /* the word, wobbling */
      D.ctx().save();
      D.ctx().rotate(Math.sin(w.time * 2.4) * 0.06);
      D.ctx().translate(Math.sin(w.time * 5.1) * 5 * U, Math.cos(w.time * 4.3) * 5 * U);
      D.font(34 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().fillText('So dizzy, so dizzy', 0, 0);
      D.ctx().restore();
    } }
  ]);

  /* 00:51.363 — Oh, we can travel */
  S('p.travel', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* star streaks rushing past a fixed viewpoint */
      var n = 90;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 811 + 3), s2 = hash(i * 4217 + 11);
        var ang = s1 * TAU;
        var z = ((s2 + w.time * 0.55) % 1);
        var rad = z * z * 700 * U;
        var len = z * z * 130 * U;
        var x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * 0.8;
        D.lw(0.8 + z * 1.8);
        D.stroke(rgba(w.pal.accent, 0.12 + z * 0.7 * a));
        D.line(x, y, Math.cos(ang) * (rad + len), Math.sin(ang) * (rad + len) * 0.8);
      }
      /* a little ship's window to ground it */
      D.lw(3); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.srect(-W * 0.5, -H * 0.5, W, H);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Oh, we can travel', 0, H * 0.38);
    } }
  ]);

  /* 00:53.225 — To A.D., to B.C. */
  S('p.adbc', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.09);
      var alt = Math.floor(w.time / 0.9231) % 2;
      /* a timeline that scrolls and flips its axis labels */
      var y = 40 * U;
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.8 * a));
      D.line(-W * 0.44, y, W * 0.44, y);
      D.lw(1.4);
      for (var i = -8; i <= 8; i++) {
        var x = i / 8 * W * 0.44;
        var big = i % 4 === 0;
        D.stroke(rgba(w.pal.accent, big ? 0.75 : 0.35 * a));
        D.line(x, y - (big ? 20 * U : 11 * U), x, y + (big ? 20 * U : 11 * U));
        if (big) {
          D.font(15 * U); D.fill(rgba(w.pal.ink, 0.8 * a));
          var lab = alt ? (i <= 0 ? (-i * 500) + ' BC' : (i * 500) + ' AD') : (i * 500) + '';
          D.ctx().textAlign = 'center';
          D.text(lab, x, y + 40 * U);
        }
      }
      /* a marker sliding along it */
      var mx = Math.sin(w.time * 0.8) * W * 0.42;
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.ngon(mx, y, 12 * U, 3, Math.PI); D.ctx().fill();
      D.font(40 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText(alt ? 'A.D.' : 'B.C.', -180 * U, -H * 0.34);
      D.ctx().fillText(alt ? 'B.C.' : 'A.D.', 180 * U, -H * 0.34);
      D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.7 * a));
      D.line(-W * 0.44, -H * 0.34 + 14 * U, W * 0.44, -H * 0.34 + 14 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(24 * U); D.fill(rgba(w.pal.ink, 0.88 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('To A.D., to B.C.', 0, H * 0.40);
    } }
  ]);

  /* 00:55.083 — And we can unite */
  S('p.unite', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* two sets merging into one */
      var k = E.inOutQuad(clamp(p / 0.6, 0, 1));
      var off = lerp(300, 0, k) * U;
      var R = 150 * U;
      D.lw(2.6);
      D.ctx().globalCompositeOperation = 'lighter';
      D.stroke(rgba(w.pal.accent, 0.75 * k));
      D.scircle(-off, 0, R);
      D.stroke(rgba(w.pal.hot, 0.75 * k));
      D.scircle(off, 0, R);
      D.ctx().globalCompositeOperation = 'source-over';
      if (k > 0.9) {
        D.fill(rgba(w.pal.ink, 0.9 * a));
        D.circle(0, 0, 5 * U); D.ctx().fill();
      }
      /* labels A ∪ B */
      D.font(22 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.text('A', -off - R * 0.4, -R * 0.6);
      D.text('B', off + R * 0.4, -R * 0.6);
      D.font(30 * U);
      D.fill(rgba(w.pal.accent, 0.9 * a));
      D.text('A ∪ B', 0, R + 70 * U);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('And we can unite', 0, H * 0.40);
    } }
  ]);

  /* 00:56.916 — So deeply, so deeply */
  S('p.deeply', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.10);
      /* nested shells descending: depth as a countable thing */
      var n = 16;
      for (var i = 0; i < n; i++) {
        var depth = 0.5 + 0.5 * Math.sin(w.time * 1.4 - i * 0.4);
        var sc = Math.pow(0.88, i);
        var al = (0.06 + depth * 0.34) * a;
        D.lw(1.6);
        D.stroke(rgba(i % 3 === 0 ? w.pal.hot : w.pal.accent, al));
        var sq = 400 * U * sc;
        D.ctx().save();
        D.ctx().rotate(i * 0.16 + w.time * 0.1);
        D.srect(-sq / 2, -sq / 2, sq, sq);
        D.ctx().restore();
      }
      var two = Math.floor(p * 2) % 2;
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, (0.35 + two * 0.6) * a));
      D.ctx().fillText('so deeply', 0, H * 0.36);
    } }
  ]);

  /* 00:59.223 — If I can  (chorus opens; the singer starts bargaining) */
  S('c.ifIcan', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.12);
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      /* a conditional branch: the diamond of an if-statement */
      var wd = 190 * U * k, ht = 120 * U * k;
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(0, -ht); D.ctx().lineTo(wd, 0); D.ctx().lineTo(0, ht); D.ctx().lineTo(-wd, 0); D.ctx().closePath();
      D.ctx().stroke();
      D.font(15 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.text('CONDITION', 0, -ht - 14 * U);
      /* true / false exits */
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.line(wd, 0, wd + 140 * U, 0); D.arrow(wd + 140 * U, 0, 0, 10 * U);
      D.line(0, ht, 0, ht + 110 * U); D.arrow(0, ht + 110 * U, Math.PI / 2, 10 * U);
      D.fill(rgba(w.pal.hot, 0.9 * a));
      D.text('TRUE', wd + 60 * U, -12 * U);
      D.fill(rgba(w.pal.grid, 0.9 * a));
      D.text('FALSE', 40 * U, ht + 60 * U, 'left');
    } }
  ]);

  /* 00:59.687 — If I can give you all the */
  S('c.giveall', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* hands opening outward, releasing everything at once */
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      for (var side = -1; side <= 1; side += 2) {
        D.ctx().save();
        D.ctx().translate(side * 200 * U * k, 0);
        D.ctx().scale(side, 1);
        D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.75 * a));
        for (var f = -1; f <= 2; f++) {
          D.ctx().beginPath();
          D.ctx().moveTo(0, 120 * U);
          D.ctx().quadraticCurveTo(f * 26 * U, 40 * U, f * 40 * U, -50 * U);
          D.ctx().stroke();
        }
        D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
        D.ctx().beginPath(); D.ctx().ellipse(0, 110 * U, 62 * U, 40 * U, 0, 0, TAU); D.ctx().stroke();
        D.ctx().restore();
      }
      /* everything pours out between them */
      var n = Math.round(60 * k);
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 313 + 7), s2 = hash(i * 977 + 13);
        var pr = clamp((p - s1 * 0.35) / 0.4, 0, 1);
        var ang = (s2 - 0.5) * 2.4;
        var dist = E.outQuart(pr) * 320 * U;
        D.fill(rgba(s1 > 0.7 ? w.pal.hot : w.pal.accent, 0.5 * a * (1 - pr * 0.4)));
        D.ngon(Math.sin(ang) * dist, -Math.cos(ang) * dist + 40 * U, (5 + s1 * 9) * U, 4, pr * 3);
        D.ctx().fill();
      }
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('If I can give you all the', 0, -H * 0.38);
    } }
  ]);

  /* 01:01.958 — STIMULATIONS. The whole frame vibrates. */
  S('c.stim', [
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.06);
      var pl = pulse(w.time, 0.34);
      /* a field of needles driven by the actual played notes */
      var n = 88;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 7331 + 3);
        var x = (i / (n - 1) - 0.5) * W * 0.94;
        var hgt = (40 + noise(i * 0.3, w.time * 3.4) * 260 + pl * 120) * U;
        D.lw(2);
        D.stroke(rgba(i % 7 === 0 ? w.pal.hot : w.pal.accent, 0.30 + s1 * 0.55 * a));
        D.line(x, 150 * U, x, 150 * U - hgt);
      }
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.line(-W * 0.47, 150 * U, W * 0.47, 150 * U);
      /* the word, struck */
      D.ctx().save();
      D.ctx().translate((hash(Math.floor(w.time * 24) * 17) - 0.5) * pl * 22 * U, 0);
      D.font(74 * U, '700'); D.ctx().textAlign = 'center';
      D.stroke(rgba(w.pal.hot, 0.9 * a)); D.lw(6);
      D.ctx().strokeText('STIMULATIONS', 0, -H * 0.24);
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('STIMULATIONS', 0, -H * 0.24);
      D.ctx().restore();
    } }
  ]);

  /* 01:02.589 — Then I can */
  S('c.thenIcan', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.14);
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      /* the consequence block, sliding in below the condition */
      var wd = 360 * U, ht = 90 * U * k;
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85 * a));
      D.srect(-wd / 2, -ht / 2, wd, ht);
      D.font(16 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.text('CONSEQUENCE', 0, 6 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.line(0, -ht / 2 - 110 * U, 0, -ht / 2);
      D.arrow(0, -ht / 2, Math.PI / 2, 10 * U);
    } }
  ]);

  /* 01:03.535 — Then I can be your only */
  S('c.only', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* one dot survives; every other dot is crossed out */
      var n = 46;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 5717 + 3), s2 = hash(i * 2237 + 11);
        var x = (s1 - 0.5) * W * 0.82, y = (s2 - 0.5) * H * 0.58;
        var q = clamp((p - 0.15 - s1 * 0.4) / 0.25, 0, 1);
        var isOne = i === 0;
        if (isOne) {
          var pl = pulse(w.time, 0.4);
          D.fill(rgba(w.pal.ink, 0.95 * a));
          D.circle(0, 0, (8 + pl * 10) * U); D.ctx().fill();
          D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.7 * a));
          D.scircle(0, 0, (26 + pl * 26) * U);
          continue;
        }
        D.fill(rgba(w.pal.grid, 0.5 * a * (1 - q * 0.7)));
        D.circle(x, y, 3.4 * U); D.ctx().fill();
        if (q > 0) {
          D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.8 * a * q));
          var e2 = 11 * U * E.outCubic(q);
          D.line(x - e2, y - e2, x + e2, y + e2);
          D.line(x + e2, y - e2, x - e2, y + e2);
        }
      }
      D.font(24 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('be your only', 0, H * 0.38);
    } }
  ]);

  /* 01:05.397 — SATISFACTION */
  S('c.satis', [
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.07);
      /* an equation that finally balances */
      var k = E.outCubic(clamp(p / 0.55, 0, 1));
      var y = 20 * U;
      D.font(34 * U); D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().textAlign = 'center';
      var lhs = 'need', rhs = 'you';
      D.text(lhs, -220 * U, y);
      D.text(rhs, 220 * U, y);
      /* the equals sign draws itself, then the scale tips level */
      D.lw(4); D.stroke(rgba(w.pal.accent, 0.95 * a));
      D.line(-60 * U, y - 16 * U, -60 * U + 120 * U * k, y - 16 * U);
      D.line(-60 * U, y + 6 * U, -60 * U + 120 * U * k, y + 6 * U);
      /* a balance beam levelling out */
      var tilt = lerp(-0.28, 0, E.outElastic(k));
      D.ctx().save(); D.ctx().translate(0, y + 150 * U); D.ctx().rotate(tilt);
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.line(-260 * U, 0, 260 * U, 0);
      D.lw(2); D.stroke(rgba(w.pal.grid, 0.8 * a));
      D.line(-260 * U, 0, -260 * U, 40 * U); D.line(260 * U, 0, 260 * U, 40 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.8 * a));
      D.ngon(-260 * U, 46 * U, 26 * U, 3, Math.PI); D.ctx().stroke();
      D.ngon(260 * U, 46 * U, 26 * U, 3, Math.PI); D.ctx().stroke();
      D.ctx().restore();
      D.lw(2.4); D.stroke(rgba(w.pal.grid, 0.8 * a));
      D.line(0, y + 150 * U, 0, y + 230 * U);
      D.ngon(0, y + 238 * U, 26 * U, 3, 0); D.ctx().stroke();
    } },
    { l: 14, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.28, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(64 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().fillText('SATISFACTION', 0, -H * 0.36);
      D.ctx().restore();
    } }
  ]);

  /* 01:06.601 — If I can make you happy */
  S('c.happy', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a smile drawn as a parabola, and two eyes plotted on an axis */
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      var R = 210 * U;
      D.lw(1); D.stroke(rgba(w.pal.grid, 0.4 * a));
      D.axes(-R - 50 * U, 0, R + 60 * U, null, null);
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 80 * k; i++) {
        var u = i / 80;
        var x = (u - 0.5) * R * 2;
        var y = (u - 0.5) * (u - 0.5) * R * 1.5 - 40 * U;
        if (i === 0) D.ctx().moveTo(x, y); else D.ctx().lineTo(x, y);
      }
      D.ctx().stroke();
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.circle(-72 * U, -110 * U, 9 * U); D.ctx().fill();
      D.circle(72 * U, -110 * U, 9 * U); D.ctx().fill();
      D.fill(rgba(w.pal.hot, 0.9 * a));
      D.circle(-72 * U, -110 * U, 3.4 * U); D.ctx().fill();
      D.circle(72 * U, -110 * U, 3.4 * U); D.ctx().fill();
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.text('y = x²', R + 20 * U, -20 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('If I can make you happy', 0, H * 0.38);
    } }
  ]);

  /* 01:08.252 — I will run the */
  S('c.runthe', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a command being typed into a shell, then committed */
      var bx = -W * 0.34, by = -40 * U;
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.srect(bx - 20 * U, by - 60 * U, W * 0.68, 200 * U);
      D.font(24 * U); D.fill(rgba(w.pal.accent, 0.9 * a));
      var cmd = 'run --target=self --when=you_are_happy';
      var q = clamp(p / 0.55, 0, 1);
      D.type('$ ' + cmd, bx, by, 24 * U, q, { track: 2 * U, glow: true, blink: Math.sin(w.time * 9) > 0 ? 1 : 0 });
      /* output waiting underneath */
      var q2 = clamp((p - 0.6) / 0.3, 0, 1);
      if (q2 > 0) {
        D.fill(rgba(w.pal.hot, 0.9 * a * q2));
        D.font(20 * U);
        D.text('> compiling…  ' + '█'.repeat(Math.round(q2 * 14)), bx, by + 56 * U);
      }
    } }
  ]);

  /* 01:09.259 — EXECUTION (first time — small, almost tender) */
  S('ex.first', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.10);
      var pl = pulse(w.time, 0.4);
      var k = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 10 * U); D.ctx().scale(k, k);
      D.font(66 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.96 * a));
      D.ctx().fillText('EXECUTION', 0, 0);
      D.ctx().restore();
      /* a single gear engaging — the mechanism starts */
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.8 * a));
      var R = 190 * U, te = 18;
      D.ngon(0, 0, R, te, w.time * 0.5, function (i) { return R * (i % 2 ? 0.9 : 1.0); });
      D.ctx().stroke();
      D.scircle(0, 0, R * 0.55);
      D.fill(rgba(w.pal.hot, 0.35 + pl * 0.5));
      D.circle(0, 0, R * 0.18); D.ctx().fill();
    } }
  ]);

  /* 01:10.084 — Though we are trapped */
  S('c.trapped', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a cage closing cell by cell */
      var cols = 9, rows = 6;
      var cw = W * 0.9 / cols, ch = H * 0.7 / rows;
      for (var i = 0; i <= cols; i++) {
        for (var j = 0; j <= rows; j++) {
          var idx = i * (rows + 1) + j;
          var q = clamp((p - hash(idx * 313) * 0.62) / 0.3, 0, 1);
          if (q <= 0) continue;
          var x1 = -W * 0.45 + i * cw, y1 = -H * 0.35 + j * ch;
          var shrink = lerp(0.5, 1, E.outCubic(q));
          D.lw(1.8);
          D.stroke(rgba(w.pal.accent, 0.55 * q * a));
          /* each cell drawn as an inward-collapsing square */
          var ex = x1 + cw * (1 - shrink) / 2, ey = y1 + ch * (1 - shrink) / 2;
          D.srect(ex, ey, cw * shrink, ch * shrink);
        }
      }
      D.fill(rgba(w.pal.hot, 0.5 + 0.5 * Math.abs(Math.sin(w.time * 1.5)) * a));
      D.circle(0, 0, 7 * U); D.ctx().fill();
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Though we are trapped', 0, H * 0.40);
    } }
  ]);

  /* 01:11.764 — In this strange, strange */
  S('c.strange', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.12);
      /* the room tilts and repeats — an Escher-ish stack of the same frame */
      var alt = Math.floor(p * 2) % 2;
      for (var i = 5; i >= 0; i--) {
        var q = clamp((p - i * 0.05) / 0.4, 0, 1);
        if (q <= 0) continue;
        var sc = Math.pow(0.82, i) * E.outCubic(q);
        D.ctx().save();
        D.ctx().rotate((i % 2 ? 1 : -1) * 0.06 * i + (alt ? 0.03 : -0.03));
        D.ctx().scale(sc, sc);
        D.lw(2 - i * 0.15);
        D.stroke(rgba(i % 2 ? w.pal.hot : w.pal.accent, (0.55 - i * 0.07) * a));
        D.srect(-W * 0.36, -H * 0.30, W * 0.72, H * 0.60);
        D.ctx().restore();
      }
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText(alt ? 'strange,' : 'strange, strange', 0, H * 0.40);
    } }
  ]);

  /* 01:13.169 — SIMULATION (second time — the walls are visible now) */
  S('c.sim2', [
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.08);
      /* the same word as 00:13.891, but now we can see the mesh it is made of */
      var kk = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 20 * U); D.ctx().scale(kk, kk);
      D.font(104 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.17 * a));
      D.ctx().fillText('SIMULATION', 0, 0);
      D.lw(1); D.stroke(rgba(w.pal.accent, 0.75 * a));
      D.ctx().strokeText('SIMULATION', 0, 0);
      D.ctx().restore();
      /* a wireframe box around the whole word = the boundary of the world */
      var q = clamp((p - 0.2) / 0.4, 0, 1);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.7 * a * q));
      D.srect(-W * 0.36, -H * 0.22, W * 0.72, H * 0.44);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.55 * a * q));
      D.spaced('BOUNDS  x∈[−1,1]   y∈[−1,1]   z∈[−1,1]', -W * 0.36, -H * 0.22 - 18 * U, 14 * U, 2 * U);
    } }
  ]);

  EM.__part1 = true;
})(window.EM);
