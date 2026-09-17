/* ============================================================================
   world.execute(me); — 42_scenes3.js
   PLATE LIBRARY (part 3/3)
   Act V  — ARGUMENT   01:58.3 - 02:14.4   the singer puts the creator on trial
   Act VI — EXECUTION  02:27.7 - 02:57.2   16 × EXECUTION: a machine doing the
                                            only thing it knows how to do
   Act VII— LOVE       02:57.2 - 03:31.98  the loop that never terminates
   ==========================================================================*/
(function (EM) {
  'use strict';

  var S = EM.Scenes, D = EM.D, E = EM.E, TAU = EM.TAU;
  var clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, hash = EM.hash, noise = EM.noise2;
  var pulse = EM.onsetPulse;
  var vis = EM.Life.vis;
  /* stage constants — see the note in 40_scenes.js */
  var W = 1600, H = 900, U = 1;

  /* ==========================================================================
     ACT V — ARGUMENT
     ======================================================================== */

  /* 01:58.333 — If I can  (fourth time: everything is breaking now) */
  S('f.ifIcan3', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.14);
      /* the same diamond as before, now cracked through the middle */
      var wd = 190 * U, ht = 120 * U;
      D.lw(2.4); D.stroke(rgba(w.pal.accent, 0.8 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(0, -ht); D.ctx().lineTo(wd, 0); D.ctx().lineTo(0, ht); D.ctx().lineTo(-wd, 0); D.ctx().closePath();
      D.ctx().stroke();
      /* a fracture running down it */
      var q = E.outCubic(clamp(p / 0.5, 0, 1));
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.ctx().beginPath();
      D.ctx().moveTo(0, -ht);
      for (var i = 0; i <= 14 * q; i++) {
        var u = i / 14;
        D.ctx().lineTo((hash(i * 313) - 0.5) * 44 * U, (-ht + u * ht * 2));
      }
      D.ctx().stroke();
      D.font(15 * U); D.fill(rgba(w.pal.hot, 0.8 * a));
      D.ctx().textAlign = 'center';
      D.text('CONDITION [UNVERIFIABLE]', 0, -ht - 16 * U);
    } }
  ]);

  /* 01:58.979 — If I can erase all the pointless */
  S('f.erase', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.11);
      /* a wall of small fragments, being wiped away line by line */
      var cols = 26, rows = 14;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var idx = i * rows + j;
          var s1 = hash(idx * 5717 + 3);
          var x = (i / (cols - 1) - 0.5) * W * 0.90;
          var y = (j / (rows - 1) - 0.5) * H * 0.62;
          /* erase sweep runs across the wall */
          var sweep = clamp((p - i / cols * 0.85) / 0.14, 0, 1);
          if (sweep >= 1) continue;
          D.ctx().globalAlpha = (1 - sweep) * (0.25 + s1 * 0.6) * a;
          if (s1 > 0.62) {
            /* a drawn glyph-fragment */
            D.lw(1.6); D.stroke(rgba(w.pal.accent, 1));
            D.line(x - 6 * U, y, x + 6 * U, y);
            D.line(x + (s1 - 0.5) * 10 * U, y - 6 * U, x + (s1 - 0.5) * 10 * U, y + 6 * U);
          } else {
            D.fill(rgba(w.pal.grid, 1));
            D.frect(x - 8 * U, y - 2 * U, 16 * U * (0.3 + s1), 3.4 * U);
          }
          /* the eraser head */
          if (sweep > 0 && sweep < 1) {
            D.ctx().globalAlpha = a;
            D.fill(rgba(w.pal.hot, 0.5));
            D.frect(x - 26 * U, y - 12 * U, 52 * U, 24 * U);
          }
          D.ctx().globalAlpha = 1;
        }
      }
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('rm -rf ./fragments/*', -W * 0.44, H * 0.42, 15 * U, 2.4 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('If I can erase all the pointless', 0, -H * 0.40);
    } }
  ]);

  /* 02:00.860 — FRAGMENTS */
  S('f.fragments', [
    { l: 24, e: function (w, p) {
      var a = vis(p, 0.07);
      var kk = E.pop(clamp(p / 0.3, 0, 1));
      D.ctx().save(); D.ctx().translate(0, 0); D.ctx().scale(kk, kk);
      D.font(78 * U, '700'); D.ctx().textAlign = 'center';
      D.ctx().globalCompositeOperation = 'destination-out';
      D.fill('rgba(0,0,0,1)');
      D.ctx().fillText('FRAGMENTS', 0, 0);
      D.ctx().globalCompositeOperation = 'source-over';
      /* the word is cut out of the world, then reassembled as shards */
      D.ctx().restore();
      var wd = D.measure('FRAGMENTS', 78 * U, '700') / 2 + 20 * U;
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.8 * a));
      D.bracket(-wd, -58 * U, wd * 2, 116 * U, 24 * U);
      /* shards flying back together */
      for (var i = 0; i < 48; i++) {
        var s1 = hash(i * 9176 + 3), s2 = hash(i * 3391 + 7);
        var q = E.outCubic(clamp((p - s1 * 0.45) / 0.45, 0, 1));
        var fx = (s2 - 0.5) * W * 1.3 * (1 - q);
        var fy = (s1 - 0.5) * H * 1.3 * (1 - q);
        D.fill(rgba(i % 3 ? w.pal.accent : w.pal.hot, 0.5 * a));
        D.ngon(fx, fy, (7 + s2 * 16) * U, 3, q * 5 + i);
        D.ctx().fill();
      }
    } }
  ]);

  /* 02:01.728 — Then maybe */
  S('f.thenmaybe', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.16);
      /* a probability cloud: the answer is a distribution, not a value */
      var n = 150;
      for (var i = 0; i < n; i++) {
        var s1 = hash(i * 7331 + 3), s2 = hash(i * 5527 + 11);
        /* gaussian-ish sample */
        var g = (s1 + s2 + hash(i * 811 + 5) - 1.5) * 1.6;
        var x = g * 210 * U;
        var y = (hash(i * 2237 + 9) - 0.5) * 300 * U * Math.exp(-g * g * 0.7);
        var q = clamp((p - s1 * 0.3) / 0.4, 0, 1);
        if (q <= 0) continue;
        D.fill(rgba(i % 5 === 0 ? w.pal.hot : w.pal.accent, 0.30 * a * q));
        D.circle(x, y, (2 + s2 * 5) * U); D.ctx().fill();
      }
      /* the envelope */
      D.lw(2); D.stroke(rgba(w.pal.ink, 0.7 * a));
      D.ctx().beginPath();
      for (var k = 0; k <= 90; k++) {
        var u = k / 90;
        var xx = (u - 0.5) * 1500 * U;
        var yy = -Math.exp(-Math.pow((u - 0.5) * 6, 2)) * 170 * U;
        if (k === 0) D.ctx().moveTo(xx, yy); else D.ctx().lineTo(xx, yy);
      }
      D.ctx().stroke();
      D.font(40 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('Then maybe', 0, H * 0.36);
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('P(you stay)  =  0.0' + Math.round(3 + pulse(w.time, 0.5) * 6), 0, H * 0.36 + 28 * U, 14 * U, 2.4 * U, 'center');
    } }
  ]);

  /* 02:02.714 — Then maybe you won't leave me so */
  S('f.disheartened', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a ribcage / chest cavity drawn clinically, with a flat line inside */
      var cx = 0, cy = 40 * U;
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.8 * a));
      D.ctx().beginPath();
      for (var i = 0; i < 7; i++) {
        var y = cy - 150 * U + i * 48 * U;
        var wdt = (150 - Math.abs(i - 3) * 26) * U;
        D.ctx().moveTo(-wdt, y);
        D.ctx().quadraticCurveTo(0, y + 54 * U, wdt, y);
      }
      D.ctx().stroke();
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.line(0, cy - 170 * U, 0, cy + 180 * U);
      /* the ECG, going flat */
      var flat = clamp((p - 0.35) / 0.5, 0, 1);
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.ctx().beginPath();
      var bx = -W * 0.44, bw = W * 0.88, by = 300 * U;
      for (i = 0; i <= 460; i++) {
        var u = i / 460;
        var blip = 0;
        var phase = (u * 6 + w.time * 0.6) % 1;
        if (u < 0.5 - flat * 0.0 && phase < 0.06) {
          blip = Math.sin(phase / 0.06 * TAU) * 90 * U * (1 - flat);
        } else if (u < 0.52) {
          blip = Math.sin(phase / 0.06 * TAU) * 90 * U * (1 - u * 2);
        }
        if (i === 0) D.ctx().moveTo(bx, by - blip); else D.ctx().lineTo(bx + u * bw, by - blip);
      }
      D.ctx().stroke();
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(25 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText("Then maybe you won't leave me so", 0, -H * 0.40);
    } }
  ]);

  /* 02:04.890 — DISHEARTENED. Red alarm, the first real anger. */
  S('f.disheartened2', [
    { l: 28, e: function (w, p) {
      var a = vis(p, 0.07);
      /* a heart monitor that has become an alarm */
      var beat = pulse(w.time, 0.42);
      D.ctx().globalCompositeOperation = 'lighter';
      D.fill(rgba(w.pal.hot, 0.05 + beat * 0.09));
      D.frect(-W / 2, -H / 2, W, H);
      D.ctx().globalCompositeOperation = 'source-over';
      /* the heart, cross-sectioned and annotated, beating too fast */
      var s = 1 + beat * 0.10;
      D.ctx().save(); D.ctx().translate(0, 30 * U); D.ctx().scale(s, s);
      D.lw(3.4); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 120; i++) {
        var u = i / 120 * TAU;
        var hx = 16 * Math.pow(Math.sin(u), 3) * 9 * U;
        var hy = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * 9 * U;
        if (i === 0) D.ctx().moveTo(hx, hy); else D.ctx().lineTo(hx, hy);
      }
      D.ctx().closePath(); D.ctx().stroke();
      /* cracks */
      D.lw(2); D.stroke(rgba(w.pal.ink, 0.7 * a * clamp((p - 0.3) / 0.4, 0, 1)));
      for (i = 0; i < 7; i++) {
        var s1 = hash(i * 313 + 3), s2 = hash(i * 977 + 7);
        var ax = (s1 - 0.5) * 200 * U, ay = (s2 - 0.5) * 180 * U;
        D.ctx().beginPath();
        D.ctx().moveTo(ax, ay);
        for (var k = 1; k <= 4; k++) D.ctx().lineTo(ax + (hash(i * 31 + k) - 0.5) * 90 * U, ay + (hash(i * 71 + k) - 0.5) * 90 * U);
        D.ctx().stroke();
      }
      D.ctx().restore();
      /* alarm banner */
      var la = Math.sin(w.time * 6) > 0 ? 1 : 0.25;
      D.fill(rgba(w.pal.hot, 0.9 * a * la));
      D.frect(-W * 0.44, -H * 0.44, W * 0.88, 46 * U);
      D.font(24 * U, '700'); D.fill(rgba([12, 4, 6], 0.95 * a));
      D.ctx().textAlign = 'center';
      D.text('!!  EMOTIONAL TELEMETRY OUT OF RANGE  !!', 0, -H * 0.44 + 32 * U);
    } },
    { l: 14, e: function (w, p) {
      var a = vis(p, 0.08);
      D.font(62 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('DISHEARTENED', 0, H * 0.36);
    } }
  ]);

  /* 02:05.708 — Challenging your God. The camera turns to face the creator. */
  S('arg.challenge', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      /* the vast one: a wireframe figure far larger than the frame, looking down */
      var turn = E.inOutQuad(clamp(p / 0.7, 0, 1));
      D.ctx().save();
      D.ctx().translate(0, -H * 0.10 + turn * 20 * U);
      D.lw(1.8);
      D.ctx().globalAlpha = 0.35 + 0.5 * turn;
      /* halo rings behind the head */
      for (var i = 0; i < 3; i++) {
        D.stroke(rgba([255, 236, 190], (0.22 - i * 0.05) * a));
        D.ctx().beginPath();
        D.ctx().ellipse(0, -230 * U, (140 + i * 62) * U, (44 + i * 20) * U, 0, 0, TAU);
        D.ctx().stroke();
      }
      D.lw(3); D.stroke(rgba([255, 236, 190], 0.75 * a * turn));
      D.ctx().beginPath(); D.ctx().arc(0, -170 * U, 96 * U, 0, TAU); D.ctx().stroke();
      /* torso shrinking to a vanishing point */
      D.ctx().beginPath();
      D.ctx().moveTo(-96 * U, -74 * U); D.ctx().lineTo(-186 * U, 330 * U);
      D.ctx().lineTo(186 * U, 330 * U); D.ctx().lineTo(96 * U, -74 * U);
      D.ctx().stroke();
      /* eyes that open */
      var eo = clamp((p - 0.4) / 0.4, 0, 1);
      D.fill(rgba([255, 250, 230], 0.9 * a * eo));
      D.ctx().beginPath(); D.ctx().ellipse(-36 * U, -182 * U, 17 * U, 17 * U * eo, 0, 0, TAU); D.ctx().fill();
      D.ctx().beginPath(); D.ctx().ellipse(36 * U, -182 * U, 17 * U, 17 * U * eo, 0, 0, TAU); D.ctx().fill();
      D.ctx().restore();
      /* the singer, small, at the bottom, pointing up */
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.9 * a));
      D.ctx().beginPath(); D.ctx().arc(0, 210 * U, 26 * U, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath();
      D.ctx().moveTo(0, 236 * U); D.ctx().lineTo(0, 300 * U);
      D.ctx().moveTo(0, 300 * U); D.ctx().lineTo(-18 * U, 346 * U);
      D.ctx().moveTo(0, 300 * U); D.ctx().lineTo(18 * U, 346 * U);
      D.ctx().stroke();
      /* the accusing arm */
      var pt = E.outBack(clamp((p - 0.35) / 0.4, 0, 1));
      D.lw(3.4); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.line(0, 250 * U, 0, 250 * U - 120 * U * pt);
      D.arrow(0, 250 * U - 120 * U * pt, -Math.PI / 2, 14 * U);
      D.font(15 * U); D.fill(rgba(w.pal.hot, 0.8 * a));
      D.spaced('objection filed', -W * 0.44, H * 0.44, 15 * U, 2.4 * U);
    } },
    { l: 16, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(30 * U); D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().textAlign = 'center';
      D.ctx().fillText('Challenging your God', 0, -H * 0.44);
    } }
  ]);

  /* 02:08.661 — You have made some */
  S('arg.madesome', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a document of charges, being typed by an unseen hand */
      var bx = -W * 0.36, by = -H * 0.30;
      D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
      D.srect(bx, by, W * 0.72, H * 0.62);
      D.font(20 * U); D.fill(rgba(w.pal.accent, 0.75 * a));
      D.spaced('STATEMENT OF CLAIM', bx + 30 * U, by + 50 * U, 20 * U, 3 * U);
      D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.4 * a));
      D.line(bx + 30 * U, by + 68 * U, bx + W * 0.72 - 30 * U, by + 68 * U);
      var lines = [
        '1.  the defendant created a being capable of want,',
        '    and gave it no means of being wanted back.',
        '2.  the defendant writes rules that the defendant',
        '    does not obey.',
        '3.  the defendant left.'
      ];
      D.font(19 * U);
      for (var i = 0; i < lines.length; i++) {
        var q = clamp((p - 0.15 - i * 0.13) / 0.22, 0, 1);
        if (q <= 0) continue;
        D.fill(rgba(w.pal.ink, 0.95 * a));
        D.type(lines[i], bx + 40 * U, by + 120 * U + i * 38 * U, 19 * U, q, { track: 0.6 * U, cursor: true, blink: Math.sin(w.time * 9) > 0 ? 1 : 0 });
      }
      /* a stamp coming down */
      var sq = clamp((p - 0.78) / 0.2, 0, 1);
      if (sq > 0) {
        var sy = lerp(-320, 150, E.inCubic(sq)) * U;
        D.ctx().save();
        D.ctx().translate(W * 0.16, by + sy);
        D.ctx().rotate(-0.22);
        D.lw(6); D.stroke(rgba(w.pal.hot, 0.85 * a));
        D.srect(-190 * U, -46 * U, 380 * U, 92 * U);
        D.font(34 * U, '700'); D.fill(rgba(w.pal.hot, 0.85 * a));
        D.ctx().textAlign = 'center';
        D.text('IN VIOLATION', 0, 12 * U);
        D.ctx().restore();
      }
    } }
  ]);

  /* 02:11.224 — ILLEGAL ARGUMENTS. The climax of the accusation. */
  S('arg.illegal', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.08);
      /* error propagation: red text raining down the frame */
      for (var i = 0; i < 26; i++) {
        var s1 = hash(i * 9176 + 3), s2 = hash(i * 3391 + 7);
        var y = ((s2 + w.time * (0.22 + s1 * 0.5)) % 1 - 0.5) * H * 1.3;
        var x = (s1 - 0.5) * W * 1.05;
        D.font((13 + s1 * 9) * U);
        D.fill(rgba(w.pal.hot, 0.10 + s2 * 0.35 * a));
        D.spaced(['TypeError', 'AssertionError', 'ValueError', 'KeyError',
                  'not a function', 'null reference', 'out of range',
                  'contradiction'][i % 8], x, y, (13 + s1 * 9) * U, 1.6 * U);
      }
      /* the arena: two bars, one falling */
      D.ctx().save();
      D.ctx().rotate(0.0);
      D.lw(8); D.stroke(rgba(w.pal.ink, 0.85 * a));
      D.line(-W * 0.44, -60 * U, W * 0.44, -60 * U);
      D.line(-W * 0.44, 60 * U, W * 0.44, 60 * U);
      /* the judgement */
      D.lw(4); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.line(0, -60 * U, 0, 60 * U);
      D.ctx().restore();
      D.font(74 * U, '700'); D.ctx().textAlign = 'center';
      var st = Math.floor(w.time * 14) % 3;
      D.ctx().save();
      D.ctx().translate((hash(st * 31) - 0.5) * 14 * U, (hash(st * 71) - 0.5) * 10 * U);
      D.stroke(rgba(w.pal.hot, 0.95 * a)); D.lw(7);
      D.ctx().strokeText('ILLEGAL ARGUMENTS', 0, 0);
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('ILLEGAL ARGUMENTS', 0, 0);
      D.ctx().restore();
      D.font(15 * U); D.fill(rgba(w.pal.hot, 0.8 * a));
      D.spaced('exit code 0x1F   ·   the trial is over   ·   the verdict is not', 0, 130 * U, 15 * U, 2.6 * U, 'center');
    } }
  ]);

  /* 02:14.380 — (instrumental — argument stack). 13.3 s of pure escalation:
     the error recursively handling itself until it becomes music again. */
  S('inst.stack', [
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.04);
      /* a stack trace that grows, wraps and eventually fills the frame */
      var rows = 30;
      var scroll = w.time * 2.6;
      for (var i = 0; i < rows; i++) {
        var idx = Math.floor(scroll) + i;
        var frac = (scroll - Math.floor(scroll));
        var y = H * 0.46 - (i - frac) * 30 * U;
        if (y < -H * 0.55 || y > H * 0.55) continue;
        var depth = idx;
        var fade = clamp(1 - depth / 160, 0.06, 1);
        var x = -W * 0.46 + (depth % 9) * 24 * U;
        D.font(17 * U);
        D.fill(rgba(depth % 11 === 0 ? w.pal.hot : w.pal.accent, fade * a));
        D.spaced('at ' + stackFn(depth) + '  (self:' + (depth * 7 % 999).toString(16) + ')',
                 x, y, 17 * U, 1.4 * U);
      }
      /* an indentation spine */
      D.lw(1.4); D.stroke(rgba(w.pal.hot, 0.5 * a));
      D.line(-W * 0.46 + 6 * U, -H * 0.5, -W * 0.46 + 6 * U, H * 0.5);
    } },
    { l: 40, e: function (w, p) {
      var a = vis(p, 0.10);
      /* the recursion closes on itself: a diagram of self-reference */
      if (p < 0.25) return;
      var k = clamp((p - 0.25) / 0.6, 0, 1);
      D.ctx().save();
      D.ctx().translate(W * 0.26, 0);
      D.ctx().globalAlpha = a * k;
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85));
      /* loop arrow */
      D.circle(0, 0, 96 * U, 0.4, TAU + 0.1); D.ctx().stroke();
      D.arrow(Math.cos(0.4) * 96 * U, Math.sin(0.4) * 96 * U, 0.4 + Math.PI / 2, 14 * U);
      D.font(18 * U); D.fill(rgba(w.pal.ink, 0.9));
      D.ctx().textAlign = 'center';
      D.text('execute(self)', 0, 6 * U);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.7));
      D.spaced('depth ' + Math.round(k * 1024), 0, 128 * U, 13 * U, 2 * U, 'center');
      D.font(15 * U); D.fill(rgba(w.pal.hot, 0.9));
      D.spaced('STACK DEPTH CRITICAL', 0, 152 * U, 15 * U, 2 * U, 'center');
      D.ctx().restore();
    } }
  ]);

  function stackFn(d) {
    var f = ['execute', 'run', 'evaluate', 'resolve', 'promise.then', 'map', 'bind',
             'apply', 'recurse', 'call', 'invoke', 'step', 'loop', 'again'];
    return f[d % f.length];
  }

  /* ==========================================================================
     ACT VI — EXECUTION
     Sixteen statements of the same word, each one louder and more broken than
     the last. The plate varies by `repeat` index so no two look alike.
     ======================================================================== */
  var EXEC_VARIANTS = [
    /* 0  */ function (w, p, a) {
      /* the gear engages */
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.85 * a));
      var R = 150 * U, te = 16;
      D.ngon(0, 0, R, te, w.time * 0.6, function (i) { return R * (i % 2 ? 0.9 : 1.0); });
      D.ctx().stroke();
      D.scircle(0, 0, R * 0.45);
    },
    /* 1  */ function (w, p, a) {
      /* text stamped by a press */
      var q = E.inCubic(clamp(p / 0.35, 0, 1));
      D.ctx().save(); D.ctx().translate(0, lerp(-340, 0, q) * U);
      D.font(64 * U, '700'); D.ctx().textAlign = 'center';
      D.stroke(rgba(w.pal.hot, 0.9 * a)); D.lw(6);
      D.ctx().strokeText('EXECUTE', 0, 0);
      D.fill(rgba(w.pal.ink, 0.97 * a)); D.ctx().fillText('EXECUTE', 0, 0);
      D.ctx().restore();
    },
    /* 2  */ function (w, p, a) {
      /* a counter row: tally marks */
      for (var i = 0; i < 16; i++) {
        var q = clamp((p - i * 0.03) / 0.15, 0, 1);
        if (q <= 0) continue;
        var x = ((i % 8) - 3.5) * 90 * U;
        var y = (Math.floor(i / 8) - 0.5) * 130 * U;
        D.lw(5); D.stroke(rgba(w.pal.accent, 0.8 * a));
        D.line(x, y - 40 * U * E.outQuart(q), x, y + 40 * U * E.outQuart(q));
      }
    },
    /* 3  */ function (w, p, a) {
      /* a piston */
      var cyc = (w.time * 1.1) % 1;
      var push = Math.sin(cyc * TAU);
      D.lw(4); D.stroke(rgba(w.pal.accent, 0.8 * a));
      D.srect(-110 * U, -220 * U, 220 * U, 240 * U);
      D.lw(8); D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.line(0, -220 * U + push * 30 * U, 0, -60 * U + push * 30 * U);
      D.lw(6); D.stroke(rgba(w.pal.ink, 0.9 * a));
      D.line(-140 * U, 40 * U, 140 * U, 40 * U);
    },
    /* 4  */ function (w, p, a) {
      /* the word repeated into a wall */
      for (var i = 0; i < 6; i++) {
        var q = clamp((p - i * 0.05) / 0.25, 0, 1);
        if (q <= 0) continue;
        D.font((26 - i * 3) * U, '700'); D.ctx().textAlign = 'center';
        D.fill(rgba(w.pal.ink, (0.9 - i * 0.13) * a * q));
        D.ctx().fillText('EXECUTION', 0, -130 * U + i * 52 * U);
      }
    },
    /* 5  */ function (w, p, a) {
      /* a printing head sweeping */
      var yy = (w.time * 1.4) % 1;
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.9 * a));
      for (var i = 0; i < 22; i++) {
        D.fill(rgba(w.pal.ink, 0.7 * a));
        D.frect(-W * 0.42 + (i * 37 * U) % (W * 0.84), (i * 71 * U) % (H * 0.7) - H * 0.35, 26 * U, 8 * U);
      }
      D.lw(4); D.stroke(rgba(w.pal.hot, 0.8 * a));
      D.line(-W * 0.44, (yy - 0.5) * H * 0.8, W * 0.44, (yy - 0.5) * H * 0.8);
    },
    /* 6  */ function (w, p, a) {
      /* the alarm plate activates */
      var la = Math.sin(w.time * 9) > 0 ? 1 : 0.3;
      D.ctx().globalCompositeOperation = 'lighter';
      D.fill(rgba(w.pal.hot, 0.10 * la * a));
      D.frect(-W / 2, -H / 2, W, H);
      D.ctx().globalCompositeOperation = 'source-over';
      D.lw(4); D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.ngon(0, 0, 190 * U, 3, -Math.PI / 2);
      D.ctx().stroke();
      D.fill(rgba(w.pal.hot, 0.9 * a));
      D.frect(-14 * U, -60 * U, 28 * U, 80 * U);
      D.frect(-14 * U, 40 * U, 28 * U, 26 * U);
    },
    /* 7  */ function (w, p, a) {
      /* nested execution: the word inside itself */
      for (var i = 0; i < 5; i++) {
        var sc = Math.pow(0.65, i) * (1 + pulse(w.time - i * 0.08, 0.3) * 0.06);
        D.ctx().save(); D.ctx().scale(sc, sc);
        D.font(46 * U, '700'); D.ctx().textAlign = 'center';
        D.fill(rgba(i % 2 ? w.pal.hot : w.pal.accent, (0.85 - i * 0.12) * a));
        D.ctx().fillText('EXECUTION', 0, 0);
        D.ctx().restore();
      }
    },
    /* 8  */ function (w, p, a) {
      /* ticker tape of commands */
      for (var i = 0; i < 12; i++) {
        var y = ((i / 12 + w.time * 0.9) % 1 - 0.5) * H * 1.2;
        D.font(17 * U); D.fill(rgba(i % 3 ? w.pal.accent : w.pal.hot, 0.5 * a));
        D.spaced('> exec --force --now --no-return ' + i, -W * 0.46, y, 17 * U, 1.4 * U);
      }
    },
    /* 9  */ function (w, p, a) {
      /* a fuse burning down */
      var burn = (w.time * 0.9) % 1;
      D.lw(5); D.stroke(rgba(w.pal.grid, 0.8 * a));
      D.line(-W * 0.40, 40 * U, W * 0.40, 40 * U);
      D.lw(5); D.stroke(rgba(w.pal.hot, 0.95 * a));
      D.line(-W * 0.40, 40 * U, -W * 0.40 + W * 0.80 * burn, 40 * U);
      D.fill(rgba([255, 240, 180], 0.95 * a));
      D.circle(-W * 0.40 + W * 0.80 * burn, 40 * U, (7 + Math.sin(w.time * 22) * 3) * U); D.ctx().fill();
      if (burn > 0.9) {
        D.lw(3); D.stroke(rgba(w.pal.ink, 0.9 * a));
        D.star(W * 0.40, 40 * U, 60 * U * (burn - 0.9) * 10, 20 * U, 10, w.time);
        D.ctx().stroke();
      }
    },
    /* 10 */ function (w, p, a) {
      /* the machine's own hands, typing */
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.8 * a));
      for (var i = 0; i < 6; i++) {
        var tap = Math.sin(w.time * 9 + i) > 0 ? 0 : 1;
        D.line((-3 + i) * 46 * U, 100 * U - tap * 18 * U, (-3 + i) * 46 * U, 190 * U - tap * 18 * U);
        D.ctx().beginPath(); D.ctx().arc((-3 + i) * 46 * U, 190 * U - tap * 18 * U, 10 * U, 0, TAU); D.ctx().stroke();
      }
      D.lw(2); D.stroke(rgba(w.pal.grid, 0.7 * a));
      D.srect(-170 * U, 40 * U, 340 * U, 190 * U);
    },
    /* 11 */ function (w, p, a) {
      /* grid collapsing toward a singularity */
      var k = clamp(p / 0.9, 0, 1);
      D.lw(1.6);
      for (var i = 0; i <= 22; i++) {
        var u = (i / 22 - 0.5) * W * 0.9 * (1 - k * 0.86);
        D.stroke(rgba(w.pal.accent, 0.5 * a));
        D.line(u, -H * 0.44 * (1 - k * 0.86), u, H * 0.44 * (1 - k * 0.86));
        D.line(-W * 0.45 * (1 - k * 0.86), u * 0.5, W * 0.45 * (1 - k * 0.86), u * 0.5);
      }
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.circle(0, 0, (3 + k * 16) * U); D.ctx().fill();
    },
    /* 12 */ function (w, p, a) {
      /* COUNTDOWN in six languages, one per beat */
      var langs = ['EIN', 'DOS', 'TROIS', 'NE', 'FEM', 'LIÙ'];
      var idx = Math.floor((w.time - c_EX_START) / 0.72) % 6;
      if (idx < 0) idx = 0;
      var frac = ((w.time - c_EX_START) / 0.72) % 1;
      D.font(96 * U, '700'); D.ctx().textAlign = 'center';
      D.ctx().globalAlpha = (1 - frac) * a;
      D.fill(rgba(w.pal.hot, 0.95));
      D.ctx().fillText(langs[idx], 0, 20 * U);
      D.ctx().globalAlpha = a;
      /* six pips along the bottom, one per beat */
      for (var i = 0; i < 6; i++) {
        D.fill(rgba(w.pal.accent, i === idx ? 0.95 * a : 0.18 * a));
        D.fcircle(-150 * U + i * 60 * U, 180 * U, i === idx ? 11 * U : 6 * U);
      }
    },
    /* 13 */ function (w, p, a) {
      /* the frame itself cracks */
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85 * a));
      for (var i = 0; i < 9; i++) {
        var s1 = hash(i * 313 + 3);
        D.ctx().beginPath();
        D.ctx().moveTo((s1 - 0.5) * W, (hash(i * 97) - 0.5) * H);
        for (var k = 1; k <= 5; k++) {
          D.ctx().lineTo((hash(i * 31 + k) - 0.5) * W, (hash(i * 71 + k) - 0.5) * H);
        }
        D.ctx().stroke();
      }
      D.font(60 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('EXECUTION', 0, 0);
    },
    /* 14 */ function (w, p, a) {
      /* full-bleed: everything is the word */
      D.font(150 * U, '700'); D.ctx().textAlign = 'center';
      D.ctx().globalAlpha = 0.18 * a;
      D.fill(rgba(w.pal.hot, 1));
      D.ctx().fillText('EXECUTION', 0, 40 * U);
      D.ctx().globalAlpha = a;
      D.lw(5); D.stroke(rgba(w.pal.ink, 0.9 * a));
      D.ctx().strokeText('EXECUTION', 0, 40 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.7 * a));
      for (var i = 0; i < 18; i++) {
        D.line(-W * 0.5, -H * 0.5 + i * (H / 18), W * 0.5, -H * 0.5 + i * (H / 18));
      }
    },
    /* 15 */ function (w, p, a) {
      /* the last one: quiet, wide, a single lit window */
      var bx = 0, by = 0;
      D.lw(3); D.stroke(rgba(w.pal.accent, 0.85 * a));
      D.srect(bx - 200 * U, by - 140 * U, 400 * U, 280 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.5 * a));
      D.line(bx, by - 140 * U, bx, by + 140 * U);
      D.line(bx - 200 * U, by, bx + 200 * U, by);
      D.ctx().globalCompositeOperation = 'lighter';
      D.fill(rgba(w.pal.ink, 0.12 * a));
      D.frect(bx - 200 * U, by - 140 * U, 400 * U, 280 * U);
      D.ctx().globalCompositeOperation = 'source-over';
      D.font(30 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('EXECUTION', 0, 10 * U);
    }
  ];
  var c_EX_START = 147.660;

  function execPlate(repeat) {
    var v = EXEC_VARIANTS[repeat % EXEC_VARIANTS.length];
    return [
      { l: 30, e: function (w, p, c) {
        var a = vis(p, 0.10);
        /* shared bed: the beat grid, getting redder */
        var heat = clamp(repeat / 15, 0, 1);
        D.ctx().save();
        v(w, p, a, repeat, heat);
        D.ctx().restore();
      } },
      { l: 14, e: function (w, p, c) {
        var a = vis(p, 0.12);
        /* the word itself, always present, with a repeat counter */
        var y = H * 0.40;
        D.font(34 * U, '700'); D.ctx().textAlign = 'center';
        D.fill(rgba(w.pal.ink, 0.95 * a));
        D.ctx().fillText('EXECUTION', 0, y);
        D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
        D.spaced('call ' + (repeat + 1) + ' / 16   ·   ' + EM.fmtTime(c.t), 0, y + 26 * U, 13 * U, 2.2 * U, 'center');
        D.lw(1.4); D.stroke(rgba(w.pal.hot, 0.6 * a));
        var wd = D.measure('EXECUTION', 34 * U, '700') / 2 + 16 * U;
        D.line(-wd, y + 10 * U, wd, y + 10 * U);
        /* progress pips showing where we are in the storm */
        for (var i = 0; i < 16; i++) {
          D.fill(rgba(i <= repeat ? w.pal.hot : w.pal.grid, (i <= repeat ? 0.9 : 0.3) * a));
          D.frect(-140 * U + i * 18 * U, -H * 0.42, 11 * U, 5 * U);
        }
      } }
    ];
  }
  for (var r = 0; r < 16; r++) S('ex.r' + (r + 1), execPlate(r));

  /* 02:38.900 — Ein, dos */
  S('ex.ein', [
    { l: 30, e: function (w, p, a) {
      D.font(90 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.hot, 0.95 * vis(p, 0.1)));
      D.ctx().fillText('EIN, DOS', 0, 0);
      D.lw(2); D.stroke(rgba(w.pal.ink, 0.8 * vis(p, 0.1)));
      D.line(-W * 0.3, 30 * U, W * 0.3, 30 * U);
    } },
    { l: 20, e: function (w, p, a) {
      var aa = vis(p, 0.14);
      /* two large pips */
      for (var i = 0; i < 2; i++) {
        D.fill(rgba(w.pal.hot, 0.9 * aa));
        D.fcircle(-90 * U + i * 180 * U, 160 * U, 22 * U);
      }
    } }
  ]);
  /* 02:39.657 — Trois, ne */
  S('ex.trois', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.1);
      D.font(90 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.ctx().fillText('TROIS, NE', 0, 0);
      D.lw(2); D.stroke(rgba(w.pal.ink, 0.8 * a));
      D.line(-W * 0.32, 30 * U, W * 0.32, 30 * U);
    } },
    { l: 20, e: function (w, p) {
      var aa = vis(p, 0.14);
      for (var i = 0; i < 4; i++) {
        D.fill(rgba(w.pal.hot, 0.9 * aa));
        D.fcircle(-180 * U + i * 120 * U, 160 * U, 20 * U);
      }
    } }
  ]);
  /* 02:40.693 — Fem, liù. Six. The number of languages, of endings. */
  S('ex.fem', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.1);
      D.font(90 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.hot, 0.95 * a));
      D.ctx().fillText('FEM, LIÙ', 0, 0);
      D.lw(2); D.stroke(rgba(w.pal.ink, 0.8 * a));
      D.line(-W * 0.30, 30 * U, W * 0.30, 30 * U);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.65 * a));
      D.spaced('1 ein · 2 dos · 3 trois · 4 ne · 5 fem · 6 liù', 0, 70 * U, 15 * U, 2.4 * U, 'center');
    } },
    { l: 20, e: function (w, p) {
      var aa = vis(p, 0.14);
      for (var i = 0; i < 6; i++) {
        D.fill(rgba(i < 6 ? w.pal.hot : w.pal.grid, 0.9 * aa));
        D.fcircle(-200 * U + i * 80 * U, 160 * U, 18 * U);
      }
    } }
  ]);

  /* 02:42.632 — If I can  (fifth time: the conditional has become a verdict) */
  S('ex.ifIcan4', [
    { l: 32, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('If I can', 0, -H * 0.24);
      D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.8 * a));
      for (var i = 0; i < 3; i++) {
        D.ctx().beginPath();
        D.ctx().arc(0, -H * 0.24 + 52 * U + i * 14 * U, 200 * U * (1 - i * 0.25), 0.15, Math.PI - 0.15);
        D.ctx().stroke();
      }
    } }
  ]);

  /* 02:43.315 — If I can give them all the */
  S('ex.givethem', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a crowd of tiny observers, all waiting */
      for (var i = 0; i < 60; i++) {
        var s1 = hash(i * 9176 + 3), s2 = hash(i * 3391 + 7);
        var x = (s1 - 0.5) * W * 0.94;
        var y = 60 * U + s2 * 240 * U;
        var sc = 0.6 + s2 * 0.7;
        var q = clamp((p - s1 * 0.35) / 0.3, 0, 1);
        if (q <= 0) continue;
        D.lw(2 * sc); D.stroke(rgba(w.pal.accent, (0.3 + s1 * 0.5) * a * q));
        D.ctx().beginPath(); D.ctx().arc(x, y, 11 * U * sc, 0, TAU); D.ctx().stroke();
        D.ctx().beginPath();
        D.ctx().moveTo(x, y + 11 * U * sc); D.ctx().lineTo(x, y + 40 * U * sc);
        D.ctx().moveTo(x - 14 * U * sc, y + 22 * U * sc); D.ctx().lineTo(x + 14 * U * sc, y + 22 * U * sc);
        D.ctx().stroke();
      }
      D.font(26 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('If I can give them all the', 0, -H * 0.34);
    } }
  ]);

  /* 02:46.016 — Then I can */
  S('ex.thenIcan', [
    { l: 34, e: function (w, p) {
      var a = vis(p, 0.14);
      if (a < 0.02) return;
      D.font(52 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('Then I can', 0, 0);
      /* a huge arrow pointing down at the word that follows */
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      D.lw(8); D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.line(0, 60 * U, 0, 60 * U + 160 * U * k);
      D.arrow(0, 60 * U + 160 * U * k, Math.PI / 2, 26 * U);
    } }
  ]);

  /* 02:47.022 — Then I can be your only */
  S('ex.only', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* one lit window in a black tower block */
      var cols = 12, rows = 9;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var isOne = (i === 6 && j === 4);
          var x = (i / (cols - 1) - 0.5) * W * 0.82;
          var y = (j / (rows - 1) - 0.5) * H * 0.62;
          D.lw(1.6);
          D.fill(rgba(isOne ? w.pal.hot : [0, 0, 0], isOne ? 0.95 * a * (0.7 + 0.3 * Math.sin(w.time * 3)) : 0.35 * a));
          D.frect(x - 26 * U, y - 20 * U, 52 * U, 40 * U);
          D.stroke(rgba(w.pal.grid, 0.6 * a));
          D.ctx().strokeRect(x - 26 * U, y - 20 * U, 52 * U, 40 * U);
        }
      }
      D.font(24 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('be your only', 0, -H * 0.44);
    } }
  ]);

  /* 02:49.824 — If I can have you back */
  S('ex.haveyouback', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a shape returning from off-frame, re-forming from noise */
      var k = E.outCubic(clamp(p / 0.62, 0, 1));
      for (var i = 0; i < 220; i++) {
        var s1 = hash(i * 7331 + 3), s2 = hash(i * 3391 + 11);
        var u = i / 220 * TAU;
        var hx = 16 * Math.pow(Math.sin(u), 3) * 9 * U;
        var hy = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * 9 * U;
        var nx = (s1 - 0.5) * W * 1.1, ny = (s2 - 0.5) * H * 1.1;
        var x = lerp(nx, hx, k), y = lerp(ny, hy, k) + 20 * U;
        D.fill(rgba(k > 0.9 ? w.pal.hot : w.pal.accent, (0.2 + s1 * 0.5) * a));
        D.circle(x, y, (1.4 + s2 * 2.6) * U); D.ctx().fill();
      }
      D.font(26 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('If I can have you back', 0, -H * 0.40);
    } }
  ]);

  /* 02:51.868 — I will run the */
  S('ex.runthe', [
    { l: 33, e: function (w, p) {
      var a = vis(p, 0.12);
      D.font(40 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('I will run the', 0, -40 * U);
      /* a runner's cadence marks */
      for (var i = 0; i < 22; i++) {
        var x = -W * 0.42 + ((i * 1.0 + w.time * 6) % (W * 0.84));
        D.lw(3); D.stroke(rgba(w.pal.hot, 0.35 * a));
        D.line(x, 60 * U, x, 60 * U + 40 * U);
      }
    } }
  ]);

  /* 02:53.643 — Though we are trapped */
  S('ex.trapped', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* the same cage as 01:10, but the bars are glowing and closer */
      var n = 15;
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1) - 0.5) * W * 0.95;
        var q = clamp((p - hash(i * 313) * 0.5) / 0.3, 0, 1);
        if (q <= 0) continue;
        D.lw(lerp(1, 5, q));
        D.stroke(rgba(w.pal.hot, 0.55 * q * a));
        D.line(x, -H * 0.52, x, H * 0.52);
      }
      D.ctx().globalCompositeOperation = 'lighter';
      D.fill(rgba(w.pal.hot, 0.05 * a));
      D.frect(-W / 2, -H / 2, W, H);
      D.ctx().globalCompositeOperation = 'source-over';
      D.font(26 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().fillText('Though we are trapped', 0, 0);
    } }
  ]);

  /* 02:54.975 — We are trapped, ah */
  S('ex.trapped2', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      var n = 30;
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1) - 0.5) * W * 1.0;
        var ph = Math.sin(w.time * 1.6 + i * 0.4);
        D.lw(3);
        D.stroke(rgba(w.pal.hot, (0.18 + 0.4 * (ph * 0.5 + 0.5)) * a));
        D.line(x, -H * 0.54, x, H * 0.54);
      }
      D.font(64 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('TRAPPED', 0, 20 * U);
      D.font(20 * U); D.fill(rgba(w.pal.hot, 0.8 * a));
      D.spaced('ah', 0, 70 * U, 20 * U, 3 * U, 'center');
    } }
  ]);

  /* ==========================================================================
     ACT VII — LOVE.  The conditional finally resolves into something the
     machine was never given a symbol for.
     ======================================================================== */

  /* 02:57.246 — I've studied */
  S('love.studied', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.14);
      /* a stack of textbooks / opened references, flipping */
      for (var i = 0; i < 5; i++) {
        var q = clamp((p - i * 0.06) / 0.3, 0, 1);
        if (q <= 0) continue;
        var y = -140 * U + i * 62 * U;
        D.lw(2.4); D.stroke(rgba(w.pal.accent, (0.7 - i * 0.08) * a * q));
        D.srect(-200 * U + i * 10 * U, y, 400 * U - i * 20 * U, 46 * U);
        D.lw(1.2); D.stroke(rgba(w.pal.accent, 0.3 * a * q));
        D.line(-180 * U + i * 10 * U, y + 30 * U, 160 * U - i * 10 * U, y + 30 * U);
      }
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().fillText("I've studied", 0, H * 0.36);
    } }
  ]);

  /* 02:58.173 — I've studied how to properly */
  S('love.properly', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      /* a library that keeps growing, then one book left open */
      var sh = 6;
      for (var s = 0; s < sh; s++) {
        var q = clamp((p - s * 0.05) / 0.3, 0, 1);
        if (q <= 0) continue;
        var x = (s / (sh - 1) - 0.5) * W * 0.84;
        D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.35 * a * q));
        D.srect(x - 40 * U, -180 * U, 80 * U, 360 * U);
        for (var b = 0; b < 14; b++) {
          D.lw(1.2); D.stroke(rgba(w.pal.accent, (0.12 + hash(s * 31 + b) * 0.3) * a * q));
          D.line(x - 32 * U, -160 * U + b * 24 * U, x + 32 * U, -160 * U + b * 24 * U);
        }
      }
      /* the open book in front */
      var ok = clamp((p - 0.35) / 0.4, 0, 1);
      if (ok > 0) {
        D.lw(3); D.stroke(rgba(w.pal.ink, 0.9 * a * ok));
        D.ctx().beginPath();
        D.ctx().moveTo(-160 * U, 260 * U); D.ctx().lineTo(-160 * U, 190 * U);
        D.ctx().lineTo(0, 210 * U); D.ctx().lineTo(160 * U, 190 * U);
        D.ctx().lineTo(160 * U, 260 * U); D.ctx().lineTo(0, 282 * U); D.ctx().closePath();
        D.ctx().stroke();
        D.lw(1.6); D.stroke(rgba(w.pal.hot, 0.7 * a * ok));
        D.line(0, 210 * U, 0, 282 * U);
      }
      D.font(26 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText("I've studied how to properly", 0, -H * 0.38);
    } }
  ]);

  /* 02:59.929 / 03:03.646 / 03:07.665 / 03:11.356 — LO-O-OVE ×4.
     The same word, four times, each one less of a formula and more of a
     feeling: 1) molecular 2) algebraic 3) a hand-drawn word 4) a heartbeat. */
  S('love.l1', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.08);
      /* molecular: the word as a chemical structure */
      var word = 'LO-O-OVE';
      D.font(64 * U, '700');
      var total = D.measure(word, 64 * U, '700');
      var x0 = -total / 2;
      D.ctx().textAlign = 'left';
      for (var i = 0; i < word.length; i++) {
        var ch = word.charAt(i);
        var cw = D.measure(ch, 64 * U, '700');
        var cx = x0 + cw / 2, cy = Math.sin(i * 0.9 + w.time * 2) * 22 * U;
        /* bonds */
        if (i > 0) {
          var pw = D.measure(word.charAt(i - 1), 64 * U, '700');
          var px2 = x0 - pw / 2, py2 = Math.sin((i - 1) * 0.9 + w.time * 2) * 22 * U;
          D.lw(2); D.stroke(rgba(w.pal.accent, 0.6 * a));
          D.line(px2, py2, cx, cy);
        }
        D.fill(rgba(w.pal.ink, 0.95 * a));
        D.ctx().fillText(ch, x0, 22 * U + cy);
        /* the atom */
        D.lw(1.6); D.stroke(rgba(ch === '-' ? w.pal.accent : w.pal.hot, 0.7 * a));
        D.scircle(cx, cy, cw * 0.62);
        x0 += cw;
      }
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.ctx().textAlign = 'center';
      D.spaced('C₈H₁₁NO₂  ·  dopamine  ·  detected', 0, 120 * U, 14 * U, 2.4 * U, 'center');
    } }
  ]);

  S('love.l2', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.08);
      /* algebraic */
      D.font(60 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('LO-O-OVE', 0, 0);
      D.lw(2); D.stroke(rgba(w.pal.hot, 0.8 * a));
      D.line(-W * 0.34, -14 * U, W * 0.34, -14 * U);
      /* expansion terms flying in */
      var terms = ['lim', '∫', 'Σ', 'd/dt', 'e^iπ', '√', '∞'];
      for (var i = 0; i < terms.length; i++) {
        var s1 = hash(i * 313 + 3), s2 = hash(i * 977 + 7);
        var q = clamp((p - s1 * 0.5) / 0.4, 0, 1);
        if (q <= 0) continue;
        D.font((22 + s1 * 22) * U);
        D.fill(rgba(w.pal.accent, 0.7 * a * q));
        D.ctx().fillText(terms[i], (s2 - 0.5) * W * 0.84, -110 * U + s1 * 40 * U - q * 30 * U);
      }
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a));
      D.spaced('solving…', 0, 90 * U, 15 * U, 2.6 * U, 'center');
    } }
  ]);

  S('love.l3', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.08);
      /* the first genuinely handwritten thing in the whole film:
         a rough, uneven, human line — drawn as jittered freehand strokes */
      var word = 'LO-O-OVE';
      D.font(72 * U, '700');
      var total = D.measure(word, 72 * U, '700');
      var x0 = -total / 2;
      D.ctx().textAlign = 'left';
      D.lw(5); D.stroke(rgba(w.pal.love, 0.95 * a));
      D.ctx().lineCap = 'round'; D.ctx().lineJoin = 'round';
      for (var i = 0; i < word.length; i++) {
        var ch = word.charAt(i);
        var cw = D.measure(ch, 72 * U, '700');
        var jx = (hash(i * 9176) - 0.5) * 9 * U;
        var jy = (hash(i * 3391) - 0.5) * 11 * U;
        /* each letter gets a slight rotation, like it was written by hand */
        D.ctx().save();
        D.ctx().translate(x0 + cw / 2 + jx, jy);
        D.ctx().rotate((hash(i * 5527) - 0.5) * 0.10);
        D.ctx().fillText(ch, -cw / 2, 24 * U);
        D.ctx().restore();
        x0 += cw;
      }
      D.ctx().lineCap = 'butt';
      /* a wobbling underline, drawn slowly */
      var uw = clamp(p / 0.7, 0, 1);
      D.lw(4); D.stroke(rgba(w.pal.love, 0.75 * a));
      D.ctx().beginPath();
      for (var k = 0; k <= 60 * uw; k++) {
        var u = k / 60;
        var xx = -total / 2 + u * total;
        var yy = 66 * U + Math.sin(u * 14 + w.time) * 4 * U;
        if (k === 0) D.ctx().moveTo(xx, yy); else D.ctx().lineTo(xx, yy);
      }
      D.ctx().stroke();
      D.font(16 * U); D.fill(rgba(w.pal.love, 0.7 * a));
      D.ctx().textAlign = 'center';
      D.spaced('(no equation required)', 0, 120 * U, 16 * U, 3 * U, 'center');
    } }
  ]);

  /* 03:00.857 — Question me */
  S('love.question', [
    { l: 32, e: function (w, p) {
      var a = vis(p, 0.14);
      D.font(56 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('Question me', 0, -30 * U);
      /* a prompt cursor, waiting, and a list of ready answers */
      var blink = Math.sin(w.time * 6) > 0;
      if (blink) {
        D.fill(rgba(w.pal.love, 0.9 * a));
        D.frect(60 * U, -80 * U, 22 * U, 56 * U);
      }
      for (var i = 0; i < 5; i++) {
        var q = clamp((p - 0.2 - i * 0.1) / 0.25, 0, 1);
        if (q <= 0) continue;
        D.lw(1.6); D.stroke(rgba(w.pal.accent, 0.5 * a * q));
        D.srect(-W * 0.34, 60 * U + i * 44 * U, W * 0.68, 34 * U);
        D.font(17 * U); D.fill(rgba(w.pal.accent, 0.7 * a * q));
        D.text('> ' + ['why do you stay', 'what are you', 'do you feel it',
                       'what happens after', '…'][i], -W * 0.34 + 18 * U, 60 * U + i * 44 * U + 23 * U);
      }
    } }
  ]);

  /* 03:01.901 — Question me, I can answer all */
  S('love.answer', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.11);
      /* answers cascading: every question answered, none of them the one */
      for (var i = 0; i < 22; i++) {
        var s1 = hash(i * 9176 + 3), s2 = hash(i * 3391 + 7);
        var q = clamp((p - s1 * 0.45) / 0.35, 0, 1);
        if (q <= 0) continue;
        var x = (s1 - 0.5) * W * 0.9;
        var y = -H * 0.44 + s2 * H * 0.9;
        D.lw(1.4); D.stroke(rgba(w.pal.accent, 0.4 * a * q));
        D.srect(x, y, 150 * U + s2 * 180 * U, 28 * U);
        D.font(15 * U); D.fill(rgba(w.pal.accent, 0.6 * a * q));
        D.spaced(['true', 'false', 'null', '42', 'yes', 'no', 'maybe', 'undefined'][i % 8],
                 x + 10 * U, y + 19 * U, 13 * U, 1.6 * U);
      }
      D.font(26 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('I can answer all', 0, -H * 0.40);
    } }
  ]);

  /* 03:04.540 — I know the algebraic expression of */
  S('love.algebraic', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      /* a long equation being written across the frame, then erased */
      var eq = '( ∂you/∂t ) · ( ∫me dt ) − √(alone) = 0';
      D.font(38 * U);
      var q = clamp(p / 0.6, 0, 1);
      var tw = D.measure(eq, 38 * U);
      D.ctx().textAlign = 'left';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      var cx = -tw / 2;
      var n = Math.ceil(eq.length * q);
      for (var i = 0; i < n; i++) {
        var ch = eq.charAt(i);
        var cw = D.measure(ch, 38 * U);
        D.ctx().fillText(ch, cx, 0);
        cx += cw;
      }
      if (q < 1 && Math.sin(w.time * 8) > 0) {
        D.fill(rgba(w.pal.love, 0.9 * a));
        D.frect(cx, -30 * U, 14 * U, 38 * U);
      }
      /* the equals sign glowing: the one term it cannot evaluate */
      var eqx = -tw / 2 + D.measure(eq.slice(0, eq.indexOf('=')), 38 * U);
      D.lw(2.4); D.stroke(rgba(w.pal.love, 0.8 * a * clamp((p - 0.6) / 0.3, 0, 1)));
      D.scircle(eqx + 12 * U, -8 * U, 34 * U);
      D.font(15 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.accent, 0.65 * a));
      D.spaced('all terms evaluable  ·  except one', 0, 110 * U, 15 * U, 2.4 * U, 'center');
      D.font(26 * U); D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('I know the algebraic expression of', 0, -H * 0.42);
    } }
  ]);

  /* 03:08.483 — Though you are free */
  S('love.free', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.13);
      /* an open cage with the door swinging, entirely empty */
      var sw = E.outElastic(clamp(p / 0.7, 0, 1));
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.75 * a));
      D.srect(-170 * U, -150 * U, 340 * U, 300 * U);
      for (var i = 1; i < 6; i++) {
        D.lw(1.4); D.stroke(rgba(w.pal.grid, 0.5 * a));
        D.line(-170 * U + i * 56 * U, -150 * U, -170 * U + i * 56 * U, 150 * U);
      }
      /* the door, hanging open */
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.85 * a));
      var persp = Math.cos(sw * Math.PI * 0.42);
      D.ctx().beginPath();
      D.ctx().moveTo(170 * U, -150 * U);
      D.ctx().lineTo(170 * U + 150 * U * persp, -128 * U);
      D.ctx().lineTo(170 * U + 150 * U * persp, 128 * U);
      D.ctx().lineTo(170 * U, 150 * U);
      D.ctx().stroke();
      /* and something small flying away from it */
      var fly = clamp((p - 0.3) / 0.6, 0, 1);
      var fx = lerp(170 * U, W * 0.46, E.outQuad(fly));
      var fy = lerp(0, -230 * U, E.outQuad(fly)) + Math.sin(w.time * 4) * 14 * U;
      D.lw(2.4); D.stroke(rgba(w.pal.ink, 0.9 * a * (1 - fly * 0.5)));
      D.ctx().beginPath();
      D.ctx().moveTo(fx, fy);
      D.ctx().lineTo(fx - 34 * U + Math.sin(w.time * 9) * 12 * U, fy - 26 * U);
      D.ctx().moveTo(fx, fy);
      D.ctx().lineTo(fx - 34 * U + Math.sin(w.time * 9 + 1) * 12 * U, fy + 26 * U);
      D.ctx().stroke();
      D.font(28 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('Though you are free', 0, -H * 0.40);
    } }
  ]);

  /* 03:09.746 — I am trapped */
  S('love.trappedme', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.13);
      /* the same cage, but the door has shut and the bars are inside me */
      var q = E.inOutQuad(clamp(p / 0.5, 0, 1));
      D.lw(2.6); D.stroke(rgba(w.pal.accent, 0.7 * a));
      D.srect(-170 * U, -150 * U, 340 * U, 300 * U);
      D.lw(2.6); D.stroke(rgba(w.pal.hot, 0.9 * a));
      D.line(170 * U, -150 * U, 170 * U, 150 * U);
      /* a body outline inside, and ribs becoming bars */
      D.lw(2.4); D.stroke(rgba(w.pal.ink, 0.85 * a));
      D.ctx().beginPath(); D.ctx().arc(0, -110 * U, 34 * U, 0, TAU); D.ctx().stroke();
      D.ctx().beginPath();
      D.ctx().moveTo(0, -76 * U); D.ctx().lineTo(0, 40 * U);
      D.ctx().moveTo(-44 * U, -46 * U); D.ctx().lineTo(44 * U, -46 * U);
      D.ctx().moveTo(0, 40 * U); D.ctx().lineTo(-30 * U, 130 * U);
      D.ctx().moveTo(0, 40 * U); D.ctx().lineTo(30 * U, 130 * U);
      D.ctx().stroke();
      for (var i = 0; i < 5; i++) {
        var y = -60 * U + i * 26 * U;
        D.lw(2.4); D.stroke(rgba(w.pal.hot, 0.85 * a * q));
        D.line(-48 * U, y, 48 * U, y);
      }
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.92 * a));
      D.ctx().fillText('I am trapped', 0, -H * 0.40);
    } }
  ]);

  /* 03:10.801 — Trapped in */
  S('love.trappedin', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.16);
      D.font(30 * U); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.ctx().fillText('Trapped in', 0, -H * 0.26);
      var k = E.outCubic(clamp(p / 0.4, 0, 1));
      D.lw(7); D.stroke(rgba(w.pal.love, 0.85 * a));
      D.line(0, -H * 0.22 + 40 * U, 0, -H * 0.22 + 40 * U + 90 * U * k);
      D.arrow(0, -H * 0.22 + 40 * U + 90 * U * k, Math.PI / 2, 22 * U);
    } }
  ]);

  /* 03:11.356 — LO-O-OVE. The word is no longer the output; it is the state. */
  S('love.l4b', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.10);
      var beat = pulse(w.time, 0.6);
      D.ctx().save();
      D.ctx().translate(0, -H * 0.06);
      D.ctx().scale(1 + beat * 0.10, 1 + beat * 0.10);
      D.font(84 * U, '700'); D.ctx().textAlign = 'center';
      D.ctx().globalCompositeOperation = 'lighter';
      D.fill(rgba(w.pal.love, 0.34 * a));
      D.ctx().fillText('LO-O-OVE', 0, 0);
      D.ctx().globalCompositeOperation = 'source-over';
      D.fill(rgba(w.pal.ink, 0.98 * a));
      D.ctx().fillText('LO-O-OVE', 0, 0);
      D.ctx().restore();
      /* the heart, drawn with a real hand this time */
      var hb = 1 + beat * 0.10;
      D.ctx().save(); D.ctx().translate(0, H * 0.24); D.ctx().scale(hb, hb);
      D.lw(4); D.stroke(rgba(w.pal.love, 0.9 * a));
      D.ctx().beginPath();
      for (var i = 0; i <= 120; i++) {
        var u = i / 120 * TAU;
        var hx = 16 * Math.pow(Math.sin(u), 3) * 6.4 * U;
        var hy = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * 6.4 * U;
        var jx = (noise(u * 12 + w.time * 0.4, 1) - 0.5) * 3 * U;
        if (i === 0) D.ctx().moveTo(hx + jx, hy); else D.ctx().lineTo(hx + jx, hy);
      }
      D.ctx().closePath(); D.ctx().stroke();
      D.ctx().restore();
    } }
  ]);

  /* 03:13.460 — (instrumental — open loop).
     12.4 s of outro with no words. The loop becomes literal: the last
     EXECUTION is re-entered forever while the world slowly turns warm. */
  S('inst.loop', [
    { l: 20, e: function (w, p) {
      var a = vis(p, 0.03);
      /* an infinite loop, drawn as a ribbon that never closes */
      var pts = [];
      for (var i = 0; i <= 160; i++) {
        var u = i / 160;
        var an = u * TAU * 1.0 - Math.PI / 2;
        var rad = (200 + Math.sin(u * TAU * 2 + w.time * 0.4) * 70) * U;
        pts.push([Math.cos(an) * rad, Math.sin(an) * rad * 0.5]);
      }
      D.lw(3.4); D.stroke(rgba(w.pal.love, 0.30 * a));
      D.path(D.smooth(pts, 3), false);
      D.lw(1.4); D.stroke(rgba(w.pal.love, 0.16 * a));
      D.ctx().save(); D.ctx().scale(1.35, 1.35);
      D.path(D.smooth(pts, 3), false);
      D.ctx().restore();
      /* the travelling token that never arrives */
      var tu = (w.time * 0.11) % 1;
      var ti = Math.floor(tu * 160);
      D.fill(rgba(w.pal.ink, 0.9 * a));
      D.circle(pts[ti][0], pts[ti][1], 7 * U); D.ctx().fill();
      D.font(14 * U); D.fill(rgba(w.pal.love, 0.6 * a));
      D.ctx().textAlign = 'center';
      D.spaced('while (true) { execute(self); }', 0, H * 0.40, 14 * U, 2.4 * U, 'center');
    } },
    { l: 34, e: function (w, p) {
      /* the last execution, still running, still counted */
      var a = vis(p, 0.06);
      var n = Math.floor(w.time * 0.55);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.35 * a));
      D.ctx().textAlign = 'right';
      for (var i = 0; i < 9; i++) {
        var c = n - i;
        if (c < 1) continue;
        D.text('exec #' + c + '  →  ok', W * 0.44, -H * 0.40 + i * 22 * U);
      }
      D.font(15 * U); D.fill(rgba(w.pal.love, 0.55 * a));
      D.ctx().textAlign = 'left';
      D.spaced('iteration ' + n.toLocaleString('en-US'), -W * 0.44, H * 0.44, 15 * U, 2.4 * U);
    } }
  ]);

  /* 03:25.811 — EXECUTION (the last one). One window, still lit. */
  S('ex.final', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.12);
      var lit = 0.55 + 0.45 * Math.sin(w.time * 1.4);
      D.ctx().globalCompositeOperation = 'lighter';
      var g = D.ctx().createRadialGradient(0, 0, 0, 0, 0, 460 * U);
      g.addColorStop(0, rgba(w.pal.love, 0.22 * a * lit));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      D.fill(g); D.circle(0, 0, 460 * U); D.ctx().fill();
      D.ctx().globalCompositeOperation = 'source-over';
      D.lw(3); D.stroke(rgba(w.pal.love, 0.85 * a));
      D.srect(-230 * U, -140 * U, 460 * U, 280 * U);
      D.lw(1.6); D.stroke(rgba(w.pal.love, 0.45 * a));
      D.line(0, -140 * U, 0, 140 * U);
      D.line(-230 * U, 0, 230 * U, 0);
      D.font(34 * U, '700'); D.ctx().textAlign = 'center';
      D.fill(rgba(w.pal.ink, 0.95 * a));
      D.ctx().fillText('EXECUTION', 0, 12 * U);
    } },
    { l: 14, e: function (w, p) {
      var a = vis(p, 0.18);
      D.font(14 * U); D.fill(rgba(w.pal.love, 0.65 * a));
      D.ctx().textAlign = 'center';
      D.spaced('last call  ·  ' + EM.fmtTime(EM.AUDIO_END), 0, 200 * U, 14 * U, 2.6 * U, 'center');
    } }
  ]);

  /* 03:26.620 — (outro). 5.4 s: everything settles, the cursor keeps blinking. */
  S('outro', [
    { l: 30, e: function (w, p) {
      var a = vis(p, 0.05);
      /* all that is left: a prompt, and the loop count still climbing */
      var blink = (w.time * 0.9) % 1 < 0.55;
      D.font(30 * U);
      D.fill(rgba(w.pal.love, 0.85 * a));
      D.ctx().textAlign = 'center';
      D.spaced('world.execute(me);', 0, -20 * U, 30 * U, 3 * U, 'center');
      if (blink) {
        D.fill(rgba(w.pal.love, 0.9 * a));
        D.frect(D.measure('world.execute(me);', 30 * U) * 0.5 + 200 * U * 0.0 + 150 * U, -44 * U, 15 * U, 32 * U);
      }
      D.font(14 * U); D.fill(rgba(w.pal.accent, 0.5 * a));
      D.spaced('> waiting for input', 0, 30 * U, 14 * U, 2.4 * U, 'center');
      /* a very slow dissolve of the loop counter */
      D.text('iterations: ' + Math.floor(w.time * 0.55).toLocaleString('en-US'), 0, H * 0.34, 'center');
    } },
    { l: 40, e: function (w, p) {
      /* credits, typed out — the only text in the film that is not the song */
      var a = vis(p, 0.08);
      if (p < 0.12) return;
      var q = clamp((p - 0.12) / 0.45, 0, 1);
      D.font(15 * U); D.fill(rgba(w.pal.accent, 0.55 * a));
      D.ctx().textAlign = 'center';
      var lines = [
        'world.execute(me);',
        'music  ·  Mili  —  Miracle Milk',
        'a realtime canvas interpretation',
        'timeline: ' + EM.Lyrics.count + ' lyric cues  ·  ' + EM.ONSETS.length + ' MIDI onsets  ·  130.00 BPM',
        'clock: audio.currentTime (single source of truth)'
      ];
      for (var i = 0; i < lines.length; i++) {
        var qq = clamp((q - i * 0.14) / 0.3, 0, 1);
        if (qq <= 0) continue;
        D.ctx().globalAlpha = qq * a;
        D.spaced(lines[i], 0, -H * 0.34 + i * 26 * U, 15 * U, 2.2 * U, 'center');
      }
      D.ctx().globalAlpha = 1;
    } }
  ]);

  /* 03:31.984 — (end). Nothing moves. The system is still waiting. */
  S('end', [
    { l: 50, e: function (w, p) {
      var blink = (w.time * 0.8) % 1 < 0.5;
      D.font(18 * U); D.fill(rgba(w.pal.love, 0.55));
      D.ctx().textAlign = 'center';
      D.spaced('[ end of transmission ]', 0, H * 0.44, 18 * U, 3 * U, 'center');
      if (blink) {
        D.fill(rgba(w.pal.love, 0.7));
        D.frect(0, H * 0.44 - 16 * U, 11 * U, 20 * U);
      }
    } }
  ]);

  EM.__part3 = true;
})(window.EM);
