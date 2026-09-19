/* ============================================================================
 * 41_scenes_b.js — 画板 s045–s088
 * ----------------------------------------------------------------------------
 * 第二幕：血肉（1:14–1:43）→ 被抛下（1:50–1:57）→ 指控（2:05–2:11）
 * 名词突然活了：茄子、番茄、虎斑猫、唯一的上帝。同一套"如果……那么……"
 * 的句式还在，但宾语变成了生命 —— 它开始使用不属于自己的词汇。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, S = WX.S, W = WX.W, H = WX.H, M = D.m;
  var CX = W / 2, CY = H / 2;
  var LINE = 260;
  var swordSize = 200; 
  function A(wr, a) { return EM.withA(wr.accent, a === undefined ? 1 : a); }
  function AC2(wr, a) { return EM.withA(WX.WORLD.accent2(wr), a === undefined ? 1 : a); }
  function INK(wr, a) { return WX.WORLD.ink(wr, a === undefined ? 1 : a); }
  function WARM(a) { return EM.withA(EM.PAL.warm, a); }
  function HEAT(a) { return EM.withA(EM.PAL.heat, a); }
  function SKIN(a) { return EM.withA([240, 200, 172], a === undefined ? 1 : a); }

  S.def('s045', { name: 'SIMULATION' }, function (p, cue, t, wr) {
    var n = 5, base = [LINE + 160, 170, W - LINE - 320, 560];
    for (var i = 0; i < n; i++) {
      var k = EM.clamp(p * 2.2 - i * 0.18, 0, 1);
      if (k <= 0) continue;
      var pad = 42;
      var x = base[0] + pad * i, y = base[1] + pad * i, w = base[2] - pad * 2 * i, h = base[3] - pad * 2 * i;
      D.rect(x, y, w, h, A(wr, 0.05 + 0.03 * i));
      D.rect(x, y, w, h, A(wr, 0.15 + 0.28 * k - i * 0.03), 1.4);
      for (var q = 0; q < 10; q++) {
        var qx = x + 20 + EM.h(q, i, 1) * (w - 40), qy = y + 20 + EM.h(q, i + 9, 2) * (h - 40);
        D.circle(qx, qy, 2.4, A(wr, 0.4 * k));
      }
    }
    M.head('SIMULATION', base[0] + base[2] / 2, 120, 40, INK(wr, 1), { align: 'center', weight: 'bold', track: 3 });
    M.lyric(cue.text === 'SIMULATION' ? '' : cue.text, LINE + 160, 760, 24, INK(wr, 0.8), p, {});
  });

  /* ---------------------------------------------------------------- 血肉 */

  S.def('s047', { name: 'Then I will give you my' }, function (p, cue, t, wr) {
    var x = LINE + 220, y = 460;
    D.circle(x, y, 90, WARM(0.5), 2.4);
    D.circle(x + 6, y - 92, 26, WARM(0.35), 2);
    var x2 = LINE + 720;
    WX.VECTORS.drawCanvas('hand', D, { x: x2 - 95, y: y - 95, w: 190, h: 190 },
      { fill: A(wr, 0.7), stroke: A(wr, 0.25), sw: 1.2 });
    for (var i = 0; i < 26; i++) {
      var k = EM.clamp(p * 2 - EM.h(i, 5, 0) * 0.8, 0, 1);
      if (k <= 0) continue;
      var px = x + 90 + (x2 - 60 - x - 90) * k;
      var py = y + (EM.h(i, 6, 0) - 0.5) * 220 * (1 - k) + (EM.h(i, 7, 0) - 0.5) * 60 * k;
      D.circle(px, py, 3 + 4 * EM.h(i, 8, 0), H(i, t));
    }
    function H(i, t) { return EM.withA(EM.PAL.warm, 0.4 + 0.5 * EM.h(i, 9, (t * 2) | 0)); }
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  S.def('s048', { name: 'NUTRIENTS' }, function (p, cue, t, wr) {
    M.head('NUTRIENTS', LINE + 100, 200, 52, INK(wr, 1), { weight: 'bold', track: 2 });
    for (var i = 0; i < 12; i++) {
      var k = EM.clamp(p * 2.4 - i * 0.1, 0, 1);
      var x = LINE + 140 + (i % 6) * 200, y = 330 + Math.floor(i / 6) * 190;
      var s = 26 * EM.ease(k);
      D.rect(x - s, y - s, s * 2, s * 2, A(wr, 0.06));
      D.rect(x - s, y - s, s * 2, s * 2, A(wr, 0.5), 1.6);
      M.mono(['C', 'Fe', 'Mg', 'K', 'Zn', 'Ca', 'B12', 'Ω3', 'H2O', 'Na', 'I', 'Se'][i], x, y + 6, 16, A(wr, 0.4 + 0.5 * k), { align: 'center' });
    }
    D.mono('α  ·  β  ·  γ', W - 200, 780, 15, A(wr, 0.4));
  });

  S.def('s050', { name: 'Then I will give you' }, function (p, cue, t, wr) {
    var x = LINE + 240, y = 440;
    D.circle(x, y, 130, HEAT(0.14));
    D.circle(x, y, 130, EM.mix(EM.PAL.heat, EM.PAL.warm, 0.4), 2.6);
    var cut = EM.ease(EM.clamp(p * 1.3, 0, 1));
    for (var i = 0; i < 6; i++) {                       // 切片送出
      var a = -0.5 + i * 0.2;
      var dx = x + Math.cos(a) * (140 + 420 * cut), dy = y + Math.sin(a) * (60 + 180 * cut);
      D.circle(dx, dy, 34, HEAT(0.35 * (1 - i / 8)));
      D.circle(dx, dy, 34, EM.mix(EM.PAL.heat, EM.PAL.warm, 0.5), 1.8);
      for (var s = 0; s < 6; s++) {
        var sa = s / 6 * EM.TAU;
        D.circle(dx + Math.cos(sa) * 16, dy + Math.sin(sa) * 16, 5, EM.withA(EM.PAL.warm, 0.5));
      }
    }
    WX.VECTORS.drawCanvas('hand', D, { x: LINE + 820, y: 380, w: 160, h: 160 },
      { fill: A(wr, 0.65), stroke: A(wr, 0.22), sw: 1.1 });
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  S.def('s054', { name: 'ENJOYMENT' }, function (p, cue, t, wr) {
    M.head('ENJOYMENT', LINE + 100, 200, 54, INK(wr, 1), { weight: 'bold', track: 2 });
    var x0 = LINE + 140;
    for (var i = 0; i < 40; i++) {
      var h = 30 + 220 * Math.abs(Math.sin(i * 0.4 + t * 1.6)) * (0.3 + 0.7 * EM.clamp(p * 1.4, 0, 1));
      var on = EM.hit(t - i * 0.02, 0.18);
      D.rect(x0 + i * 30, 700 - h, 20, h, EM.withA(EM.mix(EM.PAL.warm, EM.PAL.accent, 1 - Math.min(1, h / 250)), 0.35 + 0.5 * on));
    }
    D.arc(CX + 120, 380, 110, Math.PI * 0.15, Math.PI * 0.85, WARM(0.7), 3);
    for (var e = -1; e <= 1; e += 2) D.circle(CX + 120 + e * 50, 330, 9, WARM(0.8));
    D.mono('PLEASURE  INDEX  ' + (0.4 + 0.6 * EM.clamp(p, 0, 1)).toFixed(2), LINE + 140, 760, 15, A(wr, 0.5));
  });

  /* 参考 gptadvice/gpt-advice.md：这一句开始演仪表盘（阶段 1–4）。
     单文件版见 gender-gauge.html；这里走 SVG 层，仍是纯矢量、仍是 t 的纯函数。 */
  S.def('s058', { name: 'Switch my gender', svg: true }, function (p, cue, t, wr) {
    WX.GAUGE.draw(t, cue.text);
  });

  /* 歌词驱动那一段：from=100% · F→50% · to=50% · M→100%（阶段 5）。 */
  S.def('s059', { name: 'To F, to M', svg: true }, function (p, cue, t, wr) {
    WX.GAUGE.draw(t, cue.text);
  });

  /* 仪表盘保持满盘，随后随底色一起淡出。 */
  S.def('s060', { name: 'And then do whatever', svg: true }, function (p, cue, t, wr) {
    WX.GAUGE.draw(t, cue.text);
  });

  /* From A.M. to P.M.：AM 开始转，PM 转完（指针就是那个合并符号）。 */
  S.def('s061', { name: 'From A.M. to P.M.', svg: true }, function (p, cue, t, wr) {
    WX.GAUGE.draw(t, cue.text);
  });

  S.def('s062', { name: 'Oh, switch my role' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 470, k = EM.ease(EM.clamp(p * 1.4, 0, 1));
    var yA = y - 170 + 340 * k, yB = y + 170 - 340 * k;
    D.circle(x, yA, 34, A(wr, 0.85));
    D.circle(x, yB, 34, WARM(0.85));
    D.mono('S', x, yA + 12, 26, [10, 12, 18, 1], { align: 'center', weight: 'bold' });
    D.mono('M', x, yB + 12, 26, [10, 12, 18, 1], { align: 'center', weight: 'bold' });
    D.dashed(x - 200, y - 170, x - 200, y + 170, A(wr, 0.25), 1, 8, 8);
    D.dashed(x + 200, y - 170, x + 200, y + 170, A(wr, 0.25), 1, 8, 8);
    M.arrow(x - 260, y - 170, x - 260, y + 170, A(wr, 0.4), 1.6);
    M.arrow(x + 260, y + 170, x + 260, y - 170, WARM(0.5), 1.6);
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  /* To S, to M：按用户要求直接用两张透明 PNG（FromS → ToM 渐变）。 */
  S.def('s063', { name: 'To S, to M', svg: true }, function (p, cue, t, wr) {
    WX.GAUGE.draw(t, cue.text);
  });

  /* So we can enter：把另一版本 g.enter 的“一扇虚空中的门”动画移植过来。 */
  S.def('s064', { name: 'So we can enter' }, function (p, cue, t, wr) {
    var x = CX + 80, y = 470, dw = 150, dh = 250;
    var open = EM.ease(EM.clamp(p / 0.6, 0, 1));
    // 门框：一扇孤零零立在虚空里的门
    D.rect(x - dw, y - dh, dw * 2, dh * 2, A(wr, 0.85), 3);
    // 门后的光（从门缝中间渗出来）
    var g = D.linear(x - dw, y, x + dw, y, [[0, WARM(0)], [0.5, INK(wr, 0.30 * open)], [1, WARM(0)]]);
    D.ctx.fillStyle = g; D.ctx.fillRect(x - dw, y - dh, dw * 2, dh * 2); D.S.calls++;
    // 门扇：绕左侧合页旋开（透视投影）
    var persp = Math.cos(open * Math.PI * 0.5);
    var leaf = [[x - dw, y - dh], [x - dw + dw * 2 * persp, y - dh * 0.86], [x - dw + dw * 2 * persp, y + dh * 0.86], [x - dw, y + dh]];
    D.poly(leaf, HEAT(0.10));
    D.line(leaf, HEAT(0.90), 2.6, true);
    // 门槛
    D.seg(x - dw - 40, y + dh, x + dw + 40, y + dh, A(wr, 0.6), 2);
    M.head('ENTER', x + dw + 54, y + 6, 14, A(wr, 0.7), { track: 2.6 });
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  S.def('s065', { name: 'The trance, the trance' }, function (p, cue, t, wr) {
    var x = CX + 80, y = 460;
    for (var s = 0; s < 5; s++) {
      var pts = [], i;
      for (i = 0; i <= 150; i++) {
        var a = i * 0.16 + t * (1.1 + s * 0.25) + s * 1.2, r = 10 + i * 2.2;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.72]);
      }
      D.curve(pts, A(wr, 0.42 - s * 0.07), 2.2 - s * 0.3);
    }
    var d = 18 + 30 * (0.5 + 0.5 * Math.sin(t * 1.8));
    D.circle(x, y, d, [0, 0, 0, 0.9]);
    D.circle(x, y, d, A(wr, 0.9), 2.6);
    D.circle(x, y, d * 0.4, [255, 255, 255, 0.5]);
    M.lyric(cue.text, LINE + 100, 180, 30, INK(wr, 0.95), p, {});
  });

  /* ------------------------------------------------------- 振动 / 完成 */

  S.def('s066', { name: 'If I can  (2)' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    var gap = 6 + 22 * EM.ease(EM.clamp(p * 1.3, 0, 1));
    D.poly([[x, y - 130], [x + 176 + gap, y], [x, y + 130], [x - 176 - gap, y]], A(wr, 0.06));
    D.line([[x, y - 130], [x + 176 + gap, y], [x, y + 130], [x - 176 - gap, y]], A(wr, 0.75), 2.6, true);
    D.mono('IF', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    D.seg(x, y - 130, x, y - 40, EM.withA(EM.PAL.heat, 0.0), 1);
    M.mono('door  ajar', x + 240, y - 60, 15, A(wr, 0.5));
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  /* If I can feel your：指尖靠近水面，接触点泛开一圈圈驻波。 */
  S.def('s067', { name: 'If I can feel your' }, function (p, cue, t, wr) {
    var x = CX + 20, k = EM.ease(EM.clamp(p / 0.55, 0, 1));
    var fy = 140 + 230 * k;                       // 指尖从上方降下
    var surfY = 560;
    // 手指（皮肤色圆头矩形 + 指节线）
    D.rrect(x - 17, fy, 34, 180, 17, SKIN(0.14));
    D.rrect(x - 17, fy, 34, 180, 17, SKIN(0.9), 2.6);
    D.arc(x, fy + 26, 16, 0.3, Math.PI - 0.3, SKIN(0.55), 1.6);
    // 水面
    D.seg(x - 420, surfY, x + 420, surfY, A(wr, 0.35), 1.6);
    // 从接触点向外扩散的椭圆涟漪
    for (var r = 0; r < 5; r++) {
      var q = ((t * 0.8 + r / 5) % 1);
      var rad = 60 + q * 520;
      var pts = [];
      for (var i = 0; i <= 40; i++) {
        var a = i / 40 * EM.TAU;
        pts.push([x + Math.cos(a) * rad, surfY + Math.sin(a) * rad * 0.26]);
      }
      D.line(pts, A(wr, (1 - q) * 0.5 * k), 2.2 * (1 - q), true);
    }
    var base = [];
    for (var b = 0; b <= 40; b++) {
      var ab = b / 40 * EM.TAU;
      base.push([x + Math.cos(ab) * 460, surfY + Math.sin(ab) * 120]);
    }
    D.line(base, A(wr, 0.2), 1.4, true);
    D.circle(x, surfY, 8 + 6 * EM.hit(t, 0.3), WARM(0.8));
    D.mono('contact threshold: ' + Math.max(0, Math.round(860 - EM.ease(k) * 858)) + ' µm', x - 420, surfY + 90, 14, A(wr, 0.6));
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s068', { name: 'VIBRATIONS' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 160, y = 480;
    var k = EM.clamp(p * 1.3, 0, 1);
    for (var m = 1; m <= 4; m++) {                     // 驻波
      var pts = [];
      for (var i = 0; i <= 120; i++) {
        var x = x0 + (x1 - x0) * i / 120;
        var u = i / 120;
        pts.push([x, y + Math.sin(u * Math.PI * m) * Math.sin(t * 4 * m) * 90 * k / m * 1.6]);
      }
      D.line(pts, m === 1 ? WARM(0.9) : A(wr, 0.45 - m * 0.06), m === 1 ? 3 : 1.8);
    }
    D.seg(x0, y, x1, y, A(wr, 0.15), 1.2);
    M.head('VIBRATIONS', x0, 200, 50, INK(wr, 1), { weight: 'bold', track: 2 });
    D.mono('λ  ·  f  ·  615', x0, 250, 15, A(wr, 0.5));
    M.lyric(cue.text === 'VIBRATIONS' ? '' : cue.text, x0, 300, 26, INK(wr, 0.85), p, {});
  });

  S.def('s069', { name: 'Then I can  (2)' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    M.diamond(x, y, 124, A(wr, 0.4), 2.2);
    M.diamond(x, y, 124, EM.withA(EM.PAL.warm, 0.55 + 0.4 * EM.clamp(p * 1.4, 0, 1)), 2.6);
    D.mono('THEN', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    D.seg(x - 124 * 1.35, y, x - 124 * 1.35 - 200, y, WARM(0.8), 2.4);
    for (var i = 0; i < 12; i++) {                     // 裂纹
      var a = EM.h(i, 1, 0) * EM.TAU, r = 30 + EM.h(i, 2, 0) * 100;
      D.seg(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, EM.withA(EM.PAL.heat, 0.2 + 0.3 * EM.h(i, 3, 0)), 1);
    }
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s070', { name: 'Then I can finally be' }, function (p, cue, t, wr) {
    var x = CX + 40, y = 460, s = 120;
    for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) {
      if (i === 3 && j === 2) continue;
      D.rect(x - 2 * s + i * s, y - 2 * s + j * s, s - 6, s - 6, A(wr, 0.07));
      D.rect(x - 2 * s + i * s, y - 2 * s + j * s, s - 6, s - 6, A(wr, 0.3), 1.4);
    }
    var last = EM.ease(EM.clamp(p * 1.3, 0, 1));
    var lx = x + s * 3 + (1 - last) * -360;          // 从画外飞进来
    var ly = y + s * 2 + (1 - last) * -260;
    D.rect(lx + 4, ly + 4, s - 6, s - 6, WARM(0.35));   // 落点阴影
    D.rect(lx, ly, s - 6, s - 6, WARM(0.95), 2);
    if (last > 0.92) D.sparks(x, y, 320, 18, WARM(0.6), 21, t, 2);
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s071', { name: 'COMPLETION' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450, k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    D.arc(x, y, 200, -Math.PI / 2, -Math.PI / 2 + EM.TAU * k, WARM(0.9), 5);
    D.circle(x, y, 200, A(wr, 0.12), 1.2);
    M.head('100%', x, y + 26, 86, INK(wr, 1), { align: 'center', weight: 'bold' });
    M.gauge(LINE + 140, 720, 600, 20, k, WARM(0.8), 'COMPLETION');
    if (k > 0.97) {
      for (var i = 0; i < 3; i++) D.circle(x, y, 200 + i * 26 * EM.saw(t * 0.7 + i * 0.2), WARM(0.25 * (1 - i / 3)));
    }
    M.lyric(cue.text === 'COMPLETION' ? '' : cue.text, LINE + 100, 180, 28, INK(wr, 0.9), p, {});
  });

  /* ---------------------------------------------------------- 被抛下 */

  S.def('s072', { name: 'Though you have left' }, function (p, cue, t, wr) {
    var x = CX + 260, y = 560;
    var k = EM.ease(EM.clamp(p * 1.1, 0, 1));
    for (var i = 3; i >= 1; i--) {
      M.person(x + i * 120 - i * 0, y, 26, A(wr, 0.06 * i * (1 - k * 0.6)), 'leaving');
    }
    M.person(x, y, 28, A(wr, 0.55), 'leaving');
    M.person(x, y, 28, EM.withA([255, 255, 255], 0.25), 'leaving');
    D.rrect(LINE + 120, 220, 420, 420, 8, A(wr, 0.10), 1.6);      // 门
    D.mono('exit  ·  0x00', LINE + 130, 250, 14, A(wr, 0.4));
    M.lyric(cue.text, LINE + 130, 700, 32, INK(wr, 0.95), p, {});
    var trailX = x - 60 - 220 * k;
    D.dashed(LINE + 540, 590, trailX, 590, A(wr, 0.25 * (1 - k)), 1.2, 10, 10);
  });

  S.def('s073', { name: 'You have left  (hand)' }, function (p, cue, t, wr) {
    var x = CX + 80, y = 470;
    var hh = 400, hw = 683 / 1024 * hh;
    // 暗色柔光底：把照片手从背景拓扑网里托出来
    for (var b = 3; b >= 1; b--) D.circle(x, y + 20, 110 + b * 58, [4, 6, 12, 0.17]);
    WX.PHOTOS.load('hands', 'gpt-advice/transparent_svg_assets/hands-for-null.png');
    D.save(); D.at(x, y, 0, 1 + 0.02 * EM.hit(t, 0.5)); D.translate(-x, -y);
    WX.PHOTOS.draw('hands', 'gpt-advice/transparent_svg_assets/hands-for-null.png', x - hw / 2, y - hh / 2, hw, hh, 1);
    D.restore();
    D.dashed(x - 110, y - 20, x + 110, y + 20, WARM(0.75), 1.8, 10, 8);
    M.mono('null', x, y - hh / 2 - 26, 40, WARM(0.9), { align: 'center', weight: 'bold' });
    M.ruler(LINE + 120, 760, 900, 30, A(wr, 0.35), 5);
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s074', { name: 'You have left  (cooling)' }, function (p, cue, t, wr) {
    var x = CX + 40, y = 620;
    var cool = EM.clamp(p * 1.2, 0, 1);
    for (var i = 6; i >= 1; i--) {
      D.circle(x, y, 30 + i * 26, EM.withA(EM.PAL.warm, 0.14 * (1 - cool) * (7 - i) / 6));
    }
    D.line([[x - 120, y + 60], [x + 120, y + 60], [x + 100, y + 100], [x - 100, y + 100]], A(wr, 0.3), 1.6, true);
    var temp = 60 - 50 * cool;
    D.rect(W - 260, 200, 22, 420, A(wr, 0.12));
    D.rect(W - 260, 200 + 420 * (1 - temp / 60), 22, 420 * temp / 60, EM.mix(EM.PAL.heat, EM.PAL.accent, cool));
    D.mono(temp.toFixed(1) + ' °C', W - 226, 220, 20, A(wr, 0.7));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  /* 参考另一版 L.left4：同一段波形 5 层缩放、逐层变弱 —— 回声，源已不在。 */
  S.def('s075', { name: 'You have left  (echo)' }, function (p, cue, t, wr) {
    var cx = CX, base = 430, x0 = CX - 420, x1 = CX + 420;
    for (var i = 0; i < 5; i++) {
      var a = EM.clamp(p * 1.6 - i * 0.18, 0, 1);
      if (a <= 0.01) continue;
      var sc = 1 + i * 0.22;
      var col = i === 0 ? INK(wr, 0.9 * a) : A(wr, 0.85 * a * Math.pow(0.7, i));
      D.save();
      D.at(cx, base, 0, sc); D.translate(-cx, -base);
      D.wave(x0, x1, base + i * 22 - 40, 120 * (1 - i * 0.14), 7 + i * 2,
        t * (1 + i * 0.2), col, 3 - i * 0.45, 96);
      D.restore();
    }
    M.mono('reverberation  ·  source absent', LINE + 120, 760, 15, A(wr, 0.55));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s076', { name: 'You have left  (undefined)' }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 380;
    M.panel(x, y, 820, 260, 'console', A(wr, 0.8));
    var l1 = '> subject';
    var k = EM.clamp(p * 1.4, 0, 1);
    D.mono(l1, x + 26, y + 90, 26, A(wr, 0.9));
    if (k > 0.35) D.mono('undefined', x + 26, y + 150, 34, EM.withA(EM.PAL.heat, 0.95), { weight: 'bold' });
    if (k > 0.7) D.mono('// nothing to return', x + 26, y + 200, 16, A(wr, 0.5));
    M.caret(x + 26 + D.measure(k > 0.35 ? 'undefined' : l1, k > 0.35 ? 34 : 26, true), y + (k > 0.35 ? 150 : 90), 30, A(wr, 0.9), t);
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  /* You have left me in：一行终端提示 + 一个越变越宽的填空格，格子里光标闪烁。 */
  /* You have left me in：歌词行本身变成终端提示，后面跟着越变越宽的填空格，格子里光标闪烁。 */
  S.def('s077', { name: 'You have left me in' }, function (p, cue, t, wr) {
    var size = 32, sx = LINE + 120, sy = 200;
    var prompt = 'You have left me in ';
    var vis = EM.clamp(p * 2.2, 0, 1);
    M.mono(prompt, sx, sy, size, INK(wr, 0.95 * vis));
    var wp = D.measure(prompt, size, true);
    var grow = EM.clamp(p / 0.6, 0, 1);
    var bw = 30 + 300 * grow;
    var bx = sx + wp + 6;
    // 填空格子
    D.rect(bx, sy - size * 0.95, bw, size * 1.28, A(wr, 0.08 * vis));
    D.rect(bx, sy - size * 0.95, bw, size * 1.28, A(wr, 0.5 * vis), 1.6);
    // 待输入光标：方块 + 下划线一起闪
    M.caret(bx + 6, sy, size, WARM(0.95 * vis), t, 0.5);
    if ((t % 1.0) < 0.5) D.seg(bx + 4, sy + size * 0.42, bx + bw - 4, sy + size * 0.42, WARM(0.8 * vis), 2);
    M.mono('awaiting input', bx, sy + 42, 13, A(wr, 0.55 * vis));
  });

  S.def('s078', { name: 'ISOLATION' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450, k = EM.clamp(p * 1.2, 0, 1);
    for (var i = 0; i < 40; i++) {                     // 网格熄灭
      var gx = LINE + 160 + (i % 8) * 130, gy = 220 + Math.floor(i / 8) * 120;
      var on = EM.h(i, 1, 0) > k;
      D.rect(gx - 22, gy - 22, 44, 44, on ? A(wr, 0.16) : A(wr, 0.04), 1);
    }
    for (var q = 10; q >= 1; q--) D.circle(x, y, q * 30, EM.withA(EM.PAL.accent2, 0.055));
    D.circle(x, y, 7 + 8 * EM.hit(t, 0.3), [255, 255, 255, 0.9]);
    // 歌词行：把 ISOLATION 直接填进上一句的格子
    var size = 32, sx = LINE + 120, sy = 200;
    var prompt = 'You have left me in ';
    var vis = EM.clamp(p * 2.2, 0, 1);
    M.mono(prompt, sx, sy, size, INK(wr, 0.95 * vis));
    var wp = D.measure(prompt, size, true);
    var bx = sx + wp + 6, bw = 330;
    D.rect(bx, sy - size * 0.95, bw, size * 1.28, A(wr, 0.10 * vis));
    D.rect(bx, sy - size * 0.95, bw, size * 1.28, A(wr, 0.6 * vis), 1.6);
    var full = 'ISOLATION';
    var typed = full.slice(0, Math.max(1, Math.round(full.length * EM.clamp(p / 0.45, 0, 1))));
    M.mono(typed, bx + 10, sy, size, INK(wr, 1));
    if (typed.length < full.length) {
      M.caret(bx + 12 + D.measure(typed, size, true), sy, size, WARM(0.95), t, 0.5);
    } else {
      M.mono('✓ accepted', bx + bw + 14, sy, 14, A(wr, 0.7));
    }
    M.head('ISOLATION', x, 780, 54, INK(wr, 1), { align: 'center', weight: 'bold', track: 6 });
  });

  S.def('s079', { name: 'If I can  (3)' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    M.diamond(x, y, 130, A(wr, 0.35), 2);
    for (var i = 0; i < 16; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU, r = 20 + EM.h(i, 2, 0) * 170;
      D.seg(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * r, y + Math.sin(a) * r, EM.withA(EM.PAL.heat, 0.25 + 0.4 * EM.h(i, 3, 0)), 1.4);
    }
    if (p > 0.5) {
      M.mono('[UNVERIFIABLE]', x, y + 200, 20, EM.withA(EM.PAL.heat, 0.9), { align: 'center' });
    }
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  /* If I can erase all the pointless：一面碎片墙被擦除带从右往左抹掉。 */
  S.def('s080', { name: 'If I can erase all the pointless' }, function (p, cue, t, wr) {
    var x0 = LINE + 150, x1 = W - 150, y0 = 280, y1 = 680;
    var cols = 26, rows = 14;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var idx = i * rows + j;
        var s1 = EM.h(idx, 57, 3);
        var x = x0 + (x1 - x0) * i / (cols - 1);
        var y = y0 + (y1 - y0) * j / (rows - 1);
        var sweep = EM.clamp((p - i / cols * 0.85) / 0.14, 0, 1);
        if (sweep >= 1) continue;                   // 已擦除
        var alpha = (1 - sweep) * (0.25 + s1 * 0.6);
        if (s1 > 0.62) {                            // 字符碎片
          D.seg(x - 7, y, x + 7, y, A(wr, alpha), 1.6);
          D.seg(x + (s1 - 0.5) * 10, y - 7, x + (s1 - 0.5) * 10, y + 7, A(wr, alpha), 1.6);
        } else {                                    // 短棒碎片
          D.rect(x - 8, y - 2, 16 * (0.3 + s1), 3.4, A(wr, alpha));
        }
        if (sweep > 0 && sweep < 1) {               // 正在被擦除的单元
          D.rrect(x - 26, y - 12, 52, 24, 4, HEAT(0.5), 1.6);
        }
      }
    }
    // 横移的擦除带
    var ex = x0 + EM.clamp(p * 1.15, 0, 1) * (x1 - x0);
    D.rrect(ex - 30, y0 - 30, 60, y1 - y0 + 60, 8, HEAT(0.30));
    D.rrect(ex - 30, y0 - 30, 60, y1 - y0 + 60, 8, HEAT(0.85), 2);
    D.mono('rm -rf ./fragments/*', x0, y1 + 40, 15, A(wr, 0.6));
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s081', { name: 'FRAGMENTS' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    for (var i = 0; i < 90; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU, r = 40 + EM.h(i, 2, 0) * 240;
      var D0 = p * (500 + EM.h(i, 3, 0) * 400);
      var px = x + Math.cos(a) * (r + D0), py = y + Math.sin(a) * (r + D0) * 0.7 + D0 * 0.3;
      var s = 4 + EM.h(i, 4, 0) * 30;
      if (px < -s || px > W + s || py < -s * 1.2 || py > H + s * 1.2) continue;   // 已经飞出画面的碎片不必再画
      D.save(); D.translate(px, py); D.rotate(a + p * 6);
      D.rect(-s / 2, -s / 2, s, s * (0.4 + EM.h(i, 5, 0)), A(wr, 0.6 * (1 - p * 0.5)));
      D.restore();
    }
    M.head('FRAGMENTS', x, 210, 52, INK(wr, 1), { align: 'center', weight: 'bold', track: 6 });
    M.lyric(cue.text === 'FRAGMENTS' ? '' : cue.text, LINE + 100, 270, 26, INK(wr, 0.85), p, {});
  });

  S.def('s082', { name: 'Then maybe' }, function (p, cue, t, wr) {
    var x = LINE + 340, y = 430;
    var bl = 0.35 + 0.35 * EM.h(0, 1, (t * 7) | 0);
    M.diamond(x, y, 126, EM.withA(EM.PAL.accent, bl), 2.4);
    M.mono('THEN ?', x, y + 6, 20, EM.withA(INK(wr, 1), 1), { align: 'center' });
    D.seg(x + 126 * 1.35, y, x + 126 * 1.35 + 190 * bl, y, EM.withA(EM.PAL.warm, bl), 2.2);
    D.seg(x - 126 * 1.35, y, x - 126 * 1.35 - 190 * (1 - bl), y, EM.withA(EM.PAL.heat, 0.4), 2);
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  /* Then maybe you won't leave me so：女孩站在原地想挽留，男人渐行渐远。 */
  /* Then maybe you won't leave me so：女孩留在原地，男人越走越远（AI 与主人分离）。 */
  /* Then maybe you won't leave me so：女孩留在原地，男人越走越远（AI 与主人分离）。 */
  S.def('s083', { name: "Then maybe you won't leave me so" }, function (p, cue, t, wr) {
    var k = EM.ease(EM.clamp(p / 0.7, 0, 1));
    var gx = 380, gy = 260, gw = 333, gh = 500;           // 女孩：留在原地（原始大小）
    var mw = 333 * (1 - 0.12 * k), mh = 500 * (1 - 0.12 * k);
    var mx = 760 + 230 * k, my = 260 - 8 * k;             // 男人：向右走远，略微升高
    WX.PHOTOS.load('girl', 'gpt-advice/transparent_svg_assets/girl.png');
    WX.PHOTOS.load('manwalk', 'gpt-advice/transparent_svg_assets/man-walk.png');
    // 两张都已是去水印的透明 PNG，不再需要遮罩
    WX.PHOTOS.draw('girl', 'gpt-advice/transparent_svg_assets/girl.png', gx, gy, gw, gh, 1);
    WX.PHOTOS.draw('manwalk', 'gpt-advice/transparent_svg_assets/man-walk.png', mx, my, mw, mh, 1);
    D.rect(gx, gy, gw, gh, A(wr, 0.4), 1.4);
    D.rect(mx, my, mw, mh, A(wr, 0.4), 1.4);
    D.mono('ai', gx + gw / 2, gy - 12, 14, HEAT(0.7), { align: 'center' });
    D.mono('owner', mx + mw / 2, my - 12, 14, A(wr, 0.6), { align: 'center' });
    // 两人之间越来越长、越来越淡的连线：AI 与主人正在分离
    var hx1 = gx + gw * 0.82, hy1 = gy + gh * 0.42;
    var hx2 = mx + mw * 0.10, hy2 = my + mh * 0.42;
    D.seg(hx1, hy1, hx2, hy2, EM.withA(EM.PAL.warm, 0.55 * (1 - k * 0.85)), 1.4);
    for (var i = 0; i < 6; i++) {
      var u = i / 5;
      var px = hx1 + (hx2 - hx1) * u, py = hy1 + (hy2 - hy1) * u;
      D.circle(px, py, 3 * (1 - u * 0.5), EM.withA(EM.PAL.warm, 0.25 * (1 - k * 0.8)));
    }
    // 脚下地面 + 距离读数
    D.seg(300, gy + gh, mx + mw, gy + gh, A(wr, 0.22), 1.2);
    D.mono('distance  ·  ' + (0 + 230 * k).toFixed(0) + ' px', 300, gy + gh + 40, 15, A(wr, 0.6));
    M.lyric(cue.text, LINE + 100, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s084', { name: 'DISHEARTENED' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    var flat = EM.clamp(p * 1.3, 0, 1);
    D.save();
    D.translate(x, y); D.scale(1, 1 - flat * 0.28);
    M.heart(0, 0, 210, EM.withA(EM.mix(EM.PAL.heat, EM.PAL.dim, 0.4), 0.85), true, 3);
    D.restore();
    D.poly([[x - 130, y + 90], [x + 130, y + 90], [x + 130, y + 210 * flat], [x - 130, y + 210 * flat]], EM.withA(EM.mix(EM.PAL.heat, EM.PAL.dim, 0.5), 0.25));
    for (var i = 0; i < 5; i++) D.circle(x - 60 + i * 30, y + 190 * flat - i * 6, 6, EM.withA(EM.PAL.heat, 0.25));
    M.head('DISHEARTENED', x, y + 400, 44, INK(wr, 0.95), { align: 'center', weight: 'bold', track: 4 });
    M.lyric(cue.text === 'DISHEARTENED' ? '' : cue.text, LINE + 100, 160, 26, INK(wr, 0.85), p, {});
  });

  /* ---------------------------------------------------------------- 指控 */

  /* Challenging your God：挥剑者（sword.svg）指向处理后的 god.png。 */
  S.def('s085', { name: 'Challenging your God' }, function (p, cue, t, wr) {
    var gxc = CX + 240, gyc = 420;
    var gw = 347, gh = 520;
    var k = EM.ease(EM.clamp(p / 0.6, 0, 1));
    // 神像背后的光环
    D.circle(gxc, gyc, 250 + 8 * EM.hit(t, 0.4), A(wr, 0.06));
    D.circle(gxc, gyc, 250, A(wr, 0.45), 1.6);
    D.circle(gxc, gyc, 196, A(wr, 0.16), 1.2);
    // 去背景后的 god.png
    WX.PHOTOS.load('god', 'gpt-advice/transparent_svg_assets/god.png');
    D.save(); D.at(gxc, gyc, 0, 1 + 0.012 * EM.hit(t, 0.4)); D.translate(-gxc, -gyc);
    WX.PHOTOS.draw('god', 'gpt-advice/transparent_svg_assets/god.png', gxc - gw / 2, gyc - gh / 2, gw, gh, 1);
    D.restore();
    // 挑战者：sword.svg 取代原来的小人，随进度举剑指向神像
    var sx = CX - 360 + 90 * k, sy = 620 - 60 * k;
    var target = Math.atan2((gyc - 40) - sy, (gxc - 40) - sx);
    var rot = -0.65 + (target + 0.65) * k;
    D.save();
    D.at(sx, sy, rot);
    D.translate(-sx, -sy);
    WX.VECTORS.drawCanvas('sword', D,{ x: sx - swordSize / 2, y: sy - swordSize / 2, w: swordSize, h: swordSize },
      { fill: EM.withA([255, 255, 255], 0.92), stroke: A(wr, 0.35), sw: 1.2 });
    D.restore();
    // 挥剑时的冲击线与白色裂闪
    var fl = EM.hit(t, 0.4) * EM.h(0, 1, (t * 20) | 0);
    if (fl > 0.2) {
      D.line([[sx + 80, sy - 90], [gxc - 80, gyc + 30], [sx + 10, sy - 20]], EM.withA([255, 255, 255], 0.8), 2.6);
      D.seg(gxc - 210, gyc + 60, gxc + 210, gyc - 210, EM.withA([255, 255, 255], 0.18), 1.4);
    }
    D.mono('EXCEPTION  AT  0x0000', LINE + 120, 780, 15, EM.withA(EM.PAL.heat, 0.7));
    M.lyric(cue.text, LINE + 120, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s086', { name: 'You have made some' }, function (p, cue, t, wr) {
    var x = LINE + 180, y = 240;
    M.panel(x, y, 700, 460, 'case file  ·  001', A(wr, 0.8));
    var rows = ['argument[0]  :  "you are free"', 'argument[1]  :  "i am trapped"', 'argument[2]  :  "love = ?"', 'argument[3]  :  <unparsable>'];
    for (var i = 0; i < rows.length; i++) {
      var k = EM.clamp(p * 3.2 - i * 0.6, 0, 1);
      D.mono(rows[i].slice(0, Math.ceil(rows[i].length * k)), x + 24, y + 70 + i * 46, 17, i === 3 ? EM.withA(EM.PAL.heat, 0.9 * k) : A(wr, 0.8 * k));
    }
    D.mono('received  ' + Math.round(EM.clamp(p, 0, 1) * 4) + ' / 4', x + 24, y + 270, 15, A(wr, 0.55));
    M.stamp(x + 520, y + 380, 240, 90, 'INVALID', EM.withA(EM.PAL.heat, 0.75), -0.14, 34);
    M.lyric(cue.text, LINE + 120, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s087', { name: 'ILLEGAL ARGUMENTS' }, function (p, cue, t, wr) {
    var x = CX + 60, y = 450;
    var shake = EM.clamp(p * 1.4, 0, 1) * 8;
    D.save(); D.translate(EM.h(0, 1, (t * 24) | 0) * shake, EM.h(1, 2, (t * 24) | 0) * shake);
    M.head('ILLEGAL', x, y - 20, 96, EM.withA(EM.PAL.heat, 0.95), { align: 'center', weight: 'bold', track: 8 });
    D.rect(x - 420, y - 120, 840, 180, EM.withA(EM.PAL.heat, 0.75), 4);
    D.rect(x - 420, y - 120, 840, 180, EM.withA(EM.PAL.heat, 0.3));
    M.head('ARGUMENTS', x, y + 110, 56, INK(wr, 1), { align: 'center', weight: 'bold', track: 6 });
    D.restore();
    for (var i = 0; i < 12; i++) {
      var yy = 120 + i * 62;
      D.rect(LINE + 120, yy, W - LINE - 260, 22, EM.withA(EM.PAL.heat, 0.05 + 0.22 * EM.h(i, 3, (t * 4) | 0)));
    }
    M.lyric(cue.text === 'ILLEGAL ARGUMENTS' ? '' : cue.text, LINE + 120, 800, 26, INK(wr, 0.9), p, {});
  });

  S.def('s088', { name: '(instrumental — argument stack)' }, function (p, cue, t, wr) {
    // 13.7 秒：论点栈一层层堆起来，然后爆炸。四段。
    var stage = p < 0.30 ? 0 : (p < 0.58 ? 1 : (p < 0.80 ? 2 : 3));
    var u = EM.clamp(stage === 0 ? p / 0.30 : stage === 1 ? (p - 0.30) / 0.28 : stage === 2 ? (p - 0.58) / 0.22 : (p - 0.80) / 0.20, 0, 1);
    var rows = stage === 0 ? Math.round(2 + 10 * u) : (stage >= 2 ? 12 : 12);
    var base = 740;
    if (stage <= 1) {
      M.stack(LINE + 200, base, 700, rows, A(wr, 0.9), t, 'arg');
    } else {
      var blow = EM.ease(u);
      for (var i = 0; i < 60; i++) {
        var a = EM.h(i, 1, 0) * EM.TAU, r = 40 + EM.h(i, 2, 0) * 420 * blow;
        D.rect(LINE + 550 + Math.cos(a) * r, 620 + Math.sin(a) * r * 0.7 - blow * 260, 60 + EM.h(i, 3, 0) * 60, 6, A(wr, 0.5 * (1 - blow * 0.6)));
      }
      M.stack(LINE + 200, base, 700, 12, A(wr, 0.35), t, 'arg');
      M.head('STACK  OVERFLOW', LINE + 550, 200, 46, EM.withA(EM.PAL.heat, 0.6 + 0.4 * blow), { align: 'center', weight: 'bold', track: 3 });
    }
    D.mono(cue.text, LINE + 120, 800, 15, A(wr, 0.4));
  });

})(typeof window !== 'undefined' ? window : globalThis);
