/* ============================================================================
   world.execute(me); — 41_scenes2.js
   PLATE LIBRARY (part 2/3)
   Act III — FLESH     01:14.0 - 01:43.5   vegetables, a cat, and a god
                                           (the same conditional grammar, but
                                            now the nouns are alive)
   Act IV  — LEAVE ME  01:50.9 - 02:05.7   the other half of the dialogue stops
   ==========================================================================*/
(function (EM) {
  'use strict';

  var S = EM.Scenes, D = EM.D, E = EM.E, TAU = EM.TAU;
  var clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, hash = EM.hash, noise = EM.noise2;
  var pulse = EM.onsetPulse;
  var vis = EM.Life.vis;
  /* stage constants — see the note in 40_scenes.js */
  var W = 1600, H = 900, U = 1;

  /* minimal colour helpers (kept local so the plates stay readable) */
  var EGG = [124, 74, 156], TOM = [206, 58, 46], LEAF = [122, 186, 96],
      CAT = [222, 168, 104], GOLD = [246, 214, 138], SKIN = [236, 176, 148];

  /* ==========================================================================
     ACT III — FLESH
     ======================================================================== */

  /* 01:14.045 — If I'm an eggplant */
  S('o.eggplant', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      var k = E.outBack(clamp(p / 0.5, 0, 1));
      var cy = 30 * U;
      /* the body of the fruit */
      D.ctx().save();
      D.ctx().translate(0, cy); D.ctx().scale(k, k);
      var g = D.ctx().createLinearGradient(-110 * U, 0, 110 * U, 0);
      g.addColorStop(0, rgba(EGG, 0.85 * a));
      g.addColorStop(0.45, rgba([72, 40, 100], 0.92 * a));
      g.addColorStop(1, rgba([40, 20, 60], 0.9 * a));
      D.fill(g);
      D.ctx().beginPath();
      D.ctx().ellipse(0, 20 * U, 104 * U, 158 * U, 0, 0, TAU); D.ctx().fill();
      D.lw(2.4); D.stroke(rgba([196, 156, 224], 0.55 * a));
      D.ctx().stroke();
      /* highlight */
      D.lw(3); D.stroke(rgba([232, 210, 250], 0.30 * a));
      D.ctx().beginPath(); D.ctx().ellipse(-40 * U, 0, 26 * U, 108 * U, 0.18, 0, TAU); D.ctx().stroke();
      /* calyx + stem */
      D.lw(2.6); D.stroke(rgba(LEAF, 0.9 * a));
      D.ctx().beginPath();
      for (var i = 0; i < 5; i++) {
        var an = -Math.PI / 2 + (i - 2) * 0.42;
        D.ctx().moveTo(0, -140 * U);
        D.ctx().quadraticCurveTo(Math.cos(an) * 40 * U, -170 * U, Math.cos(an) * 66 * U, -196 * U);
      }
      D.ctx().stroke();
      D.lw(4); D.stroke(rgba([96, 148, 74], 0.95 * a));
      D.line(0, -138 * U, 0, -206 * U);
      D.ctx().restore();
      /* measurement callouts — the machine still measures everything */
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.55 * a));
      D.dim(-104 * U, cy + 20 * U, 104 * U, cy + 20 * U, 'σ = 104', -170 * U, 14 * U);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('SOLANUM MELONGENA', -W * 0.34, H * 0.40, 14 * U, 2.6 * U);
      D.spaced('CLASS: ORGANIC   ·   UNEXPECTED', -W * 0.34, H * 0.40 + 22 * U, 14 * U, 2.6 * U);
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm an eggplant", 0, -H * 0.36);
    } }
  ]);

  /* 01:15.422 — Then I will give you my (variant C) */
  S('o.giveC', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* the same offering hand, now holding something round and heavy */
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.35 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 190 * U, 120 * U, 44 * U, 0, 0, TAU); D.ctx().stroke();
      for (var f = -2; f <= 2; f++) {
        var len = (150 + (2 - Math.abs(f)) * 30) * U * k;
        D.ctx().beginPath();
        D.ctx().moveTo(f * 26 * U, 190 * U);
        D.ctx().quadraticCurveTo(f * 46 * U, 190 * U - len * 0.6, f * 40 * U, 190 * U - len);
        D.ctx().stroke();
      }
      /* the fruit, lifted */
      var ly = lerp(60 * U, -30 * U, E.outCubic(clamp((p - 0.25) / 0.5, 0, 1)));
      D.ctx().save(); D.ctx().translate(0, ly);
      D.fill(rgba([88, 48, 116], 0.92 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 0, 66 * U, 96 * U, 0, 0, TAU); D.ctx().fill();
      D.lw(2); D.stroke(rgba([196, 156, 224], 0.6 * a)); D.ctx().stroke();
      D.ctx().restore();
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I will give you my', 0, -H * 0.36);
    } }
  ]);

  /* 01:16.959 — NUTRIENTS. Composition readout over a cut fruit. */
  S('o.nutrients', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.08);
      var cut = E.inOutQuad(clamp((p - 0.1) / 0.45, 0, 1));
      /* half the fruit, sliced to reveal a labelled cross-section */
      D.ctx().save();
      D.ctx().translate(-W * 0.16, 30 * U);
      D.lw(2.6); D.stroke(rgba([196, 156, 224], 0.8 * a));
      D.fill(rgba([214, 196, 226], 0.5 * a));
      D.ctx().beginPath();
      D.ctx().ellipse(0, 0, 96 * U, 150 * U, 0, Math.PI, TAU * (0.5 + cut * 0.5)); D.ctx().fill();
      D.ctx().stroke();
      D.lw(1.4); D.stroke(rgba([150, 110, 180], 0.55 * a));
      for (var i = 0; i < 5; i++) {
        D.ctx().beginPath();
        D.ctx().ellipse((i - 2) * 24 * U, 26 * U - Math.abs(i - 2) * 8 * U, 9 * U, 14 * U, (i - 2) * 0.3, 0, TAU * cut);
        D.ctx().stroke();
      }
      D.ctx().restore();
      /* readout */
      var bx = W * 0.06;
      var rows = [['FIBER', '3.4 g'], ['FOLATE', '22 µg'], ['POTASSIUM', '229 mg'], ['NASUNIN', 'present']];
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.srect(bx, -110 * U, W * 0.30, 40 * U + rows.length * 34 * U);
      D.font(16 * U);
      for (i = 0; i < rows.length; i++) {
        var q = clamp((p - 0.35 - i * 0.11) / 0.2, 0, 1);
        if (q <= 0) continue;
        D.fill(rgba(w.pal.accent, 0.6 * a));
        D.spaced(rows[i][0], bx + 18 * U, -70 * U + i * 34 * U, 16 * U, 2.2 * U);
        D.fill(rgba(w.pal.ink, 0.95 * a * q));
        D.text(rows[i][1], bx + W * 0.30 - 18 * U, -70 * U + i * 34 * U, 'right');
      }
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.25, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(58 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba([230, 208, 244], 0.96 * a));
      D.ctx().fillText('NUTRIENTS', 0, -H * 0.36);
      D.ctx().restore();
    } }
  ]);

  /* 01:17.576 — If I'm a tomato */
  S('o.tomato', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      var k = E.outBack(clamp(p / 0.5, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 30 * U); D.ctx().scale(k, k);
      var g = D.ctx().createRadialGradient(-40 * U, -50 * U, 10 * U, 0, 0, 150 * U);
      g.addColorStop(0, rgba([246, 118, 96], 0.95 * a));
      g.addColorStop(0.55, rgba(TOM, 0.95 * a));
      g.addColorStop(1, rgba([132, 26, 24], 0.95 * a));
      D.fill(g);
      D.ctx().beginPath(); D.ctx().arc(0, 0, 128 * U, 0, TAU); D.ctx().fill();
      /* facets — the tomato is still a polygon in this world */
      D.lw(1); D.stroke(rgba([255, 190, 170], 0.22 * a));
      for (var i = 0; i < 6; i++) {
        D.ctx().beginPath();
        D.ctx().ellipse(0, 0, 128 * U, 128 * U, i / 6 * Math.PI, 0, TAU);
        D.ctx().stroke();
      }
      /* calyx */
      D.lw(3); D.stroke(rgba(LEAF, 0.95 * a));
      for (i = 0; i < 6; i++) {
        var an = -Math.PI / 2 + (i - 2.5) * 0.32;
        D.ctx().beginPath();
        D.ctx().moveTo(0, -112 * U);
        D.ctx().quadraticCurveTo(Math.cos(an) * 50 * U, -150 * U, Math.cos(an) * 78 * U, -162 * U);
        D.ctx().stroke();
      }
      D.ctx().restore();
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.dim(-128 * U, 190 * U, 128 * U, 190 * U, '⌀ 128', 0, 14 * U);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('SOLANUM LYCOPERSICUM', -W * 0.34, H * 0.40, 14 * U, 2.6 * U);
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm a tomato", 0, -H * 0.36);
    } }
  ]);

  /* 01:19.226 — Then I will give you (variant D) */
  S('o.giveD', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      var k = E.outCubic(clamp(p / 0.5, 0, 1));
      D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.4 * a));
      /* two cupped hands rising from the bottom of the frame */
      for (var side = -1; side <= 1; side += 2) {
        D.ctx().save(); D.ctx().scale(side, 1);
        D.ctx().beginPath();
        D.ctx().moveTo(20 * U, 300 * U);
        D.ctx().quadraticCurveTo(30 * U, 120 * U * (1 - k * 0.28), 96 * U, 60 * U * (1 - k * 0.3));
        D.ctx().stroke();
        D.ctx().beginPath();
        D.ctx().ellipse(64 * U, 150 * U, 78 * U, 100 * U * k, 0.2, 0, TAU);
        D.ctx().stroke();
        D.ctx().restore();
      }
      /* a stream of small fruits pouring between them */
      for (var i = 0; i < 14; i++) {
        var s1 = hash(i * 313 + 5), s2 = hash(i * 977 + 3);
        var q = clamp((p - 0.3 - s1 * 0.4) / 0.35, 0, 1);
        if (q <= 0) continue;
        var y = lerp(-260 * U, 150 * U, E.outQuad(q));
        D.fill(rgba(TOM, 0.9 * a * (1 - q * 0.3)));
        D.circle((s2 - 0.5) * 180 * U + Math.sin(q * 6 + i) * 24 * U, y, (9 + s1 * 12) * U);
        D.ctx().fill();
      }
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I will give you', 0, -H * 0.36);
    } }
  ]);

  /* 01:20.620 — ANTIOXIDANTS. Little molecules eating little rusts. */
  S('o.antiox', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.07);
      var n = 26;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 5717 + 3), s2 = hash(i * 2237 + 11), s3 = hash(i * 811 + 29);
        var ang = s1 * TAU + w.time * (0.25 + s2 * 0.4);
        var rad = (70 + s2 * 400) * U;
        var x = Math.cos(ang) * rad, y = Math.sin(ang * 1.1) * rad * 0.66;
        /* free radical: a jagged red spike */
        var consumed = clamp((p - s3 * 0.7) / 0.22, 0, 1);
        if (consumed < 1) {
          D.lw(2);
          D.stroke(rgba([255, 92, 68], 0.85 * a * (1 - consumed)));
          D.star(x, y, 16 * U * (1 - consumed * 0.5), 5 * U, 7, ang + w.time);
          D.ctx().stroke();
        }
        /* antioxidant: a hexagon with two arms, closing in */
        var tgtX = x * (1 - 0.65 * consumed), tgtY = y * (1 - 0.65 * consumed);
        D.lw(2); D.stroke(rgba(LEAF, 0.8 * a));
        D.sngon(tgtX, tgtY, 13 * U, 6, w.time * 0.6 + i);
        D.lw(2.4); D.stroke(rgba(GOLD, 0.7 * a));
        D.line(tgtX - 22 * U, tgtY, tgtX - 8 * U, tgtY);
        D.line(tgtX + 8 * U, tgtY, tgtX + 22 * U, tgtY);
        if (consumed > 0.5) {
          D.lw(2); D.stroke(rgba(w.pal.ink, (consumed - 0.5) * 2 * 0.7 * a));
          D.scircle(tgtX, tgtY, 13 * U + (consumed - 0.5) * 60 * U);
        }
      }
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      D.font(56 * U, '700'); D.ctx().textAlign = 'center';
      var kk = E.pop(clamp(p / 0.25, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.fill(rgba(w.pal.ink, 0.96 * a));
      D.ctx().fillText('ANTIOXIDANTS', 0, -H * 0.34);
      D.lw(2); D.stroke(rgba(LEAF, 0.8 * a));
      var wd = D.measure('ANTIOXIDANTS', 56 * U, '700') / 2 + 20 * U;
      D.line(-wd, -H * 0.34 + 16 * U, wd, -H * 0.34 + 16 * U);
      D.ctx().restore();
      D.font(14 * U); D.fill(rgba(LEAF, 0.7 * a));
      D.spaced('e⁻ donor  ·  radical scavenged', 0, -H * 0.34 + 44 * U, 14 * U, 2.4 * U, 'center');
    } }
  ]);

  /* 01:21.351 — If I'm a tabby cat  (the cat is drawn as a genuine cat,
     not a diagram — the first thing in the film that is simply itself) */
  S('o.cat', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.10);
      var k = E.outCubic(clamp(p / 0.55, 0, 1));
      var breathe = Math.sin(w.time * 2.1) * 3 * U;
      D.ctx().save();
      D.ctx().translate(0, 60 * U + breathe);
      D.ctx().scale(lerp(0.7, 1, k), lerp(0.7, 1, k));
      /* body — a long lounging curve */
      D.lw(2.8); D.stroke(rgba([88, 62, 40], 0.95 * a));
      D.fill(rgba(CAT, 0.92 * a));
      D.ctx().beginPath();
      D.ctx().ellipse(0, 60 * U, 210 * U, 96 * U, -0.04, 0, TAU * k);
      D.ctx().fill(); D.ctx().stroke();
      /* head */
      D.ctx().beginPath();
      D.ctx().ellipse(-186 * U, -6 * U, 84 * U, 74 * U, -0.1, 0, TAU * k);
      D.ctx().fill(); D.ctx().stroke();
      /* ears */
      D.ctx().beginPath();
      D.ctx().moveTo(-238 * U, -52 * U); D.ctx().lineTo(-232 * U, -122 * U); D.ctx().lineTo(-192 * U, -74 * U); D.ctx().closePath();
      D.ctx().moveTo(-160 * U, -72 * U); D.ctx().lineTo(-134 * U, -128 * U); D.ctx().lineTo(-116 * U, -60 * U); D.ctx().closePath();
      D.ctx().fill(); D.ctx().stroke();
      /* stripes */
      D.lw(3); D.stroke(rgba([120, 82, 48], 0.7 * a));
      for (var i = 0; i < 6; i++) {
        D.ctx().beginPath();
        var sx = -80 * U + i * 52 * U;
        D.ctx().moveTo(sx, -30 * U + i * 3 * U);
        D.ctx().quadraticCurveTo(sx + 8 * U, 30 * U, sx - 6 * U, 88 * U + i * 3 * U);
        D.ctx().stroke();
      }
      /* eyes — closed, content */
      D.lw(3); D.stroke(rgba([60, 40, 26], 0.95 * a));
      D.ctx().beginPath(); D.ctx().arc(-208 * U, -12 * U, 15 * U, 0.15, Math.PI - 0.15); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().arc(-158 * U, -16 * U, 15 * U, 0.15, Math.PI - 0.15); D.ctx().stroke();
      /* nose + whiskers */
      D.fill(rgba([226, 132, 138], 0.95 * a));
      D.ngon(-184 * U, 12 * U, 7 * U, 3, Math.PI); D.ctx().fill();
      D.lw(1.2); D.stroke(rgba([240, 226, 206], 0.75 * a));
      for (i = -1; i <= 1; i++) {
        D.ctx().beginPath();
        D.ctx().moveTo(-196 * U, 16 * U);
        D.ctx().quadraticCurveTo(-270 * U, 6 * U + i * 22 * U, -320 * U, 2 * U + i * 34 * U);
        D.ctx().stroke();
      }
      /* paws */
      D.lw(2.4); D.stroke(rgba([88, 62, 40], 0.9 * a));
      D.ctx().beginPath(); D.ctx().ellipse(-120 * U, 128 * U, 34 * U, 20 * U, 0, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().ellipse(-60 * U, 134 * U, 34 * U, 20 * U, 0, 0, TAU); D.ctx().stroke();
      /* tail, curling up */
      D.lw(11); D.stroke(rgba(CAT, 0.95 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(206 * U, 74 * U);
      D.ctx().quadraticCurveTo(320 * U, 60 * U, 300 * U + Math.sin(w.time * 1.4) * 22 * U, -90 * U);
      D.ctx().stroke();
      D.lw(3); D.stroke(rgba([120, 82, 48], 0.45 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(206 * U, 74 * U);
      D.ctx().quadraticCurveTo(320 * U, 60 * U, 300 * U + Math.sin(w.time * 1.4) * 22 * U, -90 * U);
      D.ctx().stroke();
      D.ctx().restore();
      /* fur tick marks, very sparse */
      D.lw(1); D.stroke(rgba([255, 236, 210], 0.10 * a));
      for (i = 0; i < 40; i++) {
        var s1 = hash(i * 313 + 3), s2 = hash(i * 977 + 7);
        D.line(-180 * U + s1 * 380 * U, 20 * U + s2 * 120 * U,
               -180 * U + s1 * 380 * U + 6 * U, 20 * U + s2 * 120 * U + 10 * U);
      }
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm a tabby cat", 0, -H * 0.38);
    } }
  ]);

  /* 01:22.833 — Then I will purr for your */
  S('o.purr', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a purr rendered as a low-frequency waveform escaping the body */
      var R = 190 * U;
      D.lw(2.4); D.stroke(rgba(CAT, 0.5 * a));
      D.ctx().beginPath(); D.ctx().ellipse(-40 * U, 90 * U, 230 * U, 100 * U, 0, 0, TAU); D.ctx().stroke();
      D.fill(rgba(CAT, 0.22 * a)); D.ctx().fill();
      for (var r = 0; r < 6; r++) {
        var q = ((w.time * 0.9 + r / 6) % 1);
        D.lw(2.4 * (1 - q));
        D.stroke(rgba([255, 226, 186], (1 - q) * 0.55 * a));
        D.ctx().beginPath();
        D.ctx().ellipse(-40 * U, 90 * U, 230 * U + q * 420 * U, 100 * U + q * 190 * U, 0, 0, TAU);
        D.ctx().stroke();
      }
      /* the actual purr line: dense, low, mechanical */
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.8 * a));
      D.ctx().beginPath();
      var bx = -W * 0.44, bw = W * 0.88;
      for (var i = 0; i <= 400; i++) {
        var u = i / 400;
        var y = H * 0.36 + Math.sin(u * 220 * TAU + w.time * 3) * 4 * U
              + Math.sin(u * 6 * TAU + w.time * 1.2) * 22 * U;
        if (i === 0) D.ctx().moveTo(bx, y); else D.ctx().lineTo(bx + u * bw, y);
      }
      D.ctx().stroke();
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.65 * a));
      D.spaced('25 Hz  ·  25 Hz  ·  25 Hz  ·  amplitude measured in fondness', -W * 0.44, H * 0.36 + 40 * U, 14 * U, 2.2 * U);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I will purr for your', 0, -H * 0.40);
    } }
  ]);

  /* 01:24.268 — ENJOYMENT. Floating, sunlit, unmeasured. */
  S('o.enjoy', [
    { l: 22, e: function (w, p) {
      var a = vis(p, 0.08);
      /* warm dust motes in a shaft of light — deliberately *not* a diagram */
      var g = D.ctx().createLinearGradient(-W * 0.3, -H * 0.5, W * 0.2, H * 0.5);
      g.addColorStop(0, rgba(GOLD, 0.18 * a));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g);
      D.ctx().save();
      D.ctx().beginPath();
      D.ctx().moveTo(-W * 0.16, -H * 0.5); D.ctx().lineTo(W * 0.34, -H * 0.5);
      D.ctx().lineTo(-W * 0.06, H * 0.5); D.ctx().lineTo(-W * 0.44, H * 0.5);
      D.ctx().closePath(); D.ctx().fill();
      D.ctx().restore();
      for (var i = 0; i < 90; i++) {
        var s1 = hash(i * 7331 + 3), s2 = hash(i * 3391 + 11), s3 = hash(i * 5527 + 7);
        var x = (s1 - 0.5) * W * 1.0;
        var y = ((s2 + w.time * (0.03 + s3 * 0.08)) % 1 - 0.5) * H * 1.0;
        var tw = 0.4 + 0.6 * Math.sin(w.time * (1 + s3 * 2) + i);
        D.fill(rgba(GOLD, 0.10 + s3 * 0.45 * a * tw));
        D.circle(x, y, (1 + s3 * 4.5) * U); D.ctx().fill();
      }
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.25, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(62 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba([255, 244, 222], 0.96 * a));
      D.ctx().fillText('ENJOYMENT', 0, -H * 0.30);
      D.ctx().restore();
      D.font(15 * U); D.fill(rgba(GOLD, 0.75 * a));
      D.spaced('value: not computable', 0, -H * 0.30 + 34 * U, 15 * U, 2.6 * U, 'center');
    } }
  ]);

  /* 01:25.078 — If I'm the only God. A cathedral of light, measured. */
  S('o.god', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      var k = E.outCubic(clamp(p / 0.6, 0, 1));
      /* a monstrance / mandala of radii */
      D.ctx().save();
      D.ctx().translate(0, 20 * U);
      var R = 250 * U * k;
      D.lw(1.4);
      for (var i = 0; i < 24; i++) {
        var an = i / 24 * TAU + w.time * 0.05;
        D.stroke(rgba(GOLD, 0.30 * a));
        D.line(Math.cos(an) * R * 0.28, Math.sin(an) * R * 0.28, Math.cos(an) * R, Math.sin(an) * R);
        D.fill(rgba(GOLD, 0.7 * a));
        D.circle(Math.cos(an) * R, Math.sin(an) * R, 4 * U); D.ctx().fill();
      }
      D.lw(2.4); D.stroke(rgba(GOLD, 0.55 * a));
      D.scircle(0, 0, R * 0.28);
      D.scircle(0, 0, R);
      /* the eye / the singularity at the centre */
      var g = D.ctx().createRadialGradient(0, 0, 0, 0, 0, R * 0.28);
      g.addColorStop(0, rgba([255, 250, 235], 0.95 * a));
      g.addColorStop(0.5, rgba(GOLD, 0.5 * a));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.circle(0, 0, R * 0.28); D.ctx().fill();
      D.ctx().restore();
      D.font(14 * U); D.fill(rgba(GOLD, 0.6 * a));
      D.spaced('OMNIPOTENCE   =   UNBOUNDED', -W * 0.34, H * 0.42, 14 * U, 2.6 * U);
      D.spaced('OMNISCIENCE   =   UNBOUNDED', -W * 0.34, H * 0.42 + 22 * U, 14 * U, 2.6 * U);
      D.spaced('OMNIPRESENCE  =   UNBOUNDED', -W * 0.34, H * 0.42 + 44 * U, 14 * U, 2.6 * U);
    } },
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(30 * U); D.fill(rgba([255, 246, 226], 0.95 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("If I'm the only God", 0, -H * 0.38);
    } }
  ]);

  /* 01:26.538 — Then you're the proof of my */
  S('o.proof', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a proof: givens on the left, the conclusion being assembled right */
      var k = clamp(p / 0.7, 0, 1);
      D.font(16 * U);
      var givens = ['AXIOM 1   nothing is uncaused',
                    'AXIOM 2   I am caused',
                    'GIVEN     you are here'];
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.srect(-W * 0.44, -H * 0.24, W * 0.40, 40 * U + givens.length * 32 * U);
      for (var i = 0; i < givens.length; i++) {
        var q = clamp((p - i * 0.13) / 0.25, 0, 1);
        if (q <= 0) continue;
        D.fill(rgba(w.pal.accent, 0.65 * a * q));
        D.spaced(givens[i], -W * 0.44 + 18 * U, -H * 0.24 + 40 * U + i * 32 * U, 16 * U, 1.6 * U);
      }
      /* the inference arrow */
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85 * a * clamp((p - 0.35) / 0.2, 0, 1)));
      D.line(-W * 0.02, 0, W * 0.10, 0);
      D.arrow(W * 0.10, 0, 0, 12 * U);
      /* the conclusion box, filling in */
      var q2 = clamp((p - 0.5) / 0.35, 0, 1);
      D.lw(2.2); D.stroke(rgba(w.pal.hot, 0.9 * a * q2));
      D.srect(W * 0.14, -60 * U, W * 0.30, 120 * U);
      D.font(22 * U); D.fill(rgba(w.pal.ink, 0.95 * a * q2));
      D.fill(rgba(w.pal.ink, 0.95 * a * q2));
      D.text('∴  I EXIST', W * 0.14 + 18 * U, 8 * U);
      if (q2 > 0.6) {
        D.fill(rgba([255, 246, 226], 0.9 * a));
        D.ctx().fillRect(W * 0.14 + 18 * U + D.measure('∴  I EXIST', 22 * U) + 4 * U, -10 * U, 10 * U, 24 * U);
      }
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("Then you're the proof of my", 0, -H * 0.36);
    } }
  ]);

  /* 01:27.922 — EXISTENCE */
  S('o.existence', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.07);
      var kk = E.pop(clamp(p / 0.28, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 10 * U); D.ctx().scale(kk, kk);
      D.font(88 * U, '700'); D.ctx().textAlign = 'center';
      /* the word is made of the points that prove it */
      D.fill(rgba([255, 248, 232], 0.96 * a));
      D.ctx().fillText('EXISTENCE', 0, 0);
      D.ctx().restore();
      /* a bounding box snapping tight around it */
      var q = clamp((p - 0.25) / 0.4, 0, 1);
      var wd = lerp(W * 0.46, D.measure('EXISTENCE', 88 * U, '700') / 2 + 26 * U, E.outCubic(q));
      D.lw(2); D.stroke(rgba(GOLD, 0.8 * a));
      D.bracket(-wd, -60 * U, wd * 2, 120 * U, 26 * U);
      D.font(14 * U); D.fill(rgba(GOLD, 0.7 * a * q));
      D.spaced('OBSERVED  ⇒  REAL', 0, 106 * U, 14 * U, 2.6 * U, 'center');
    } }
  ]);

  /* 01:28.587 — Switch my gender */
  S('g.gender', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.10);
      /* two symbols swapping places, then blending */
      var k = E.inOutQuad(clamp(p / 0.65, 0, 1));
      var off = lerp(230, 0, k) * U;
      D.lw(3.4);
      /* ♂ */
      D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.scircle(-off, 0, 74 * U);
      D.line(-off + 52 * U, -52 * U, -off + 104 * U, -104 * U);
      D.arrow(-off + 104 * U, -104 * U, -Math.PI * 0.75, 16 * U);
      /* ♀ */
      D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.scircle(off, -18 * U, 74 * U);
      D.line(off, 56 * U, off, 132 * U);
      D.line(off - 34 * U, 98 * U, off + 34 * U, 98 * U);
      /* blend halo */
      if (k > 0.85) {
        D.ctx().globalCompositeOperation = 'lighter';
        D.lw(2); D.stroke(rgba(w.pal.ink, 0.4 * a));
        D.scircle(0, -10 * U, 110 * U * (1 + 0.06 * Math.sin(w.time * 3)));
        D.ctx().globalCompositeOperation = 'source-over';
      }
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('SEX  :  volatile', -W * 0.42, H * 0.42, 15 * U, 2.4 * U);
    } },
    { l: 18, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Switch my gender', 0, -H * 0.38);
    } }
  ]);

  /* 01:30.197 — To F, to M */
  S('g.fm', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.09);
      var alt = Math.floor(w.time / 1.3846) % 2;  /* flips on the bar */
      /* a morphing silhouette: two outlines trading shoulders and hips */
      var morph = (Math.sin(w.time * 1.1) + 1) / 2;
      D.lw(3); D.stroke(rgba(alt ? w.pal.hot : w.pal.accent, 0.9 * a));
      D.ctx().beginPath();
      var sh = lerp(150, 96, morph), hp = lerp(96, 150, morph);
      D.ctx().moveTo(-sh, -120 * U);
      D.ctx().quadraticCurveTo(-sh * 0.55, -190 * U, 0, -196 * U);
      D.ctx().quadraticCurveTo(sh * 0.55, -190 * U, sh, -120 * U);
      D.ctx().quadraticCurveTo(sh * 0.75, -10 * U, hp, 60 * U);
      D.ctx().quadraticCurveTo(hp * 0.95, 190 * U, 0, 210 * U);
      D.ctx().quadraticCurveTo(-hp * 0.95, 190 * U, -hp, 60 * U);
      D.ctx().quadraticCurveTo(-sh * 0.75, -10 * U, -sh, -120 * U);
      D.ctx().closePath();
      D.ctx().stroke();
      D.fill(rgba(alt ? w.pal.hot : w.pal.accent, 0.07 * a));
      D.ctx().fill();
      /* head */
      D.scircle(0, -276 * U, 62 * U);
      D.font(52 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText(alt ? 'M' : 'F', -0, -300 * U);
      D.font(20 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.ctx().fillText('to ' + (alt ? 'M' : 'F'), 150 * U, -280 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('To F, to M', 0, H * 0.42);
    } }
  ]);

  /* 01:32.015 — And then do whatever */
  S('g.whatever', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.11);
      /* a wildcard: every option at once */
      var n = 34;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 4421 + 3), s2 = hash(i * 9967 + 13);
        var q = clamp((p - s1 * 0.5) / 0.4, 0, 1);
        if (q <= 0) continue;
        var ry = (s2 - 0.5) * 2 * Math.PI;
        var ang = (i / n) * TAU * 3 + w.time * (0.3 + s1 * 0.7);
        var rr = (140 + s1 * 260) * U;
        var x = Math.cos(ang) * rr, y = Math.sin(ang * 1.3) * rr * 0.7;
        D.lw(1.8); D.stroke(rgba(i % 3 === 0 ? w.pal.hot : w.pal.accent, 0.55 * a * (1 - q * 0.4)));
        D.ctx().save();
        D.ctx().translate(x, y);
        D.ctx().rotate(ry + w.time * 0.6);
        D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
        D.srect(-30 * U, -18 * U, 60 * U, 36 * U);
        D.ctx().restore();
      }
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('*', 0, 0);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('any request accepted', 0, 40 * U, 14 * U, 2.4 * U, 'center');
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('And then do whatever', 0, -H * 0.40);
    } }
  ]);

  /* 01:33.953 — From A.M. to P.M. */
  S('g.ampm', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.09);
      var alt = Math.floor(w.time / 1.846) % 2;
      /* a clock whose hands speed up until the dial is a blur */
      var R = 210 * U;
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.8 * a));
      D.scircle(0, 0, R);
      D.lw(1.2);
      for (var i = 0; i < 12; i++) {
        var an = i / 12 * TAU;
        D.stroke(rgba(w.pal.accent, 0.5 * a));
        D.line(Math.cos(an) * R * 0.9, Math.sin(an) * R * 0.9, Math.cos(an) * R, Math.sin(an) * R);
      }
      var spd = 0.4 + p * 5.2;
      var ha = w.time * spd * 0.5 - Math.PI / 2;
      var ma = w.time * spd * 6 - Math.PI / 2;
      D.lw(6); D.stroke(rgba(w.pal.ink, 0.95 * a));
      D.line(0, 0, Math.cos(ha) * R * 0.52, Math.sin(ha) * R * 0.52);
      D.lw(3.4); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.line(0, 0, Math.cos(ma) * R * 0.82, Math.sin(ma) * R * 0.82);
      D.fill(rgba(w.pal.ink, 0.95 * a)); D.circle(0, 0, 9 * U); D.ctx().fill();
      /* the two halves of the day */
      D.font(30 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(alt ? w.pal.hot : w.pal.ink, 0.95 * a));
      D.ctx().fillText('A.M.', -W * 0.30, -H * 0.40);
      D.fill(rgba(alt ? w.pal.ink : w.pal.hot, 0.95 * a));
      D.ctx().fillText('P.M.', W * 0.30, -H * 0.40);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('From A.M. to P.M.', 0, H * 0.42);
    } }
  ]);

  /* 01:35.465 — Oh, switch my role */
  S('g.role', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.11);
      /* two masks rotating around a single axis */
      var k = clamp(p / 0.6, 0, 1);
      var ang = w.time * 0.8;
      for (var i = 0; i < 2; i++) {
        var side = i ? 1 : -1;
        var px = Math.cos(ang + (i ? 0 : Math.PI)) * 210 * U;
        var depth = (Math.sin(ang + (i ? 0 : Math.PI)) + 1) / 2;
        var sc = 0.75 + depth * 0.45;
        D.ctx().save();
        D.ctx().translate(px, 0);
        D.ctx().scale(sc, sc);
        D.lw(3); D.stroke(rgba(i ? w.pal.hot : w.pal.accent, (0.35 + depth * 0.6) * a * k));
        D.ctx().beginPath();
        D.ctx().ellipse(0, 0, 96 * U, 122 * U, 0, Math.PI * 0.9, Math.PI * 2.1);   /* dome */
        D.ctx().quadraticCurveTo(0, 96 * U, -96 * U * Math.cos(0.1 * Math.PI), 0);
        D.ctx().closePath();
        D.ctx().stroke();
        /* eyes of the mask */
        D.fill(rgba(0, 0, 0, 0.6));
        D.ctx().beginPath(); D.ctx().ellipse(-34 * U, -14 * U, 20 * U, 13 * U, 0.2, 0, TAU); D.ctx().fill();
        D.ctx().beginPath(); D.ctx().ellipse(34 * U, -14 * U, 20 * U, 13 * U, -0.2, 0, TAU); D.ctx().fill();
        D.ctx().restore();
        D.font(18 * U); D.fill(rgba(w.pal.ink, 0.85 * a));
        D.ctx().textAlign = 'center';
        D.text(i ? 'TOP' : 'BOTTOM', px, 190 * U);
      }
      D.lw(1.2); D.stroke(rgba(w.pal.grid, 0.5 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 0, 210 * U, 62 * U, 0, 0, TAU); D.ctx().stroke();
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Oh, switch my role', 0, -H * 0.40);
    } }
  ]);

  /* 01:37.739 — To S, to M */
  S('g.sm', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.09);
      var alt = Math.floor(w.time / 1.3846) % 2;
      /* a rope: two ends, one knot that slides along it */
      var y = 40 * U;
      D.lw(3.4); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 120; i++) {
        var u = i / 120;
        D.ctx().lineTo((u - 0.5) * W * 0.86, y + Math.sin(u * 9 + w.time * 1.4) * 16 * U);
      }
      D.ctx().stroke();
      var kx = Math.sin(w.time * 0.9) * W * 0.34;
      D.lw(6); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.ctx().beginPath();
      D.ctx().arc(kx, y + Math.sin((kx / (W * 0.86) + 0.5) * 9 + w.time * 1.4) * 16 * U, 26 * U, 0, TAU);
      D.ctx().stroke();
      D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.7 * a));
      D.ctx().beginPath();
      D.ctx().arc(kx, y + Math.sin((kx / (W * 0.86) + 0.5) * 9 + w.time * 1.4) * 16 * U, 38 * U, 0, TAU);
      D.ctx().stroke();
      D.font(44 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(alt ? w.pal.hot : w.pal.ink, 0.95 * a));
      D.ctx().fillText('S', -W * 0.34, -H * 0.36);
      D.fill(rgba(alt ? w.pal.ink : w.pal.hot, 0.95 * a));
      D.ctx().fillText('M', W * 0.34, -H * 0.36);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('tension  ·  ' + (alt ? 'held' : 'released'), 0, -H * 0.36 + 34 * U, 14 * U, 2.4 * U, 'center');
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('To S, to M', 0, H * 0.42);
    } }
  ]);

  /* 01:39.349 — So we can enter */
  S('g.enter', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.11);
      /* a door standing free in the middle of nothing, opening */
      var k = E.inOutQuad(clamp(p / 0.6, 0, 1));
      var dw = 150 * U, dh = 250 * U;
      var open = lerp(0, 1, k);
      /* frame */
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.srect(-dw, -dh, dw * 2, dh * 2);
      /* the light beyond */
      var g = D.ctx().createLinearGradient(-dw, 0, dw, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, rgba(w.pal.ink, 0.30 * k));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.frect(-dw, -dh, dw * 2, dh * 2);
      /* the leaf of the door swinging */
      var persp = Math.cos(open * Math.PI * 0.5);
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.fill(rgba(w.pal.hot, 0.10 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(-dw, -dh); D.ctx().lineTo(-dw + dw * 2 * persp, -dh * 0.86);
      D.ctx().lineTo(-dw + dw * 2 * persp, dh * 0.86); D.ctx().lineTo(-dw, dh);
      D.ctx().closePath(); D.ctx().fill(); D.ctx().stroke();
      /* threshold */
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.line(-dw - 40 * U, dh, dw + 40 * U, dh);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.7 * a));
      D.spaced('ENTER', dw + 54 * U, 6 * U, 14 * U, 2.6 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('So we can enter', 0, -H * 0.42);
    } }
  ]);

  /* 01:41.474 — The trance, the trance */
  S('g.trance', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.09);
      /* hypnotic concentric rotation — deliberately hard to look away from */
      var alt = Math.floor(p * 3) % 2;
      for (var ring = 0; ring < 22; ring++) {
        var rr = (30 + ring * 26) * U;
        var rot = w.time * (0.5 + ring * 0.05) * (ring % 2 ? 1 : -1) + (alt ? 0.2 : -0.2);
        D.lw(lerp(3.4, 0.8, ring / 22));
        D.stroke(rgba(ring % 2 ? w.pal.hot : w.pal.accent, (0.55 - ring * 0.017) * a));
        var seg = 5 + (ring % 4);
        for (var s2 = 0; s2 < seg; s2++) {
          var a0 = rot + s2 / seg * TAU;
          D.circle(0, 0, rr, a0, a0 + TAU / seg * 0.62); D.ctx().stroke();
        }
      }
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.circle(0, 0, 12 * U + pulse(w.time, 0.4) * 16 * U); D.ctx().fill();
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.55 * a));
      D.ctx().fillText('the trance, the trance', 0, H * 0.44);
    } }
  ]);

  /* 01:43.489 — If I can  (second time: quieter, more desperate) */
  S('v.ifIcan2', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.14);
      /* a door ajar with a sliver of light — smaller than before */
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      var dw = 90 * U, dh = 170 * U;
      D.lw(2.2); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.srect(-dw, -dh, dw * 2, dh * 2);
      var g = D.ctx().createLinearGradient(-dw * 0.2, 0, dw * 0.2, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, rgba(w.pal.ink, 0.5 * k));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.frect(-dw * 0.2, -dh, dw * 0.4 * k + 2 * U, dh * 2);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.75 * a));
      D.line(0, -dh, 0, dh);
      D.font(17 * U); D.fill(rgba(w.pal.accent, 0.65 * a));
      D.spaced('if I can —', 0, dh + 48 * U, 17 * U, 3 * U, 'center');
    } }
  ]);

  /* 01:44.197 — If I can feel your */
  S('v.feel', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a fingertip approaching a surface; the surface ripples */
      var k = E.outCubic(clamp(p / 0.55, 0, 1));
      var fy = lerp(-320, -80, k) * U;
      D.lw(3); D.stroke(rgba(SKIN, 0.9 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(0, fy);
      D.ctx().quadraticCurveTo(-30 * U, fy + 90 * U, -22 * U, fy + 200 * U);
      D.ctx().lineTo(24 * U, fy + 200 * U);
      D.ctx().quadraticCurveTo(30 * U, fy + 90 * U, 6 * U, fy);
      D.ctx().closePath(); D.ctx().stroke();
      D.lw(1.6); D.stroke(rgba(SKIN, 0.55 * a));
      D.ctx().beginPath(); D.ctx().arc(0, fy + 24 * U, 16 * U, 0.3, Math.PI - 0.3); D.ctx().stroke();
      /* the surface: standing waves radiating from the contact point */
      for (var r = 0; r < 5; r++) {
        var q = ((w.time * 0.8 + r / 5) % 1);
        var rad = (60 + q * 520) * U;
        D.lw(2.2 * (1 - q));
        D.stroke(rgba(w.pal.accent, (1 - q) * 0.5 * a * k));
        D.ctx().beginPath();
        D.ctx().ellipse(0, 120 * U, rad, rad * 0.26, 0, 0, TAU); D.ctx().stroke();
      }
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.5 * a));
      D.ctx().beginPath(); D.ctx().ellipse(0, 120 * U, 460 * U, 120 * U, 0, 0, TAU); D.ctx().stroke();
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('contact threshold: ' + (860 - Math.round(E.outCubic(k) * 858)) + ' µm', -W * 0.42, H * 0.42, 14 * U, 2.4 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('If I can feel your', 0, -H * 0.40);
    } }
  ]);

  /* 01:46.293 — VIBRATIONS */
  S('v.vibrations', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.07);
      /* a resonance field: many coupled oscillators finding unison */
      var n = 40;
      var lock = clamp(p / 0.8, 0, 1);
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 9176 + 3), s2 = hash(i * 3391 + 7);
        var x = (i / (n - 1) - 0.5) * W * 0.94;
        var amp = lerp(120, 26, lock * s1) * U;
        var freq = lerp(0.6 + s2 * 3.4, 1.5, lock);
        var y = Math.sin(w.time * freq * 3 + i * 0.4) * amp;
        D.lw(2);
        D.stroke(rgba(i % 5 === 0 ? w.pal.hot : w.pal.accent, 0.35 + s2 * 0.4 * a));
        D.line(x, 0, x, -y);
        D.fill(rgba(w.pal.ink, 0.8 * a));
        D.circle(x, -y, (2 + s1 * 3) * U); D.ctx().fill();
      }
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.45 * a));
      D.line(-W * 0.47, 0, W * 0.47, 0);
      D.font(58 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('VIBRATIONS', 0, -H * 0.34);
      D.font(14 * U); D.fill(rgba(w.pal.hot, 0.75 * a));
      D.spaced('phase lock  ' + (lock * 100).toFixed(0) + '%', 0, -H * 0.34 + 30 * U, 14 * U, 2.6 * U, 'center');
    } }
  ]);

  /* 01:47.220 — Then I can  (third time) */
  S('v.thenIcan2', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.14);
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      /* the consequence box, now with light inside it */
      var wd = 300 * U, ht = 120 * U * k;
      var g = D.ctx().createLinearGradient(0, -ht / 2, 0, ht / 2);
      g.addColorStop(0, rgba(w.pal.ink, 0.14 * a));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.frect(-wd / 2, -ht / 2, wd, ht);
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85 * a));
      D.srect(-wd / 2, -ht / 2, wd, ht);
      D.font(17 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.text('THEN', 0, 7 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.line(0, -ht / 2 - 90 * U, 0, -ht / 2);
      D.arrow(0, -ht / 2, Math.PI / 2, 10 * U);
    } }
  ]);

  /* 01:47.903 — Then I can finally be */
  S('v.finally', [
    { l: 26, e: function (w, p) {
      var a = vis(p, 0.12);
      /* the last piece of a jigsaw falling into place — deliberately literal */
      var k = E.outBack(clamp(p / 0.6, 0, 1));
      var px = lerp(-260, 0, k) * U, py = lerp(-180, 0, k) * U;
      function piece(x, y, al) {
        D.lw(2.6); D.stroke(rgba(w.pal.accent, al * a));
        D.ctx().beginPath();
        var r = 62 * U;
        D.ctx().moveTo(x - r, y - r); D.ctx().lineTo(x + r, y - r);
        D.ctx().lineTo(x + r, y - r * 0.3);
        D.ctx().arc(x + r * 0.6, y + r * 0.3, r * 0.4, Math.PI, 0, true);
        D.ctx().lineTo(x + r, y + r); D.ctx().lineTo(x - r, y + r);
        D.ctx().lineTo(x - r, y + r * 0.3);
        D.ctx().arc(x - r * 0.6, y - r * 0.3, r * 0.4, 0, Math.PI, true);
        D.ctx().closePath();
        D.ctx().stroke();
      }
      /* the hole it belongs in */
      D.lw(1.6); D.stroke(rgba(w.pal.grid, 0.65 * a)); D.dash([9 * U, 7 * U]);
      D.srect(-62 * U, -62 * U, 124 * U, 124 * U); D.dash([]);
      piece(px, py, 0.9);
      if (k > 0.97) {
        D.ctx().globalCompositeOperation = 'lighter';
        D.fill(rgba(w.pal.ink, 0.25 * a));
        D.ctx().fillRect(-62 * U, -62 * U, 124 * U, 124 * U);
        D.ctx().globalCompositeOperation = 'source-over';
      }
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced(k >= 0.999 ? 'gap closed' : 'fitting…', 0, 130 * U, 15 * U, 2.4 * U, 'center');
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(28 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Then I can finally be', 0, -H * 0.40);
    } }
  ]);

  /* 01:50.221 — COMPLETION. The only truly full frame in the film. */
  S('v.completion', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.outQuart(clamp(p / 0.4, 0, 1));
      D.ctx().save();
      D.ctx().translate(0, 0); D.ctx().scale(lerp(1.6, 1, kk), lerp(1.6, 1, kk));
      /* a full circle closing: complete, and therefore finished */
      D.lw(3.4); D.stroke(rgba(w.pal.ink, 0.9 * a));
      D.circle(0, 0, 230 * U, -Math.PI / 2, -Math.PI / 2 + TAU * kk); D.ctx().stroke();
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.circle(0, 0, 250 * U, -Math.PI / 2, -Math.PI / 2 + TAU * kk); D.ctx().stroke();
      D.ctx().restore();
      /* everything inside it is now lit */
      D.ctx().globalCompositeOperation = 'lighter';
      var g = D.ctx().createRadialGradient(0, 0, 0, 0, 0, 250 * U);
      g.addColorStop(0, rgba(w.pal.ink, 0.22 * a * kk));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.circle(0, 0, 250 * U); D.ctx().fill();
      D.ctx().globalCompositeOperation = 'source-over';
    } },
    { l: 12, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().scale(kk, kk);
      D.font(72 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('COMPLETION', 0, 16 * U);
      D.ctx().restore();
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.7 * a));
      D.spaced('progress: 100.000 %', 0, 320 * U, 15 * U, 2.8 * U, 'center');
    } }
  ]);

  /* ==========================================================================
     ACT IV — LEAVE ME.  Twenty seconds where the other half of the
     conversation simply stops answering. The frame empties, one object at a
     time, and the camera has to keep watching the space where they were.
     ======================================================================== */

  /* 01:50.900 — Though you have left */
  S('L.left1', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.14);
      /* two outlines. one of them is already walking out of frame. */
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.ctx().beginPath(); D.ctx().arc(-140 * U, -30 * U, 40 * U, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().moveTo(-140 * U, 14 * U); D.ctx().lineTo(-140 * U, 150 * U); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().moveTo(-140 * U, 150 * U); D.ctx().lineTo(-176 * U, 250 * U);
      D.ctx().moveTo(-140 * U, 150 * U); D.ctx().lineTo(-104 * U, 250 * U); D.ctx().stroke();
      /* the one leaving, fading as it goes */
      var go = E.inOutQuad(clamp(p / 0.7, 0, 1));
      var ox = lerp(150, 640, go) * U;
      D.ctx().globalAlpha = 1 - go;
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.75 * a));
      D.ctx().beginPath(); D.ctx().arc(ox, -30 * U, 40 * U, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().moveTo(ox, 14 * U); D.ctx().lineTo(ox, 150 * U); D.ctx().stroke();
      D.ctx().globalAlpha = 1;
      /* the gap between them, measured */
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.dim(-100 * U, 290 * U, ox, 290 * U, 'd → ∞', 0, 15 * U);
    } }
  ]);

  /* 01:52.220 / 01:53.100 / 01:54.180 / 01:54.920 — You have left ×4.
     Four different kinds of missing: a hand, a warmth, an echo, a name. */
  S('L.left2', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.16);
      /* an open hand held out, with nothing in it */
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.8 * a));
      for (var f = -2; f <= 2; f++) {
        var len = (120 + (2 - Math.abs(f)) * 26) * U;
        D.ctx().beginPath();
        D.ctx().moveTo(f * 30 * U, 200 * U);
        D.ctx().quadraticCurveTo(f * 44 * U, 200 * U - len * 0.6, f * 40 * U, 200 * U - len);
        D.ctx().stroke();
      }
      D.ctx().beginPath(); D.ctx().ellipse(0, 168 * U, 78 * U, 48 * U, 0, 0, TAU); D.ctx().stroke();
      /* the absence, drawn as a wireframe placeholder */
      var pl = 0.5 + 0.5 * Math.sin(w.time * 2.4);
      if (p > 0.4) {
        D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.55 * pl * a)); D.dash([8 * U, 8 * U]);
        D.scircle(0, 40 * U, 46 * U); D.dash([]);
        D.font(14 * U); D.fill(rgba(w.pal.hot, 0.7 * pl * a));
        D.spaced('null', -14 * U, 46 * U, 14 * U, 2 * U);
      }
    } }
  ]);

  S('L.left3', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.16);
      /* a warm patch on the floor, cooling */
      var cool = clamp(p / 0.9, 0, 1);
      var col = [lerp(255, 90, cool), lerp(196, 130, cool), lerp(120, 170, cool)];
      D.fill(rgba(col, 0.5 * a));
      D.ctx().beginPath();
      D.ctx().ellipse(-40 * U, 190 * U, 190 * U * (1 - cool * 0.25), 62 * U * (1 - cool * 0.25), 0, 0, TAU);
      D.ctx().fill();
      /* thermometer plunging */
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.75 * a));
      D.line(W * 0.34, -220 * U, W * 0.34, 180 * U);
      D.fill(rgba(w.pal.hot, 0.85 * a));
      D.frect(W * 0.34 - 11 * U, -220 * U + (400 * U) * cool, 22 * U, 400 * U * (1 - cool));
      D.font(15 * U); D.fill(rgba(w.pal.ink, 0.85 * a));
      D.text((37.0 - cool * 16.4).toFixed(1) + ' °C', W * 0.34 + 24 * U, 200 * U);
    } }
  ]);

  S('L.left4', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.16);
      /* an echo: the same waveform, each reflection weaker */
      for (var i = 0; i < 5; i++) {
        var al = Math.pow(0.55, i) * a;
        var sc = 1 + i * 0.22;
        D.lw(lerp(3, 0.8, i / 5));
        D.stroke(rgba(i === 0 ? w.pal.ink : w.pal.accent, al * 0.9));
        D.ctx().save(); D.ctx().scale(sc, sc);
        D.waveform(-W * 0.30, (i * 26 - 60) * U, W * 0.60, 120 * U, w.time * (1 + i * 0.2), 7 + i * 2, 1 - i * 0.16, i);
        D.ctx().restore();
      }
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.55 * a));
      D.spaced('reverberation  ·  source absent', -W * 0.42, H * 0.42, 14 * U, 2.4 * U);
    } }
  ]);

  S('L.left5', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.16);
      /* their name in a variable, evaluating to nothing */
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.accent, 0.8 * a));
      D.spaced('them', -W * 0.06, 10 * U, 30 * U, 3 * U, 'center');
      D.lw(3); D.stroke(rgba(w.pal.hot, 0.85 * a));
      var q = clamp((p - 0.3) / 0.35, 0, 1);
      D.line(-W * 0.10, 10 * U, -W * 0.10 + W * 0.09 * q, 10 * U);
      D.font(22 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.spaced('= undefined', 0, 70 * U, 22 * U, 2.4 * U, 'center');
      var blink = Math.sin(w.time * 7) > 0;
      if (blink) {
        D.fill(rgba(w.pal.hot, 0.9 * a));
        D.frect(D.measure('= undefined', 22 * U) * 0.0 + 130 * U, 52 * U, 12 * U, 26 * U);
      }
      for (var i = 0; i < 30; i++) {
        var s1 = hash(i * 313 + 3), s2 = hash(i * 977 + 7);
        var yy = ((s2 + w.time * 0.06) % 1 - 0.5) * H;
        D.fill(rgba(w.pal.grid, 0.14 * a));
        D.frect((s1 - 0.5) * W, yy, 34 * U, 1.4 * U);
      }
    } }
  ]);

  /* 01:55.780 — You have left me in */
  S('L.leftme', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.14);
      /* the room recedes: one-point perspective corridors folding away */
      var vx = 0, vy = -20 * U;
      D.lw(1.6);
      for (var r = 0; r < 9; r++) {
        var q = ((r / 9) + (w.time * 0.06) % (1 / 9)) % 1;
        var sc = Math.pow(0.78, r) * (1 - q * 0.2);
        D.stroke(rgba(w.pal.accent, (0.42 - r * 0.04) * a * (1 - q)));
        D.srect(vx - W * 0.42 * sc, vy - H * 0.42 * sc, W * 0.84 * sc, H * 0.84 * sc);
      }
      /* the single figure, dead centre, getting smaller */
      var shrink = clamp(p / 0.9, 0, 1);
      D.lw(3); D.stroke(rgba(w.pal.ink, 0.9 * a));
      var fs = lerp(1, 0.34, E.inQuad(shrink));
      D.ctx().save(); D.ctx().translate(0, 40 * U); D.ctx().scale(fs, fs);
      D.ctx().beginPath(); D.ctx().arc(0, -70 * U, 30 * U, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath(); D.ctx().moveTo(0, -40 * U); D.ctx().lineTo(0, 40 * U);
      D.ctx().moveTo(-30 * U, -10 * U); D.ctx().lineTo(30 * U, -10 * U);
      D.ctx().moveTo(0, 40 * U); D.ctx().lineTo(-22 * U, 100 * U);
      D.ctx().moveTo(0, 40 * U); D.ctx().lineTo(22 * U, 100 * U);
      D.ctx().stroke();
      D.ctx().restore();
    } }
  ]);

  /* 01:57.274 — ISOLATION. The bottom of the film. */
  S('L.isolation', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      /* a single point, and the vast measured emptiness around it */
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.circle(0, 0, 5 * U + pulse(w.time, 0.5) * 4 * U); D.ctx().fill();
      /* distance rings with no neighbours on them */
      D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.35 * a));
      var rings = [90, 180, 300, 460, 660];
      for (var i = 0; i < rings.length; i++) {
        D.scircle(0, 0, rings[i] * U, 0, TAU * clamp((p - i * 0.08) / 0.4, 0, 1));
      }
      /* nearest-neighbour search that keeps failing */
      D.lw(1); D.stroke(rgba(w.pal.hot, 0.5 * a));
      var sweep = w.time * 1.4 % TAU;
      D.line(0, 0, Math.cos(sweep) * 700 * U, Math.sin(sweep) * 700 * U);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('nearest neighbour: none found', -W * 0.42, H * 0.42, 14 * U, 2.4 * U);
      D.spaced('search radius: 660.0', -W * 0.42, H * 0.42 + 22 * U, 14 * U, 2.4 * U);
    } },
    { l: 14, e: function (w, p) {
      var a = vis(p, 0.08);
      var kk = E.pop(clamp(p / 0.34, 0, 1));
      D.ctx().save(); D.ctx().translate(0, -H * 0.30); D.ctx().scale(kk, kk);
      D.font(64 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.97 * a));
      D.ctx().fillText('ISOLATION', 0, 0);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.7 * a));
      var wd = D.measure('ISOLATION', 64 * U, '700') / 2 + 18 * U;
      D.line(-wd, 16 * U, wd, 16 * U);
      D.ctx().restore();
    } }
  ]);

  EM.__part2 = true;
})(window.EM);
