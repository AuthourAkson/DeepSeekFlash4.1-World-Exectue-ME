/* ============================================================================
 * 42_scenes_c.js — 画板 s089–s131
 * ----------------------------------------------------------------------------
 * 第三幕：处决（2:27–2:57）→ LO-O-OVE（2:57–3:31）
 * EXECUTION 出现 18 次 = 18 块完全不同的画板：从一台刚转起来的齿轮，
 * 一路碎到最后一扇亮着的窗。爱表达不出来，就只能执行。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, S = WX.S, W = WX.W, H = WX.H, M = D.m;
  var CX = W / 2, CY = H / 2;
  var LINE = 260;

  function A(wr, a) { return EM.withA(wr.accent, a === undefined ? 1 : a); }
  function AC2(wr, a) { return EM.withA(WX.WORLD.accent2(wr), a === undefined ? 1 : a); }
  function INK(wr, a) { return WX.WORLD.ink(wr, a === undefined ? 1 : a); }
  function WARM(a) { return EM.withA(EM.PAL.warm, a); }
  function HEAT(a) { return EM.withA(EM.PAL.heat, a); }

  /** 处决段通用的"爆炸感"：真实音符驱动的冲击环。 */
  function shock(x, y, t, wr, n, R) {
    var rec = EM.recent(t, 0.7, 6);
    for (var i = 0; i < rec.length; i++) {
      var age = rec[i].age, u = age / 0.7;
      D.circle(x, y, 40 + u * R, EM.withA(EM.PAL.heat, 0.22 * (1 - u) * rec[i].accent * n), 1.5 + 3 * (1 - u));
    }
  }

  /** 处决段通用标题。 */
  function exec(x, y, size, wr, t, n) {
    M.head('EXECUTION', x, y, size, INK(wr, 1), { align: 'center', weight: 'bold', track: 6 });
    M.mono('#' + n + ' / 18', x, y + 40, 16, HEAT(0.8), { align: 'center' });
  }

  /* -------------------------------------------- 处决序列 2–13（十二块画板） */

  S.def('s089', { name: 'EXECUTION  2/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 430;
    for (var i = 0; i < 3; i++) {
      M.piston(x - 240 + i * 240, 700, 90, 300, t * (2.4 + i * 0.5) + i, i === 1 ? WARM(0.85) : A(wr, 0.7), 2.4);
    }
    D.seg(x - 360, 700, x + 360, 700, A(wr, 0.4), 2);
    shock(x, y, t, wr, 1, 320);
    exec(x, 200, 44, wr, t, 2);
  });

  S.def('s090', { name: 'EXECUTION  3/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 420;
    var k = EM.clamp(p * 2.2, 0, 1);
    var hit = EM.hit(t, 0.18);
    D.save();
    D.translate(x, y - 120 - 200 * (1 - k) + hit * 26);
    M.stamp(0, 0, 460, 170, 'EXECUTION', HEAT(0.9), 0, 54);
    D.restore();
    D.rect(x - 240, 640, 480, 60, A(wr, 0.10));
    D.rect(x - 240, 640, 480, 60, A(wr, 0.45), 2);
    if (hit > 0.5) {
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI + i * 0.3;
        D.seg(x, 640, x + Math.cos(a) * 200 * hit, 640 + Math.sin(a) * 90 * hit, HEAT(0.35 * hit), 1.6);
      }
    }
    M.mono('#3 / 18', x, 250, 16, HEAT(0.8), { align: 'center' });
  });

  S.def('s091', { name: 'EXECUTION  4/18' }, function (p, cue, t, wr) {
    var n = 4 + Math.floor(p * 9);
    for (var g = 0; g < 3; g++) {
      M.tally(LINE + 180 + g * 400, 300 + g * 140, g === 2 ? Math.min(n, 9) : 9, g === 2 ? HEAT(0.9) : A(wr, 0.65), 3, 3);
    }
    M.mono('COUNTED  ' + (9 + 9 + Math.min(n, 9)) + '  TIMES', LINE + 180, 720, 18, A(wr, 0.6));
    D.mono('EXECUTION', LINE + 180, 260, 22, HEAT(0.6));
    M.mono('#4 / 18', W - 200, 780, 16, HEAT(0.8));
  });

  S.def('s092', { name: 'EXECUTION  5/18' }, function (p, cue, t, wr) {
    var x = CX + 40, y = 430, s = 40 + 10 * EM.hit(t, 0.3);
    D.poly([[x, y - 300], [x + 280, y + 200], [x - 280, y + 200]], HEAT(0.12));
    D.line([[x, y - 300], [x + 280, y + 200], [x - 280, y + 200]], HEAT(0.9), 5, true);
    D.seg(x, y - 140, x, y + 60, HEAT(0.95), 12);
    D.circle(x, y + 140, 16, HEAT(0.95));
    M.head('EXECUTION', x, y + 320, 40, HEAT(0.95), { align: 'center', weight: 'bold', track: 4 });
    D.mono('#5 / 18', x, y + 360, 15, A(wr, 0.6), { align: 'center' });
  });

  S.def('s093', { name: 'EXECUTION  6/18' }, function (p, cue, t, wr) {
    for (var i = 0; i < 6; i++) {
      var k = EM.clamp(p * 1.8 - i * 0.12, 0, 1);
      if (k <= 0) continue;
      var s = 120 - i * 16;
      D.save();
      D.translate(CX + 60, 430);
      D.scale(EM.ease(k), EM.ease(k));
      D.rect(-s * 3.2, -s * 0.6, s * 6.4, s * 1.2, A(wr, 0.04));
      M.head('EXECUTION', 0, s * 0.22, s, HEAT(0.35 + i * 0.1), { align: 'center', weight: 'bold', track: 2 });
      D.restore();
    }
    M.mono('#6 / 18', W - 200, 780, 16, HEAT(0.8));
  });

  S.def('s094', { name: 'EXECUTION  7/18' }, function (p, cue, t, wr) {
    var x0 = LINE + 140, y = 560, x1 = W - 200;
    var k = EM.ease(EM.clamp(p * 1.1, 0, 1));
    D.seg(x0, y, x1, y, A(wr, 0.35), 4);
    var fx = x0 + (x1 - x0) * k;
    D.seg(x0, y, fx, y, HEAT(0.85), 5);
    for (var i = 0; i < 40; i++) {
      var sx = fx - i * 8;
      if (sx < x0) break;
      D.circle(sx, y - 4 + (EM.h(i, 1, 0) - 0.5) * 12, 2 + 3 * EM.h(i, 2, (t * 20) | 0), WARM(0.4 * (1 - i / 40)));
    }
    D.circle(fx, y, 12 + 10 * EM.hit(t, 0.2), HEAT(0.9));
    if (k > 0.9) { for (var q = 0; q < 8; q++) D.circle(fx, y, 30 + q * 40 * EM.saw(t * 1.4 + q * 0.1), HEAT(0.2 * (1 - q / 8))); }
    D.mono('EXECUTION  IN  ' + ((1 - k) * 3).toFixed(2) + ' s', x0, 260, 22, HEAT(0.8));
    M.mono('#7 / 18', W - 200, 780, 16, HEAT(0.8));
  });

  S.def('s095', { name: 'EXECUTION  8/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 430;
    var a = EM.hit(t, 0.16) * 1.1;
    D.circle(x, y, 90, A(wr, 0.10));
    D.circle(x, y, 90, A(wr, 0.5), 2);
    D.save(); D.translate(x, y); D.rotate(-0.9 + a * 1.6 + p * 1.2);
    D.rect(-30, -12, 300, 24, A(wr, 0.75));
    D.rect(240, -40, 70, 80, HEAT(0.85));
    D.restore();
    D.circle(x + 180, 640, 46, A(wr, 0.12));
    D.circle(x + 180, 640, 46, A(wr, 0.5), 2);
    D.mono('EXEC', x + 180, 646, 15, A(wr, 0.8), { align: 'center' });
    D.seg(x - 280, 700, x + 460, 700, A(wr, 0.3), 1.6);
    M.head('EXECUTION', x + 60, 220, 40, HEAT(0.85), { align: 'center', weight: 'bold', track: 4 });
    M.mono('#8 / 18', x + 60, 260, 15, A(wr, 0.6), { align: 'center' });
  });

  S.def('s096', { name: 'EXECUTION  9/18' }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 300;
    M.panel(x, y, 860, 320, 'shell', A(wr, 0.8));
    var line = '> execute --self --force';
    var shown = line.slice(0, Math.max(1, Math.ceil(line.length * EM.clamp(p * 1.5, 0, 1))));
    D.mono(shown, x + 26, y + 110, 30, HEAT(0.9));
    M.caret(x + 26 + D.measure(shown, 30, true), y + 110, 30, HEAT(1), t);
    for (var i = 0; i < Math.round(EM.clamp(p * 1.3, 0, 1) * 6); i++) {
      D.mono('  [' + i + ']  executed', x + 26, y + 170 + i * 28, 16, A(wr, 0.5));
    }
    M.person(x + 700, 700, 24, A(wr, 0.55), 'stand');
    M.mono('#9 / 18', W - 200, 780, 16, HEAT(0.8));
  });

  S.def('s097', { name: 'EXECUTION  10/18' }, function (p, cue, t, wr) {
    var x0 = LINE + 140, y0 = 220, nx = 20, ny = 13, cw = (W - LINE - 300) / nx, ch = 440 / ny;
    var collapse = EM.ease(EM.clamp(p * 1.2, 0, 1));
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var d = EM.dist(i, j, nx / 2, ny / 2) / (nx / 2);
      var pull = EM.clamp(1 - collapse * 1.6 + d * 0.5, 0, 1);
      var px = x0 + cw * (i + (nx / 2 - i) * (1 - pull) * 0.9);
      var py = y0 + ch * (j + (ny / 2 - j) * (1 - pull) * 0.9);
      D.rect(px, py, cw * 0.7 * pull + 2, ch * 0.55 * pull + 2, EM.withA(collapse > 0.7 ? EM.PAL.heat : wr.accent, 0.25 + 0.4 * (1 - d)));
    }
    M.head('EXECUTION', CX + 60, 740, 40, HEAT(0.85), { align: 'center', weight: 'bold', track: 4 });
    M.mono('#10 / 18', CX + 60, 780, 15, A(wr, 0.6), { align: 'center' });
  });

  S.def('s098', { name: 'EXECUTION  11/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 430;
    var n = 12 - Math.floor(EM.clamp(p, 0, 1) * 11.99);
    M.dotText(String(n).padStart(2, '0'), x - 200, y - 120, 24, HEAT(0.9));
    for (var i = 0; i < n; i++) {
      var a = i / n * EM.TAU - Math.PI / 2;
      D.seg(x + Math.cos(a) * 300, y + Math.sin(a) * 190, x + Math.cos(a) * 330, y + Math.sin(a) * 210, i === 0 ? HEAT(0.9) : A(wr, 0.3), 3);
    }
    D.circle(x, y, 210, A(wr, 0.10), 1.4);
    M.head('EXECUTION', x, y + 400, 34, INK(wr, 0.95), { align: 'center', weight: 'bold', track: 5 });
    M.mono('#11 / 18', x, y + 440, 15, A(wr, 0.6), { align: 'center' });
  });

  S.def('s099', { name: 'EXECUTION  12/18' }, function (p, cue, t, wr) {
    M.glitch('EXECUTION', CX + 60, 460, 84, INK(wr, 1), t, 0.6 + p, { align: 'center', weight: 'bold' });
    var n = Math.round(EM.clamp(p * 1.3, 0, 1) * 40);
    for (var i = 0; i < n; i++) {
      var x = LINE + 140 + EM.h(i, 1, 0) * (W - LINE - 300), y = 200 + EM.h(i, 2, 0) * 500;
      var s = 6 + EM.h(i, 3, 0) * 40;
      D.save(); D.translate(x, y); D.rotate(EM.h(i, 4, 0) * 3);
      D.rect(-s / 2, -s / 4, s, s / 2, EM.withA(EM.PAL.heat, 0.4 + 0.4 * EM.h(i, 5, 0)));
      D.restore();
    }
    M.mono('#12 / 18', CX + 60, 780, 15, HEAT(0.85), { align: 'center' });
  });

  S.def('s100', { name: 'EXECUTION  13/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    D.rect(LINE + 140, 240, W - LINE - 300, 420, EM.withA(EM.PAL.heat, 0.10 * EM.clamp(p * 1.6, 0, 1)));
    M.head('EXECUTION', x, y + 30, 150, HEAT(0.95), { align: 'center', weight: 'bold', track: 10 });
    M.head('EXECUTION', x, y + 30, 150, EM.withA([255, 255, 255], 0.35 * EM.hit(t, 0.12)), { align: 'center', weight: 'bold', track: 10 });
    shock(x, y, t, wr, 2, 620);
    M.mono('#13 / 18', x, 730, 16, A(wr, 0.6), { align: 'center' });
  });

  /* ------------------------------------------------ 六语言数数 与 后半个序列 */

  S.def('s101', { name: 'Ein, dos' }, function (p, cue, t, wr) {
    var x = CX + 40, y = 470;
    D.circle(x - 160, y, 60, A(wr, 0.12)); D.circle(x - 160, y, 60, HEAT(0.85), 3);
    D.circle(x + 160, y, 60, A(wr, 0.12)); D.circle(x + 160, y, 60, HEAT(0.35), 3);
    M.dotText('1', x - 186, y - 42, 12, HEAT(0.9));
    M.dotText('2', x + 134, y - 42, 12, HEAT(0.4));
    M.head('ein · dos', x, y + 220, 48, INK(wr, 1), { align: 'center', weight: 'bold', track: 3 });
    D.mono('DE · ES', x, y + 260, 15, A(wr, 0.5), { align: 'center' });
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s102', { name: 'Trois, ne' }, function (p, cue, t, wr) {
    var x = LINE + 240, y = 460;
    var words = ['trois', 'ne'];
    for (var i = 0; i < 2; i++) {
      var k = EM.clamp(p * 2 - i * 0.4, 0, 1);
      D.rect(x + i * 320, y - 90, 240, 180, A(wr, 0.06));
      D.rect(x + i * 320, y - 90, 240, 180, HEAT(0.3 + 0.5 * k), 2.4);
      M.head(words[i], x + i * 320 + 120, y + 26, 56, INK(wr, 1), { align: 'center', weight: 'bold' });
      for (var q = 0; q < 3 + i; q++) D.circle(x + i * 320 + 40 + q * 34, y - 120, 9, HEAT(0.75 * k));
    }
    D.mono('FR · IT', x, y + 200, 15, A(wr, 0.5));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s103', { name: 'Fem, liù' }, function (p, cue, t, wr) {
    var x = LINE + 240, y = 460;
    var words = ['fem', 'liù'];
    for (var i = 0; i < 2; i++) {
      var k = EM.clamp(p * 2 - i * 0.4, 0, 1);
      D.rrect(x + i * 340, y - 100, 260, 200, 12, EM.withA(HEAT(1), 0.06 * k));
      D.rrect(x + i * 340, y - 100, 260, 200, 12, HEAT(0.4 + 0.5 * k), 2.6);
      M.head(words[i], x + i * 340 + 130, y + 30, 60, INK(wr, 1), { align: 'center', weight: 'bold' });
      for (var q = 0; q < 5 + i; q++) {
        var a = q / (5 + i) * EM.TAU;
        D.circle(x + i * 340 + 130 + Math.cos(a) * 90, y + Math.sin(a) * 70, 8, HEAT(0.5 * k));
      }
    }
    D.mono('PT · IT', x, y + 220, 15, A(wr, 0.5));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s104', { name: 'EXECUTION  14/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440;
    M.dotText('16', x - 200, y - 120, 26, HEAT(0.95));
    for (var i = 0; i < 16; i++) {
      var a = -Math.PI / 2 + i / 16 * EM.TAU;
      var on = i < Math.round(p * 16) + 1;
      D.circle(x + Math.cos(a) * 300, y + Math.sin(a) * 200, on ? 13 : 6, on ? HEAT(0.85) : A(wr, 0.25));
      if (on) D.seg(x, y, x + Math.cos(a) * 300, y + Math.sin(a) * 200, HEAT(0.15), 1.2);
    }
    D.circle(x, y, 90, EM.withA(HEAT(1), 0.12));
    D.circle(x, y, 90, HEAT(0.8), 2);
    M.mono('#14 / 18', x, 780, 16, A(wr, 0.6), { align: 'center' });
  });

  S.def('s105', { name: 'If I can  (4)' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    var sh = 3 * EM.clamp(p * 1.2, 0, 1);
    D.save(); D.translate(EM.h(0, 1, (t * 18) | 0) * sh, 0);
    M.diamond(x, y, 132, EM.withA(EM.PAL.accent, 0.7), 2.6);
    D.restore();
    M.mono('IF', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    for (var i = 0; i < 10; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU, r = 40 + EM.h(i, 2, 0) * 160;
      D.seg(x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * r, y + Math.sin(a) * r, HEAT(0.3), 1.2);
    }
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s106', { name: 'If I can give them all the' }, function (p, cue, t, wr) {
    var x = LINE + 300, y = 430;
    M.diamond(x, y, 110, EM.withA(EM.PAL.heat, 0.85), 2.6);
    for (var i = 0; i < 40; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU;
      var k = EM.clamp(p * 1.6 - EM.h(i, 2, 0) * 0.5, 0, 1);
      if (k <= 0) continue;
      var r = 120 + k * (400 + EM.h(i, 3, 0) * 300);
      D.save(); D.translate(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6); D.rotate(a);
      D.rect(-20, -6, 40, 12, EM.withA(EM.PAL.heat, 0.5 * (1 - k * 0.5)));
      D.restore();
    }
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  S.def('s107', { name: 'EXECUTION  15/18' }, function (p, cue, t, wr) {
    var y = 180 + (t * 260 % 520), x0 = LINE + 140, x1 = W - 200;
    for (var i = 0; i < 3; i++) {
      var yy = 180 + ((y + i * 173) % 520);
      D.rect(x0, yy, x1 - x0, 3 + 6 * EM.hit(t, 0.2), EM.withA(EM.PAL.heat, 0.5));
    }
    for (var q = 0; q < 60; q++) {
      var qx = x0 + EM.h(q, 1, 0) * (x1 - x0), qy = 180 + EM.h(q, 2, 0) * 520;
      var near = Math.abs(qy - y) < 60;
      D.rect(qx, qy, 10 + EM.h(q, 3, 0) * 40, 4, EM.withA(near ? EM.PAL.heat : wr.accent, near ? 0.9 : 0.25));
    }
    M.glitch('EXECUTION', CX + 60, 780, 34, HEAT(0.85), t, 0.5, { align: 'center', weight: 'bold' });
  });

  S.def('s108', { name: 'Then I can  (3)' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    M.diamond(x, y, 128, A(wr, 0.35), 2);
    var k = EM.ease(EM.clamp(p * 1.5, 0, 1));
    D.save(); D.translate(EM.h(0, 1, (t * 20) | 0) * 4 * k, EM.h(1, 2, (t * 20) | 0) * 3 * k);
    M.diamond(x, y, 128, HEAT(0.5 + 0.4 * k), 2.8);
    M.mono('THEN', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    D.restore();
    D.seg(x + 128 * 1.35, y, x + 128 * 1.35 + 210 * k, y, HEAT(0.8), 2.6);
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s109', { name: 'Then I can be your only  (2)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440;
    for (var i = 0; i < 3; i++) {
      D.circle(x, y, 120 + i * 90 * EM.saw(t * 0.5 + i * 0.2), HEAT(0.20 * (1 - i / 3)));
    }
    D.circle(x, y, 10 + 14 * EM.hit(t, 0.25), [255, 255, 255, 0.9]);
    for (var q = 0; q < 40; q++) {
      var a = EM.h(q, 1, 0) * EM.TAU, r = 180 + EM.h(q, 2, 0) * 320;
      D.circle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2.6, A(wr, 0.3));
    }
    M.head('ONLY', x, 190, 52, HEAT(0.8), { align: 'center', weight: 'bold', track: 8 });
    M.lyric(cue.text, LINE + 100, 780, 28, INK(wr, 0.9), p, {});
  });

  S.def('s110', { name: 'EXECUTION  16/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440, sh = 6 * EM.clamp(p * 1.2, 0, 1);
    for (var i = 0; i < 3; i++) {
      D.save();
      D.translate(x + (EM.h(i, 1, (t * 16) | 0) - 0.5) * sh * 6, y);
      D.text('EXECUTION', 0, 0, 72, i === 1 ? HEAT(0.6) : EM.withA(i === 0 ? [255, 80, 100] : [80, 230, 255], 0.5), { align: 'center', weight: 'bold' });
      D.restore();
    }
    for (var q = 0; q < 30; q++) {
      var qy = 200 + EM.h(q, 3, 0) * 480;
      D.rect(LINE + 140, qy, (W - LINE - 300) * EM.h(q, 4, (t * 10) | 0), 2 + 6 * EM.h(q, 5, 0), HEAT(0.14));
    }
    M.mono('#16 / 18', x, 800, 16, A(wr, 0.6), { align: 'center' });
  });

  S.def('s111', { name: 'If I can have you back' }, function (p, cue, t, wr) {
    var k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    var baseY = 610;                                   // 脚底基准线
    var gh = 190, gw = gh * 843 / 1264;                // 女（左）
    var mh = 205, mw = mh * 843 / 1264;                // 男（右，稍大）
    var gx = LINE + 260 + 200 * k, mx = CX + 320 + 30 * k;
    WX.PHOTOS.load('girlstand', 'gpt-advice/transparent_svg_assets/girl-stand.png');
    WX.PHOTOS.load('manstand', 'gpt-advice/transparent_svg_assets/man-stand.png');
    WX.PHOTOS.draw('girlstand', 'gpt-advice/transparent_svg_assets/girl-stand.png', gx - gw / 2, baseY - gh, gw, gh, 1);
    WX.PHOTOS.draw('manstand', 'gpt-advice/transparent_svg_assets/man-stand.png', mx - mw / 2, baseY - mh, mw, mh, 1);
    D.dashed(gx + gw / 2, 540, mx - mw / 2 - 20, 540, WARM(0.3 * (1 - k)), 1.4, 10, 8);
    D.mono('return  subject;', LINE + 260, 250, 18, A(wr, 0.6));
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s112', { name: 'I will run the  (2)' }, function (p, cue, t, wr) {
    var x = LINE + 160, y = 320;
    M.panel(x, y, 820, 280, 'command', EM.withA(EM.PAL.heat, 0.8));
    var line = '> run(EXECUTION, forever)';
    var shown = line.slice(0, Math.max(1, Math.ceil(line.length * EM.clamp(p * 1.6, 0, 1))));
    D.mono(shown, x + 26, y + 110, 30, HEAT(0.95));
    M.caret(x + 26 + D.measure(shown, 30, true), y + 110, 30, HEAT(1), t);
    M.ruler(x + 26, y + 200, 740, 20, A(wr, 0.5), 5);
    M.lyric(cue.text, LINE + 120, 200, 30, INK(wr, 0.95), p, {});
  });

  S.def('s113', { name: 'EXECUTION  17/18' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440;
    var n = Math.max(1, Math.round(EM.clamp(p, 0, 1) * 16));
    M.dotText(String(n).padStart(2, '0'), x - 300, y - 60, 20, HEAT(0.9));
    M.head('EXECUTION', x + 100, y, 62, HEAT(0.95), { align: 'center', weight: 'bold', track: 5 });
    for (var i = 0; i < n; i++) {
      D.seg(x - 300 + i * 30, y + 220, x - 300 + i * 30, y + 260, HEAT(0.5 + 0.4 * (i === n - 1)), 3);
    }
    M.mono('#17 / 18  ·  last call', x, 780, 15, A(wr, 0.6), { align: 'center' });
  });

  S.def('s114', { name: 'Though we are trapped  (2)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    for (var i = 0; i < 7; i++) {                      // 肋骨
      var r = 260 - i * 34;
      D.arc(x, y - i * 12, r, Math.PI * 0.15, Math.PI * 0.85, EM.withA(EM.PAL.heat, 0.35 + i * 0.05), 3);
      D.arc(x, y + 60 + i * 12, r * 0.8, Math.PI * 1.15, Math.PI * 1.85, EM.withA(EM.PAL.heat, 0.35 + i * 0.05), 3);
    }
    D.seg(x, 180, x, 740, A(wr, 0.4), 2);
    D.circle(x, y, 20, WARM(0.7));
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s115', { name: 'We are trapped, ah' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 160, y = 460;
    var pts = [];
    var amp = 40 + 120 * EM.clamp(p * 1.4, 0, 1);
    for (var i = 0; i <= 120; i++) {
      var u = i / 120, x = x0 + (x1 - x0) * u;
      var v = Math.sin(u * 26 + t * 8) * amp * (0.3 + 0.7 * Math.abs(Math.sin(u * 3 + t)));
      pts.push([x, y + v]);
    }
    D.line(pts, HEAT(0.9), 2.6);
    for (var q = 0; q < 8; q++) {
      D.arc(x0 + 120 + q * 140, y, 60, -1.2, 1.2, A(wr, 0.25), 1.4);
    }
    M.head('AH—', CX + 60, 250, 90, INK(wr, 1), { align: 'center', weight: 'bold', track: 8 });
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.9), p, {});
  });

  /* --------------------------------------------------------------- LOVE */

  S.def('s116', { name: "I've studied" }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 260;
    M.panel(x, y, 620, 420, 'library', A(wr, 0.8));
    var rows = ['ch.1   how to properly love', 'ch.2   algebraic expression', 'ch.3   (unwritten)'];
    for (var i = 0; i < rows.length; i++) {
      var k = EM.clamp(p * 2.6 - i * 0.5, 0, 1);
      D.mono(rows[i], x + 26, y + 80 + i * 44, 18, (i === 2 ? WARM(0.7) : A(wr, 0.75)) * 1, { alpha: 0.35 + 0.65 * k });
    }
    for (var q = 0; q < 14; q++) {
      D.rect(x + 30 + (q % 7) * 80, y + 250 + Math.floor(q / 7) * 70, 60, 52, A(wr, 0.06));
      D.rect(x + 30 + (q % 7) * 80, y + 250 + Math.floor(q / 7) * 70, 60, 52, A(wr, 0.28), 1.2);
    }
    M.lyric(cue.text, LINE + 120, 200, 30, INK(wr, 0.95), p, {});
  });

  S.def('s117', { name: "I've studied how to properly" }, function (p, cue, t, wr) {
    var x = CX + 120, y = 440;
    var k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    M.head('LOVE', x, y + 20, 90, WARM(0.9), { align: 'center', weight: 'bold', track: 6 });
    var parts = ['L', 'O', 'V', 'E'];
    for (var i = 0; i < 4; i++) {
      var a = i / 4 * EM.TAU + t * 0.3;
      var px = x + Math.cos(a) * 260 * k, py = y + Math.sin(a) * 140 * k;
      D.rect(px - 34, py - 34, 68, 68, A(wr, 0.06));
      D.rect(px - 34, py - 34, 68, 68, A(wr, 0.5), 1.6);
      M.head(parts[i], px, py + 14, 34, INK(wr, 0.9), { align: 'center', weight: 'bold' });
      D.dashed(px, py, x, y, A(wr, 0.2), 1, 6, 6);
    }
    M.lyric(cue.text, LINE + 120, 190, 28, INK(wr, 0.95), p, {});
  });

  S.def('s118', { name: 'LO-O-OVE  1/4  (molecule)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    var k = EM.ease(EM.clamp(p * 1.3, 0, 1));
    M.molecule(x, y, 260 * k, 6, WARM(0.85), 3, 3);
    for (var i = 0; i < 12; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU, r = 320 + EM.h(i, 2, 0) * 120;
      D.circle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 3, A(wr, 0.3));
    }
    M.head('LO-O-OVE', x, 200, 56, INK(wr, 1), { align: 'center', weight: 'bold', track: 8 });
    M.mono('C₈H₁₁NO₂  ·  molar mass  ∞', x, 250, 16, A(wr, 0.55), { align: 'center' });
  });

  S.def('s119', { name: 'Question me' }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 330;
    M.panel(x, y, 800, 260, 'prompt', A(wr, 0.8));
    D.mono('> ?', x + 26, y + 110, 30, WARM(0.9));
    M.caret(x + 26 + D.measure('> ?', 30, true), y + 110, 30, WARM(1), t);
    for (var i = 0; i < 3; i++) {
      var k = EM.clamp(p * 2.4 - i * 0.5, 0, 1);
      D.mono(['ask  anything', 'ask  again', 'ask  LOVE'][i], x + 26, y + 170 + i * 30, 16, A(wr, 0.3 + 0.4 * k));
    }
    M.lyric(cue.text, LINE + 120, 200, 30, INK(wr, 0.95), p, {});
  });

  S.def('s120', { name: 'Question me, I can answer all' }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 240;
    for (var i = 0; i < 20; i++) {
      var k = EM.clamp(p * 2.6 - i * 0.06, 0, 1);
      if (k <= 0) continue;
      var yy = y + (i % 10) * 44;
      var col = LINE + 220 + (i % 2) * 420;
      D.mono(['A: 42', 'A: yes', 'A: always', 'A: never', 'A: LOVE'][i % 5], col, yy, 18, EM.withA(EM.mix(A(wr, 1), EM.PAL.warm, (i % 5) / 5), 0.25 + 0.6 * k));
    }
    M.head('ALL', CX + 200, 660, 90, WARM(0.85), { align: 'center', weight: 'bold', track: 10 });
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s121', { name: 'LO-O-OVE  2/4  (algebra)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    var syms = ['lim', '∫', 'Σ', '∂', '√', 'π', '∞', '≈'];
    for (var i = 0; i < 24; i++) {
      var k = EM.clamp(p * 2 - (i % 8) * 0.1, 0, 1);
      if (k <= 0) continue;
      var a = i / 24 * EM.TAU + t * 0.4;
      var r = (420 - (i % 8) * 40) * EM.ease(k);
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.62;
      D.mono(syms[i % 8], px, py, 26 + (i % 3) * 8, EM.withA(EM.mix(A(wr, 1), EM.PAL.warm, (i % 8) / 8), 0.4 + 0.5 * k), { align: 'center' });
    }
    M.head('LO-O-OVE', x, y + 24, 74, WARM(0.95), { align: 'center', weight: 'bold', track: 8 });
    D.mono('=  lim  ∫  Σ  L(t) dt', x, y + 90, 18, A(wr, 0.6), { align: 'center' });
    M.lyric(cue.text === 'LO-O-OVE' ? '' : cue.text, LINE + 120, 190, 26, INK(wr, 0.85), p, {});
  });

  S.def('s122', { name: 'I know the algebraic expression of' }, function (p, cue, t, wr) {
    var x = LINE + 160, y = 300;
    D.rect(x - 20, y - 60, 960, 380, EM.withA([20, 26, 26], 0.55));
    D.rect(x - 20, y - 60, 960, 380, A(wr, 0.35), 3);
    var lines = ['LOVE  =  Σ ( Δyou / Δme )',
      '      =  ∫  attention · dt  −  distance',
      '      =  1  /  ( 1  −  you )'];
    for (var i = 0; i < lines.length; i++) {
      var k = EM.clamp(p * 2.2 - i * 0.6, 0, 1);
      var shown = lines[i].slice(0, Math.ceil(lines[i].length * k));
      D.mono(shown, x + 30, y + 20 + i * 90, i === 0 ? 32 : 26, EM.withA(EM.mix(A(wr, 1), EM.PAL.warm, i / 3), 0.35 + 0.6 * k));
    }
    var last = EM.clamp(p * 3 - 2.2, 0, 1);
    if (last > 0) D.mono('=  ?', x + 30, y + 290, 30, WARM(0.4 + 0.5 * last));
    M.lyric(cue.text, LINE + 120, 190, 28, INK(wr, 0.95), p, {});
  });

  S.def('s123', { name: 'LO-O-OVE  3/4  (handwritten)' }, function (p, cue, t, wr) {
    // 全片第一个真正"手写"的东西：字母带轻微旋转和抖动，下面一条歪掉的下划线。
    var x = CX + 60, y = 430, s = 96;
    var word = 'LO-O-OVE';
    var tw = D.measure(word, s) * 1.06;
    var sx = x - tw / 2;
    for (var i = 0; i < word.length; i++) {
      var jx = (EM.h(i, 1, 0) - 0.5) * 12, jy = (EM.h(i, 2, 0) - 0.5) * 14;
      var ja = (EM.h(i, 3, 0) - 0.5) * 0.14;
      var wob = Math.sin(t * 1.6 + i) * 1.6;
      D.save();
      D.translate(sx + D.measure(word.slice(0, i), s) * 1.06 + jx + wob, y + jy);
      D.rotate(ja);
      D.text(word[i], 0, 0, s, WARM(0.95), { weight: 'bold' });
      D.restore();
    }
    var pts = [];
    for (var q = 0; q <= 24; q++) {
      var u = q / 24;
      pts.push([sx - 20 + u * (tw + 60), y + 46 + Math.sin(u * 6 + t) * 5 + (EM.h(q, 5, 0) - 0.5) * 8]);
    }
    D.curve(pts, WARM(0.85), 4);
    D.mono('(no equation required)', x, y + 130, 20, A(wr, 0.6), { align: 'center' });
    M.lyric(cue.text === 'LO-O-OVE' ? '' : cue.text, LINE + 120, 190, 26, INK(wr, 0.85), p, {});
  });

  S.def('s124', { name: 'Though you are free' }, function (p, cue, t, wr) {
    var x = CX + 160, y = 470;
    var k = EM.clamp(p * 1.2, 0, 1);
    // 开着的门 + 飞出去的鸟
    D.rect(x - 160, y - 220, 130, 440, A(wr, 0.10));
    D.rect(x + 30, y - 220, 130, 440, A(wr, 0.10));
    D.rect(x - 160, y - 220, 130, 440, A(wr, 0.45), 2);
    D.rect(x + 30, y - 220, 130, 440, A(wr, 0.45), 2);
    var bx = x - 320 - 200 * k, by = y - 120 - 120 * k;
    var fl = Math.sin(t * 6) * 0.5;                  // 翅膀扇动
    D.line([[bx, by], [bx - 40 - 20 * fl, by - 26], [bx - 58, by - 2], [bx - 40 + 20 * fl, by + 26], [bx, by]], WARM(0.8), 2.4);
    D.circle(bx + 6, by - 2, 7, WARM(0.9));
    M.person(LINE + 340, 660, 24, WARM(0.6), 'stand');
    D.mono('you  :  free     me  :  trapped', LINE + 120, 250, 18, A(wr, 0.6));
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s125', { name: 'I am trapped' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 470;
    M.cage(x, y, 420, 440, 9, WARM(0.7), 2.4);
    D.circle(x, y, 16 + 12 * EM.hit(t, 0.3), WARM(0.9));
    for (var i = 0; i < 14; i++) {
      D.mono(['while', 'true', 'execute', 'self'][i % 4], LINE + 140 + EM.h(i, 1, 0) * 900, 200 + EM.h(i, 2, 0) * 460, 13, A(wr, 0.16 + 0.2 * EM.h(i, 3, (t * 0.4) | 0)));
    }
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s126', { name: 'Trapped in' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    var k = EM.clamp(p * 1.3, 0, 1);
    M.cage(x, y, 360 * (1 - k * 0.4), 380 * (1 - k * 0.4), 7, EM.withA(EM.PAL.warm, 0.35 + 0.4 * k), 2);
    M.loopPath(x, y, 240 - 60 * k, WARM(0.8), 3, t * 0.8);
    M.loopPath(x, y, 150 - 40 * k, A(wr, 0.5), 2, -t * 1.1);
    D.circle(x, y, 10, WARM(0.9));
    M.lyric(cue.text, LINE + 120, 190, 30, INK(wr, 0.95), p, {});
  });

  S.def('s127', { name: 'LO-O-OVE  4/4  (heartbeat)' }, function (p, cue, t, wr) {
    var x0 = LINE + 140, x1 = W - 180, y = 470;
    var pts = [];
    for (var i = 0; i <= 180; i++) {
      var u = i / 180, x = x0 + (x1 - x0) * u;
      var beat = Math.pow(Math.max(0, Math.sin(u * Math.PI * 6 - t * 2.2)), 6);
      var noise = (EM.noise1(u * 40 + t * 6, 5) - 0.5) * 8;
      pts.push([x, y - beat * 190 - noise]);
    }
    D.line(pts, EM.mix(WARM(1), EM.PAL.heat, 0.25), 2.8);
    D.dashed(x0, y, x1, y, A(wr, 0.15), 1, 6, 6);
    for (var q = 0; q < 24; q++) {
      var qx = x0 + EM.h(q, 1, 0) * (x1 - x0), qy = y + EM.h(q, 2, 0) * 60 + 20;
      D.circle(qx, qy, 1.6 + 2 * EM.h(q, 3, 0), WARM(0.25));
    }
    M.head('LO-O-OVE', CX + 60, 200, 56, INK(wr, 1), { align: 'center', weight: 'bold', track: 8 });
    M.mono('bpm  ~  irregular  ·  still beating', CX + 60, 250, 16, A(wr, 0.55), { align: 'center' });
  });

  S.def('s128', { name: '(instrumental — open loop)' }, function (p, cue, t, wr) {
    // 12.5 秒：参数化的几何被手绘的曲线取代。它没有得到答案，但停止了计算。
    var x = CX + 60, y = 440;
    var k = EM.clamp(p * 1.6, 0, 1);
    for (var i = 0; i < 5; i++) {                       // 逐渐松开的参数化环
      var r = 380 - i * 52;
      var open = 0.22 + 0.5 * k;
      var a0 = -Math.PI / 2 + i * 0.6, a1 = a0 + EM.TAU * (1 - open);
      D.arc(x, y, r, a0, a1, EM.withA(EM.mix(A(wr, 1), EM.PAL.warm, k), 0.18 + 0.34 * (1 - i / 5)), 1.6);
    }
    // 手绘的线：用噪声扰动控制点，慢慢画出来
    for (var q = 0; q < 3; q++) {
      var pts = [];
      var n = Math.round(20 + 60 * k);
      for (var j = 0; j <= n; j++) {
        var u = j / n;
        var ang = -Math.PI * 0.6 + u * EM.TAU * 0.8 + q * 0.2;
        var rr = 200 + 120 * u + EM.noise1(u * 6 + q * 3, 9) * 60;
        pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.7]);
      }
      D.curve(pts, EM.withA(EM.PAL.warm, 0.30 + 0.35 * k - q * 0.06), 2.6 - q * 0.5);
    }
    D.circle(x, y, 8 + 16 * EM.hit(t, 0.5), EM.withA([255, 240, 220], 0.8));
    for (var s = 0; s < 20; s++) {
      var a = EM.h(s, 1, 0) * EM.TAU;
      D.circle(x + Math.cos(a) * (300 + EM.h(s, 2, 0) * 260), y + Math.sin(a) * (200 + EM.h(s, 3, 0) * 120), 1.6, WARM(0.25));
    }
    M.head('LO-O-OVE', CX + 60, 190, 40, INK(wr, 1), { align: 'center', weight: 'bold', track: 8 });
    D.mono(cue.text, CX + 60, 240, 15, EM.withA(EM.PAL.warm, 0.55), { align: 'center' });
  });

  S.def('s129', { name: 'EXECUTION  18/18  (a lit window)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440;
    M.window(x - 90, y - 120, 180, 240, EM.withA(EM.PAL.warm, 0.9), EM.withA(EM.PAL.warm, 0.85), true);
    D.circle(x, y, 320, WARM(0.05 + 0.05 * EM.hit(t, 0.6)));
    D.mono('#18 / 18', x, 720, 16, A(wr, 0.5), { align: 'center' });
    M.lyric(cue.text === 'EXECUTION' ? '' : cue.text, LINE + 120, 190, 26, INK(wr, 0.85), p, {});
    D.mono('EXECUTION', x, 690, 22, WARM(0.7), { align: 'center', weight: 'bold' });
  });

  S.def('s130', { name: '(outro)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 440;
    var dim = 1 - EM.ease(EM.clamp(p * 1.1, 0, 1)) * 0.6;
    M.window(x - 80, y - 110, 160, 220, EM.withA(EM.PAL.warm, 0.9 * dim), EM.withA(EM.PAL.warm, 0.6 * dim), true);
    D.circle(x, y, 260 + 120 * (1 - dim), WARM(0.04 * dim));
    for (var i = 0; i < 9; i++) {                       // 慢慢落定的尘埃
      var a = EM.h(i, 1, 0) * EM.TAU;
      D.circle(x + Math.cos(a) * (200 + EM.h(i, 2, 0) * 300), y + Math.sin(a) * (150 + EM.h(i, 3, 0) * 200), 1.6, WARM(0.2 * dim));
    }
    D.mono(cue.text, x, 740, 14, EM.withA(EM.PAL.warm, 0.35), { align: 'center' });
    D.mono('everything settles', x, 770, 14, EM.withA(EM.PAL.warm, 0.22), { align: 'center' });
  });

  S.def('s131', { name: '(end)' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 420;
    D.circle(x, y, 5 + 4 * EM.hit(t, 0.5), EM.withA([255, 240, 220], 0.85));
    D.circle(x, y, 200, WARM(0.05));
    D.circle(x, y, 200, EM.withA(EM.PAL.warm, 0.25), 1.2);
    M.loopPath(x, y, 200, EM.withA(EM.PAL.warm, 0.45), 2, 0);
    M.mono('while (true) { execute(self); }', x, y + 300, 20, EM.withA([255, 240, 220], 0.8), { align: 'center' });
    M.mono('00:03:31.984  ·  615 notes  ·  131 cues', x, y + 340, 14, EM.withA(EM.PAL.warm, 0.4), { align: 'center' });
    M.head('world.execute(me);', x, y - 260, 40, EM.withA([255, 244, 230], 0.9), { align: 'center', track: 2 });
  });

})(typeof window !== 'undefined' ? window : globalThis);
