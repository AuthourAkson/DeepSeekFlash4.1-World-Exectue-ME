/* ============================================================================
 * 40_scenes_a.js — 画板 s001–s044
 * ----------------------------------------------------------------------------
 * 第一幕：启动（0:00–0:16）→ 定理（0:29–0:59）→ 刺激 / 满足（0:59–1:14）
 * 每块画板都是 (p, cue, t, 世界状态) 的纯函数。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, S = WX.S, W = WX.W, H = WX.H, M = D.m;
  var CX = W / 2, CY = H / 2;

  function A(wr, a) { return EM.withA(wr.accent, a === undefined ? 1 : a); }
  function AC2(wr, a) { return EM.withA(WX.WORLD.accent2(wr), a === undefined ? 1 : a); }
  function INK(wr, a) { return WX.WORLD.ink(wr, a === undefined ? 1 : a); }
  function WARM(a) { return EM.withA(EM.PAL.warm, a); }
  function HEAT(a) { return EM.withA(EM.PAL.heat, a); }
  function ellipsePts(cx, cy, rx, ry, n) {
    var pts = [], i;
    for (i = 0; i < n; i++) { var a = i / n * EM.TAU; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return pts;
  }
  function outQuart(u) { u = EM.clamp(u, 0, 1); return 1 - Math.pow(1 - u, 4); }
  function pop(u) {
    u = EM.clamp(u, 0, 1);
    return u < 0.18 ? 1 - Math.pow(2, -10 * u / 0.18) : 1 + 0.09 * Math.sin((u - 0.18) * 16) * Math.pow(1 - u, 2);
  }
  var LINE = 250;                       // 画板内容的左边界（左边留给音高尺）

  /* ---------------------------------------------------------------- 启动 */

  S.def('s001', { name: '(pre-roll)' }, function (p, cue, t, wr) {
    var y = H * 0.52;
    var x = LINE + 120 + (W - LINE - 420) * EM.ease(p);
    D.seg(LINE + 120, y, x, y, A(wr, 0.35), 1.4);
    D.circle(x, y, 4 + 10 * EM.hit(t, 0.25), A(wr, 0.9));
    for (var i = -14; i <= 0; i++) {                 // 刚刚过去的真实音符
      var xx = x + i * 26;
      if (xx < LINE + 120) continue;
      var hh = 8 + 30 * EM.hit(t + i * 0.05, 0.2);
      D.seg(xx, y - hh, xx, y + hh, A(wr, 0.06 + 0.3 * (1 + i / 14)), 1.2);
    }
    M.dotText('BOOT', LINE + 130, 210, 7, A(wr, 0.22));
    D.mono('audio.currentTime  ==  ' + t.toFixed(3), LINE + 130, 470, 15, A(wr, 0.55));
    M.caret(LINE + 130 + D.measure('audio.currentTime  ==  ' + t.toFixed(3), 15, true), 470, 15, A(wr, 0.9), t);
    M.lyric(cue.text, LINE + 130, 520, 20, A(wr, 0.35), p, { mono: true });
  });

  /* Switch on the power line：移植另一版本 boot.power 的“母线通电”动画。 */
  S.def('s002', { name: 'Switch on the power line' }, function (p, cue, t, wr) {
    var x0 = W * 0.08, x1 = W * 0.92, y = 500;
    var on = EM.clamp(p / 0.55, 0, 1);
    var hx = x0 + (x1 - x0) * outQuart(on);
    // 母线（暗底 + 已通电亮段）
    D.seg(x0, y, x1, y, A(wr, 0.30), 2);
    D.seg(x0, y, hx, y, A(wr, 0.95), 3.4);
    // 电荷前端的光晕（同心圆近似径向渐变）
    for (var gr = 1; gr <= 7; gr++) {
      D.circle(hx, y, gr * 17, EM.withA(INK(wr, 1), 0.22 * (1 - gr / 8)));
    }
    // 断路器刻度：电荷经过的刻度被点亮
    for (var i = 0; i <= 14; i++) {
      var bx = x0 + (x1 - x0) * i / 14;
      var lit = bx <= hx + 1;
      D.seg(bx, y - 13, bx, y + 13, A(wr, lit ? 0.8 : 0.18), lit ? 2 : 1);
    }
    M.head('V_SUPPLY  =  ' + (5.00 + 0.02 * Math.sin(t * 9)).toFixed(2) + ' V   //   I = ' + (0.30 + 0.4 * EM.pulse(t, 0.4)).toFixed(2) + ' A',
      CX, y + 52, 15, A(wr, 0.55), { align: 'center', track: 2.4 });
    M.lyric(cue.text, LINE + 60, 260, 34, INK(wr, 0.95), p, {});
  });

  /* Remember to put on：移植另一版本 boot.remember 的“面罩降下 + 对勾”动画。 */
  S.def('s003', { name: 'Remember to put on' }, function (p, cue, t, wr) {
    var x = CX;
    var drop = EM.ease(EM.clamp(p / 0.6, 0, 1));
    var cy = 230 + 280 * drop;                       // 面罩从上方降下来
    // 面罩穹顶
    D.arc(x, cy, 118, Math.PI * 1.06, Math.PI * 1.94, A(wr, 0.85), 2.4);
    // 面罩边缘的短肋
    for (var i = -4; i <= 4; i++) {
      var an = Math.PI * 1.5 + i * 0.16;
      D.seg(x + Math.cos(an) * 118, cy + Math.sin(an) * 118,
            x + Math.cos(an) * 138, cy + Math.sin(an) * 138, A(wr, 0.35), 1.2);
    }
    // 扣好后的对勾
    var t2 = EM.clamp((p - 0.5) / 0.35, 0, 1);
    if (t2 > 0) {
      D.seg(x - 16, 620, x - 4, 632, A(wr, 0.9), 3);
      D.seg(x - 4, 632, x - 4 + 30 * outQuart(t2), 632 - 30 * outQuart(t2), A(wr, 0.9), 3);
    }
    M.lyric(cue.text, LINE + 60, 260, 34, INK(wr, 0.95), p, {});
  });

  /* PROTECTION：移植另一版本 boot.protect 的“护盾网承受冲击”动画。 */
  S.def('s004', { name: 'PROTECTION' }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY - 20;
    var s = pop(EM.clamp(p / 0.28, 0, 1));
    D.save(); D.at(x, y, 0, s);
    // 盾形轮廓（顶部宽、底部收）
    var pts = [], i;
    for (i = 0; i <= 40; i++) {
      var u = i / 40, ang = -Math.PI / 2 + u * EM.TAU;
      var rr = 220 * (1 + 0.08 * Math.cos(6 * ang)) * (ang > 0 ? 1 - 0.35 * Math.sin(ang) : 1);
      pts.push([Math.cos(ang) * rr * 0.86, Math.sin(ang) * rr + 20]);
    }
    D.line(pts, A(wr, 0.95), 3, true);
    // 六边形防护网
    for (var hy = -160; hy <= 200; hy += 42) {
      for (var hx = -170; hx <= 170; hx += 48) {
        var off = (((hy / 42) | 0) % 2) ? 24 : 0;
        if (Math.hypot(hx + off, hy - 20) > 200) continue;
        var hex = [];
        for (var k = 0; k < 6; k++) {
          var ha = k / 6 * EM.TAU;
          hex.push([hx + off + Math.cos(ha) * 24, hy + Math.sin(ha) * 24]);
        }
        D.line(hex, A(wr, 0.28), 1, true);
      }
    }
    // 四次命中：星形爆炸 + 冲击环
    var hits = [0.22, 0.45, 0.68, 0.86];
    for (i = 0; i < hits.length; i++) {
      var hp = EM.clamp((p - hits[i]) / 0.22, 0, 1);
      if (hp <= 0 || hp >= 1) continue;
      var ha2 = (EM.h(i * 313, 0, 0) - 0.5) * 2.2;
      var hxx = Math.cos(ha2) * 190, hyy = Math.sin(ha2) * 190 * 0.9 - 20;
      var star = [];
      for (var sp = 0; sp < 18; sp++) {
        var sa = sp / 18 * EM.TAU + hp * 2;
        var sr = (sp % 2 ? 4 + hp * 26 : 10 + hp * 70);
        star.push([hxx + Math.cos(sa) * sr, hyy + Math.sin(sa) * sr]);
      }
      D.line(star, HEAT((1 - hp) * 0.95), 2, true);
      D.circle(hxx, hyy, 8 + hp * 90, INK(wr, (1 - hp) * 0.7), 3);
    }
    D.restore();
    M.head('PROTECTION', x, y + 18, 62, INK(wr, 1), { align: 'center', weight: 'bold', track: 3 });
    D.seg(x - 190, y + 42, x + 190, y + 42, HEAT(0.7), 2);
    D.mono('ARMOUR  ·  LOADED', x, y + 62, 15, A(wr, 0.45), { align: 'center' });
    M.lyric(cue.text === 'PROTECTION' ? '' : cue.text, LINE + 60, 200, 26, INK(wr, 0.8), p, {});
  });

  S.def('s005', { name: "Lay down your pieces" }, function (p, cue, t, wr) {
    var groundY = 640, x0 = LINE + 200;
    D.seg(x0 - 120, groundY, W - 120, groundY, A(wr, 0.35), 1.6);
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
    var shapes = [[0, 0, 0, 1, 1, 1, 0, 0], [1, 1, 1, 1], [0, 1, 1, 0, 0, 1, 1, 0], [1, 1, 0, 1, 1, 0], [1, 1, 1, 0, 0, 1]];
    for (var i = 0; i < 5; i++) {
      var cell = 22, cols = 4;
      var fall = EM.ease(EM.clamp(p * 2.2 - i * 0.16, 0, 1));
      var bx = x0 + i * 190, by = 250 + (groundY - 250 - 120) * fall;
      var land = EM.clamp((p * 2.2 - i * 0.16 - 0.85) * 6, 0, 1);
      var sh = shapes[i];
      for (var c = 0; c < 8; c++) {
        if (sh[c % sh.length] !== 1) continue;
        var col = Math.floor(c / (sh.length / 2)), row = c % (sh.length / 2);
        D.rect(bx + col * cell, groundY - (2 - row) * cell - 0, cell - 1.5, cell - 1.5, A(wr, 0.35 + 0.4 * land));
      }
    }
    D.mono('PIECES  5 / 5', x0, groundY + 44, 14, A(wr, 0.45));
  });

  S.def('s006', { name: "And let's begin" }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY - 30, s = 150;
    D.poly([[x - s * 0.45, y - s * 0.7], [x + s * 0.75, y], [x - s * 0.45, y + s * 0.7]], A(wr, 0.10));
    D.line([[x - s * 0.45, y - s * 0.7], [x + s * 0.75, y], [x - s * 0.45, y + s * 0.7]], A(wr, 0.85), 3, true);
    var k = EM.saw(p * 3);
    D.circle(x, y, s * 1.5, A(wr, 0.06 + 0.1 * (1 - k)), 1.4);
    D.seg(x - s * 1.6, y, x - s * 1.6 + s * 3.2 * p, y, A(wr, 0.4), 1.2);
    D.mono('T+0.000', x - s * 1.6, y + 26, 15, A(wr, 0.5));
    M.lyric(cue.text, LINE + 60, 230, 34, INK(wr, 0.95), p, {});
    D.mono('1296  TICKS  /  130 BPM', LINE + 60, 280, 14, A(wr, 0.35));
  });

  S.def('s007', { name: 'OBJECT CREATION' }, function (p, cue, t, wr) {
    var x = CX + 80, y = CY - 10, s = 170;
    var u = EM.ease(EM.clamp(p * 1.5, 0, 1));
    var cube = function (k) {
      var pts = [];
      var p0 = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
      var pr = [];
      for (var i = 0; i < 8; i++) {
        var f = 1 / (1 + 0.32 * (2 - p0[i][2]));
        pr.push([x + p0[i][0] * s * k * f + p0[i][2] * 34 * k, y + p0[i][1] * s * k * f - p0[i][2] * 18 * k]);
      }
      var edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      return { pr: pr, edges: edges };
    };
    var c = cube(0.62 + 0.38 * u);
    for (var i = 0; i < c.edges.length; i++) {
      var e = c.edges[i], vis = EM.clamp(u * 14 - i, 0, 1);
      if (vis <= 0) continue;
      D.seg(c.pr[e[0]][0], c.pr[e[0]][1], c.pr[e[0]][0] + (c.pr[e[1]][0] - c.pr[e[0]][0]) * vis,
        c.pr[e[0]][1] + (c.pr[e[1]][1] - c.pr[e[0]][1]) * vis, A(wr, 0.3 + 0.55 * (i / 12)), 2);
    }
    if (p > 0.78) {
      D.rect(x - 46, y - 30, 92, 60, A(wr, 0.16 + 0.2 * EM.hit(t, 0.3)));
      D.circle(x, y, 8 + 14 * EM.hit(t, 0.3), [255, 255, 255, 0.75]);
    }
    D.mono('new  Object(  )', x, y + 230, 16, A(wr, 0.55), { align: 'center' });
    D.mono('Objects (me, you) are created.', x, y + 262, 15, A(wr, 0.85), { align: 'center' });   // MV 原话
    M.lyric(cue.text, LINE + 60, 220, 30, INK(wr, 0.95), p, {});
  });

  S.def('s008', { name: 'Fill in my data parameters' }, function (p, cue, t, wr) {
    var x = LINE + 80, y = 250;
    M.lyric(cue.text, x, y - 66, 32, INK(wr, 0.95), p, {});
    var rows = [['name', 'WORLD.EXECUTE'], ['mass', '6.150e+02'], ['limit', 'Infinity'], ['permission', 'none']];
    for (var i = 0; i < rows.length; i++) {
      var ry = y + i * 52, rv = EM.clamp(p * 4.2 - i * 0.8, 0, 1);
      D.rect(x, ry, 300, 34, A(wr, 0.05));
      D.rect(x, ry, 300, 34, A(wr, 0.28), 1.2);
      D.mono(rows[i][0], x + 10, ry + 23, 17, A(wr, 0.6));
      D.mono(rows[i][1].slice(0, Math.ceil(rows[i][1].length * rv)), x + 130, ry + 23, 17, A(wr, 0.95 * rv));
    }
    M.barcode(x + 380, 250, 300, 90, A(wr, 0.5), 7);
    M.gauge(x + 380, 380, 300, 16, EM.clamp(p * 1.2, 0, 1), A(wr, 0.8), 'PARAM  FILL');
  });

  S.def('s009', { name: 'INITIALIZATION' }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY - 20;
    for (var i = 0; i < 7; i++) {
      var k = EM.clamp(p * 2.6 - i * 0.22, 0, 1);
      if (k <= 0) continue;
      var r = 40 + i * 52;
      D.circle(x, y, r * EM.ease(k), A(wr, (0.5 - i * 0.055) * (0.4 + 0.6 * k)), 1.6);
    }
    var ph = p * EM.TAU * 1.5;
    D.circle(x + Math.cos(ph) * 260, y + Math.sin(ph) * 260, 6, A(wr, 0.9));
    D.circle(x + Math.cos(ph * 1.6 + 1) * 160, y + Math.sin(ph * 1.6 + 1) * 160, 4.5, AC2(wr, 0.9));
    D.mono('init(  )  →  ready', x, y + 320, 16, A(wr, 0.55), { align: 'center' });
    M.lyric(cue.text, LINE + 60, 220, 30, INK(wr, 0.95), p, {});
  });

  S.def('s010', { name: 'Set up our new world' }, function (p, cue, t, wr) {
    var x = CX + 80, y = CY - 10, R = 190;
    D.circle(x, y, R, A(wr, 0.5), 1.6);
    for (var i = 0; i < 9; i++) {                    // 经线
      var k = p * 1.4 - i * 0.05;
      if (k <= 0) continue;
      var pts = [];
      for (var j = 0; j <= 24; j++) {
        var a = -Math.PI / 2 + Math.PI * j / 24;
        var rx = R * Math.cos(a) * (i / 9 * 2 - 1);
        pts.push([x + rx * EM.ease(EM.clamp(k, 0, 1)), y + R * Math.sin(a)]);
      }
      D.line(pts, A(wr, 0.2 + 0.3 * EM.clamp(k, 0, 1)), 1.2);
    }
    for (var q = 0; q < 5; q++) {
      var yy = y - R + (q + 1) * R * 2 / 6;
      var wq = Math.sqrt(Math.max(0, R * R - (yy - y) * (yy - y)));
      D.seg(x - wq, yy, x + wq, yy, A(wr, 0.25), 1.2);
    }
    D.circle(x, y, 6 + 16 * EM.hit(t, 0.3), WARM(0.8));
    M.lyric(cue.text, LINE + 60, 210, 30, INK(wr, 0.95), p, {});
    D.mono('SEED  0x1F4A9', LINE + 60, 250, 14, A(wr, 0.4));
  });

  S.def('s011', { name: "And let's begin the" }, function (p, cue, t, wr) {
    var y = 400, x0 = CX - 120;
    for (var i = 0; i < 2; i++) {
      var x = x0 + i * 320;
      D.circle(x, y, 90, A(wr, 0.06));
      D.circle(x, y, 90, A(wr, 0.6), 2);
      D.rotate ? null : null;
      var a = t * (i ? -2.4 : 2.4) * (0.4 + p);
      for (var k = 0; k < 4; k++) {
        var aa = a + k / 4 * EM.TAU;
        D.seg(x, y, x + Math.cos(aa) * 80, y + Math.sin(aa) * 80, A(wr, 0.5), 2.4);
      }
      D.circle(x, y, 14, A(wr, 0.8));
    }
    D.seg(x0 - 90, y, x0 + 410, y, A(wr, 0.3), 1.4);
    var n = Math.max(1, Math.ceil(p * 4));
    M.dotText(String(Math.min(3, 4 - (n - 1))), x0 + 470, y - 60, 9, A(wr, 0.85));
    M.lyric(cue.text, LINE + 60, 210, 32, INK(wr, 0.95), p, {});
    D.mono('ROLLING', x0 + 470, y + 60, 15, A(wr, 0.5));
  });

  S.def('s012', { name: 'SIMULATION' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, y0 = 240, cw = 34, ch = 34, nx = 28, ny = 12;
    var step = Math.floor(t * 6);
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var gx = x0 + i * cw, gy = y0 + j * ch;
      var live = EM.h(i, j, step) > 0.62 || (Math.abs(i - 14 - Math.sin(t) * 6) < 3 && Math.abs(j - 6) < 1);
      if (live) D.rect(gx, gy, cw - 3, ch - 3, A(wr, 0.25 + 0.5 * EM.h(i, j, step + 1)));
      else D.circle(gx + cw / 2, gy + ch / 2, 1.1, A(wr, 0.12));
    }
    M.lyric(cue.text, x0, 190, 34, INK(wr, 0.95), p, {});
    D.mono('RULE  B3/S23  ·  GENERATION ' + (step % 97), x0, 680, 14, A(wr, 0.45));
  });

  S.def('s013', { name: '(instrumental — world boot)' }, function (p, cue, t, wr) {
    // 13.7 秒的长镜头：世界从地面网格里长出来。三段。
    var stage = p < 0.34 ? 0 : (p < 0.72 ? 1 : 2);
    var u = stage === 0 ? p / 0.34 : (stage === 1 ? (p - 0.34) / 0.38 : (p - 0.72) / 0.28);
    u = EM.clamp(u, 0, 1);
    var horizon = 300 + 130 * (1 - u) + (stage === 2 ? 60 : 0);
    for (var i = 0; i < 22; i++) {                    // 透视地平线
      var k = i / 21;
      var zz = Math.pow(k, 1.7);
      var yy = horizon + zz * (H - horizon - 40);
      D.seg(LINE + 120, yy, W - 120, yy, A(wr, 0.06 + 0.16 * zz), 1);
    }
    for (var c = -12; c <= 12; c++) {
      var xTop = CX + c * 26, xBot = CX + c * 150;
      D.seg(xTop, horizon, xTop + (xBot - xTop) * (0.4 + 0.6 * u), horizon + (H - horizon) * (0.4 + 0.6 * u), A(wr, 0.05 + 0.12 * u), 1);
    }
    if (stage >= 1) {                                  // 球体成型
      var r = 120 * EM.ease(u);
      D.circle(CX, 300, r, A(wr, 0.5), 1.8);
      for (var q = 0; q < 7; q++) {
        var yy2 = 300 - r + (q + 1) * r * 2 / 8;
        var wq = Math.sqrt(Math.max(0, r * r - (yy2 - 300) * (yy2 - 300)));
        D.seg(CX - wq, yy2, CX + wq, yy2, A(wr, 0.3), 1.1);
      }
    }
    if (stage >= 2) {                                  // 波
      for (var b = 0; b < 4; b++) {
        D.wave(LINE + 140, W - 140, 560 + b * 40, 26 - b * 4, 3 + b, t * (1 + b * 0.3), A(wr, 0.3 - b * 0.05), 1.6, 90);
      }
    }
    M.dotText('WORLD', LINE + 140, 150, 6, A(wr, 0.25));
    D.mono(cue.text, LINE + 140, 760, 15, A(wr, 0.35));
    D.mono('BOOT PHASE ' + (stage + 1) + '/3', W - 140, 760, 15, A(wr, 0.4), { align: 'right' });
  });

  /* ---------------------------------------------------------------- 定理 */

  S.def('s014', { name: "If I'm a set of points" }, function (p, cue, t, wr) {
    var x0 = LINE + 140, y0 = 250, n = 46, hl = (p * n) | 0;
    for (var i = 0; i < n; i++) {
      var px = x0 + EM.h(i, 1, 0) * 620, py = y0 + EM.h(i, 2, 0) * 420;
      var on = i === hl || i === hl - 1;
      D.circle(px, py, on ? 9 + 6 * EM.hit(t, 0.25) : 2.6, on ? WARM(0.95) : A(wr, 0.5));
      if (i < hl) D.seg(x0 + EM.h(i, 1, 0) * 620, py, px, py, A(wr, 0.05), 0.6);
    }
    var hx = x0 + EM.h(hl, 1, 0) * 620, hy = y0 + EM.h(hl, 2, 0) * 420;
    D.cross(hx, hy, 34, A(wr, 0.45), 1.2);
    D.mono('{' + hl + '  points }', x0, y0 + 470, 16, A(wr, 0.6));
    M.lyric(cue.text, LINE + 140, 180, 32, INK(wr, 0.95), p, {});
  });

  S.def('s015', { name: 'Then I will give you my' }, function (p, cue, t, wr) {
    var x0 = LINE + 130, y0 = 300;
    for (var i = 0; i < 30; i++) D.circle(x0 + EM.h(i, 4, 0) * 200, y0 + EM.h(i, 5, 0) * 180, 2.6, A(wr, 0.5));
    var bx = x0 + 300, by = y0 + 90;
    var k = EM.ease(EM.clamp(p * 1.8, 0, 1));
    D.rrect(bx, by - 70, 200, 140, 8, A(wr, 0.08));
    D.rrect(bx, by - 70, 200, 140, 8, A(wr, 0.5 + 0.4 * k), 2);
    D.seg(bx, by, bx + 200, by, A(wr, 0.4), 1.4);
    D.seg(bx + 100, by - 70, bx + 100, by + 70, A(wr, 0.4), 1.4);
    D.seg(bx + 100, by - 70, bx + 30 - 60 * k, by - 150 * k, A(wr, 0.7), 2);
    D.seg(bx + 100, by - 70, bx + 170 + 60 * k, by - 150 * k, A(wr, 0.7), 2);
    if (p > 0.55) M.arrow(x0 + 240, by, x0 + 288, by, A(wr, 0.8), 2);
    M.lyric(cue.text, x0, 190, 32, INK(wr, 0.95), p, {});
  });

  /* DIMENSION：三条坐标轴展开，随后围出体积。 */
  S.def('s016', { name: 'DIMENSION' }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY - 20;
    var k = outQuart(EM.clamp(p / 0.45, 0, 1));
    var L = 300 * k;
    var dirs = [[1, 0, 0], [0, -1, 0], [-0.66, 0.55, 0]];
    var labels = ['x', 'y', 'z'];
    for (var i = 0; i < 3; i++) {                    // 三条坐标轴 + 箭头 + 标签
      var ex = dirs[i][0] * L, ey = dirs[i][1] * L;
      if (L > 0.01) M.arrow(x, y, x + ex, y + ey, A(wr, 0.9), 3, 13);
      if (k > 0.35) D.mono(labels[i], x + ex * 1.16 + 6, y + ey * 1.16 + 6, 22, INK(wr, 0.95));
    }
    if (k > 0.8) {                                   // 三条轴围出的体积（斜投影）
      var v = EM.clamp((p - 0.4) / 0.35, 0, 1);
      var zx = -L * 0.66, zy = -L * 0.55;
      D.poly([[x, y], [x + L, y], [x + L + zx, y + zy], [x + zx, y + zy]], A(wr, 0.06 * v));
      D.line([[x, y], [x + L, y], [x + L + zx, y + zy], [x + zx, y + zy]], A(wr, 0.4 * v), 1.2, true);
      D.poly([[x, y], [x + zx, y + zy], [x + zx, y + zy + L], [x, y + L]], A(wr, 0.04 * v));
      D.line([[x, y], [x + zx, y + zy], [x + zx, y + zy + L], [x, y + L]], A(wr, 0.4 * v), 1.2, true);
      D.seg(x + L, y, x + L + zx, y + zy, A(wr, 0.35 * v), 1.2);
      D.seg(x + L, y + L, x + L + zx, y + zy + L, A(wr, 0.35 * v), 1.2);
      D.seg(x, y + L, x + L, y + L, A(wr, 0.35 * v), 1.2);
      D.seg(x + zx, y + zy + L, x + L + zx, y + zy + L, A(wr, 0.35 * v), 1.2);
    }
    D.mono('span  =  ' + (L / 150).toFixed(2) + '  unit', x - 280, y + 330, 15, A(wr, 0.5));
    M.head('DIMENSION', x, y + 370, 46, INK(wr, 1), { align: 'center', weight: 'bold', track: 2 });
    D.seg(x - 180, y + 392, x + 180, y + 392, HEAT(0.8), 2.4);
    M.lyric(cue.text === 'DIMENSION' ? '' : cue.text, LINE + 120, 200, 28, INK(wr, 0.9), p, {});
  });

  S.def('s017', { name: "If I'm a circle" }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY - 10, r = 210;
    var a1 = Math.PI * 1.5 + EM.TAU * EM.ease(EM.clamp(p * 1.2, 0, 1));
    D.arc(x, y, r, Math.PI * 1.5, a1, A(wr, 0.9), 3);
    D.seg(x, y, x + Math.cos(a1) * r, y + Math.sin(a1) * r, A(wr, 0.45), 1.6);
    D.circle(x + Math.cos(a1) * r, y + Math.sin(a1) * r, 8 + 8 * EM.hit(t, 0.2), WARM(0.9));
    D.circle(x, y, 4, A(wr, 0.6));
    D.mono('r', x + 22, y - 10, 18, A(wr, 0.7));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  /* Then I will give you my：一只张开的手，把半径 r 托起来。 */
  S.def('s018', { name: 'Then I will give you my' }, function (p, cue, t, wr) {
    var x = CX + 20, baseY = 574;
    var k = EM.ease(EM.clamp(p / 0.5, 0, 1));
    // 手掌（椭圆线框）
    D.line(ellipsePts(x, 540, 76, 48, 44), A(wr, 0.6), 2.4, true);
    // 五根手指从掌根向上展开
    for (var f = -2; f <= 2; f++) {
      var len = (120 + (2 - Math.abs(f)) * 26) * k;
      var dx = f * 30;
      var tipY = baseY - len;
      var fp = [];
      for (var j = 0; j <= 8; j++) {
        var u = j / 8, v = 1 - u;
        var qx = v * v * (x + dx * 0.5) + 2 * v * u * (x + dx * 1.4) + u * u * (x + dx * 1.9);
        var qy = v * v * baseY + 2 * v * u * (baseY - len * 0.6) + u * u * tipY;
        fp.push([qx, qy]);
      }
      D.line(fp, A(wr, 0.8), 2.2);
      if (k > 0.05) D.circle(x + dx * 1.9, tipY, 6 * k, A(wr, 0.8), 1.4);
    }
    // 托起的半径 r
    M.arrow(x, 480, x, 340, HEAT(0.85), 2, 11);
    D.mono('r', x + 14, 430, 20, INK(wr, 0.9));
    var hl = EM.pulse(t, 0.32);
    D.circle(x, 328, 7 + hl * 5, INK(wr, 0.9));
    D.circle(x, 328, 18 + hl * 8, A(wr, 0.4), 1.4);
    M.lyric(cue.text, LINE + 260, 200, 32, INK(wr, 0.95), p, {});
  });

  /* CIRCUMFERENCE：圆的下半段展开成直线，C = 2πr。 */
  S.def('s019', { name: 'CIRCUMFERENCE' }, function (p, cue, t, wr) {
    var x = CX + 20, y = 360, R = 150;
    var C = EM.TAU * R;
    var k = EM.clamp(p / 0.62, 0, 1);
    var kk = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // inOutQuad
    // 上半圆保持为圆，半径标注出来
    D.arc(x, y, R, Math.PI, EM.TAU, A(wr, 0.9), 3);
    D.seg(x, y, x, y - R, A(wr, 0.4), 1.4);
    D.mono('r', x + 8, y - R * 0.55, 15, A(wr, 0.7));
    // 下半段从圆弧渐渐展平成一条直线
    var pts = [];
    for (var i = 0; i <= 90; i++) {
      var u = i / 90;
      var ang = Math.PI + u * Math.PI;
      var cx = x + Math.cos(ang) * R, cy = y + Math.sin(ang) * R;
      var lx = x - C / 2 + u * C, ly = y + 160;
      pts.push([cx + (lx - cx) * kk, cy + (ly - cy) * kk]);
    }
    D.line(pts, HEAT(0.95), 3);
    // 展开后的线段与周长标注
    if (kk > 0.85) {
      D.seg(x - C / 2, y + 190, x - C / 2, y + 210, A(wr, 0.7), 2);
      D.seg(x + C / 2, y + 190, x + C / 2, y + 210, A(wr, 0.7), 2);
      D.seg(x - C / 2, y + 200, x + C / 2, y + 200, A(wr, 0.25), 1.2);
      D.mono('C = 2πr', x, y + 240, 17, INK(wr, 0.9), { align: 'center' });
    }
    D.circle(x, y, 4, INK(wr, 0.9));
    M.lyric(cue.text, LINE + 240, 190, 32, INK(wr, 0.95), p, {});
  });

  S.def('s020', { name: "If I'm a sine wave" }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 160, y = CY - 20;
    var pts = [];
    var grow = EM.ease(EM.clamp(p * 1.25, 0, 1));
    var n = 140;
    for (var i = 0; i <= n * grow; i++) {
      var x = x0 + (x1 - x0) * i / n;
      pts.push([x, y + Math.sin(i / n * 3.6 * EM.TAU + t * 0.6) * 150]);
    }
    D.seg(x0, y, x1, y, A(wr, 0.15), 1.2);
    D.line(pts, A(wr, 0.9), 3);
    if (pts.length) {
      var lp = pts[pts.length - 1];
      D.circle(lp[0], lp[1], 9 + 8 * EM.hit(t, 0.2), WARM(0.9));
      D.seg(lp[0], y - 190, lp[0], y + 190, A(wr, 0.2), 1);
    }
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
    D.mono('A·sin(ωt + φ)', x0, y + 230, 16, A(wr, 0.5));
  });

  S.def('s021', { name: 'Then you can sit on all my' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 200, y = 560;
    var wave = function (x) { return y + Math.sin((x - x0) * 0.006 + t * 0.5) * 120; };
    D.fn(x0, x1, wave, A(wr, 0.75), 2.6, 120);
    for (var i = 0; i < 4; i++) {
      var k = EM.clamp(p * 2 - i * 0.18, 0, 1);
      if (k <= 0) continue;
      var sx = x0 + 120 + i * 240 + (1 - EM.ease(k)) * 260;
      var sy = wave(sx);
      var slope = (wave(sx + 4) - wave(sx - 4)) / 8;
      D.save(); D.translate(sx, sy); D.rotate(Math.atan(slope));
      D.rect(-26, -40, 52, 22, EM.withA(AC2(wr, 1), 0.35));
      D.rect(-26, -40, 52, 22, AC2(wr, 0.85), 1.8);
      D.seg(0, -18, 0, 0, AC2(wr, 0.6), 1.6);
      D.restore();
      D.circle(sx, sy, 5, WARM(0.9));
    }
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s022', { name: 'TANGENTS' }, function (p, cue, t, wr) {
    var x0 = LINE + 140, x1 = W - 180, y = 470;
    var f = function (x) { return y + Math.sin((x - x0) * 0.005) * 130 + Math.sin((x - x0) * 0.0022) * 50; };
    D.fn(x0, x1, f, A(wr, 0.55), 2.2, 130);
    var m = 12;
    for (var i = 0; i < m; i++) {
      var k = EM.clamp(p * 1.6 - i * 0.03, 0, 1);
      if (k <= 0) continue;
      var x = x0 + (x1 - x0) * (i + 0.5) / m;
      var sl = (f(x + 3) - f(x - 3)) / 6;
      var L = 120 * EM.ease(k);
      D.seg(x - L, f(x) - sl * L, x + L, f(x) + sl * L, A(wr, 0.10 + 0.35 * k), 1.1);
      D.circle(x, f(x), 3.4 + 5 * EM.hit(t - i * 0.06, 0.16), WARM(0.75));
    }
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
    D.mono("f'(x)  ·  " + m + ' tangents', x0, 760, 14, A(wr, 0.45));
  });

  S.def('s023', { name: 'If I approach infinity' }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY - 10, hz = 880;
    D.seg(LINE + 120, y, hz, y, A(wr, 0.2), 1.2);
    var pts = [];
    for (var i = 1; i <= 60; i++) {
      var xx = x + Math.pow(i / 60, 0.35) * (hz - x);
      pts.push([xx, y - 260 / (i / 4 + 1)]);
    }
    D.line(pts, A(wr, 0.7), 2.4);
    var k = EM.ease(EM.clamp(p * 1.3, 0, 1));
    var ax = x + (hz - x) * k;
    M.arrow(LINE + 160, y + 180, ax, y + 180, WARM(0.85), 2.4, 16);
    D.circle(ax, y + 180, 7 + 6 * EM.hit(t, 0.22), WARM(0.9));
    M.head('∞', hz - 40, y - 40, 90, INK(wr, 1), { align: 'center', weight: 'bold' });
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s024', { name: 'Then you can be my' }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY, ax = 380, ay = 200;
    D.seg(LINE + 120, y, W - 160, y, A(wr, 0.35), 1.4);
    D.seg(x, y - ay, x, y + ay, A(wr, 0.35), 1.4);
    for (var s = -1; s <= 1; s += 2) {
      var pts = [];
      for (var i = 1; i <= 60; i++) {
        var xx = x + s * (60 + i * 12);
        pts.push([xx, y + 90000 / (xx - x)]);
      }
      D.line(pts, A(wr, 0.35 + 0.4 * EM.clamp(p, 0, 1)), 2.2);
    }
    D.seg(x - ax, y, x - 160, y, A(wr, 0.9), 2.6);
    D.seg(x, y + ay, x, y + 90, A(wr, 0.9), 2.6);
    M.mono('LIMITATIONS  =  0', LINE + 120, y + 300, 16, A(wr, 0.5));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  /* LIMITATIONS：ε-δ 窗口不断收缩，振荡曲线被夹到极限 L 附近。 */
  S.def('s025', { name: 'LIMITATIONS' }, function (p, cue, t, wr) {
    var x0 = LINE + 130, x1 = W - 140, y0 = CY + 20;
    // 收敛曲线：振荡包络越往右越小，最终贴住极限 L
    var pts = [];
    for (var i = 0; i <= 140; i++) {
      var u = i / 140, x = x0 + (x1 - x0) * u;
      pts.push([x, y0 + Math.sin(u * 9 + 1) * 150 * Math.exp(-u * 2.6)]);
    }
    D.line(pts, A(wr, 0.9), 2.4);
    D.seg(x0, y0, x1, y0, A(wr, 0.25), 1.2);            // 极限 L
    // ε 窗口：inQuart 从宽到窄，把极限点框住
    var k = EM.clamp(p / 0.6, 0, 1);
    var box = 620 - 530 * k * k * k * k;
    var bx = CX, by = y0;
    D.dashed(bx - box / 2, by - box / 2, bx + box / 2, by - box / 2, HEAT(0.8), 1.6, 10, 7);
    D.dashed(bx + box / 2, by - box / 2, bx + box / 2, by + box / 2, HEAT(0.8), 1.6, 10, 7);
    D.dashed(bx + box / 2, by + box / 2, bx - box / 2, by + box / 2, HEAT(0.8), 1.6, 10, 7);
    D.dashed(bx - box / 2, by + box / 2, bx - box / 2, by - box / 2, HEAT(0.8), 1.6, 10, 7);
    D.circle(bx, by, 6, INK(wr, 0.95));
    D.mono('|f(x) − L| < ε', bx - box / 2 - 8, by - box / 2 - 10, 15, INK(wr, 0.9), { align: 'right' });
    D.mono('ε = ' + (box / 620 * 2).toFixed(2), bx - box / 2 - 8, by + box / 2 + 24, 14, A(wr, 0.6), { align: 'right' });
    M.head('LIMITATIONS', CX, 180, 52, INK(wr, 1), { align: 'center', weight: 'bold', track: 2 });
    D.seg(CX - 170, 202, CX + 170, 202, HEAT(0.8), 2.4);
    M.lyric(cue.text === 'LIMITATIONS' ? '' : cue.text, LINE + 120, 250, 26, INK(wr, 0.85), p, {});
  });

  S.def('s026', { name: 'Switch my current' }, function (p, cue, t, wr) {
    var x = LINE + 300, y = 420;
    D.circle(x, y - 90, 8, A(wr, 0.8)); D.circle(x, y + 90, 8, A(wr, 0.8));
    var a = -1.15 + 2.0 * EM.ease(EM.clamp(p * 1.6, 0, 1));
    var ex = x + Math.sin(a) * 110, ey = y + 90 - Math.cos(a) * 180;
    D.seg(x, y - 90, ex, ey, EM.withA(EM.PAL.warm, 0.95), 4);
    D.seg(x, y - 90, x, y - 90, A(wr, 0.4), 1);
    var amp = Math.cos(EM.ease(EM.clamp(p * 1.6, 0, 1)) * Math.PI / 2);
    D.wave(x + 220, x + 640, y, 80 * amp + 2, 3, t * 2.2, A(wr, 0.8), 2.4, 80);
    D.seg(x + 220, y, x + 640, y, A(wr, 0.14), 1.2);
    D.mono(amp > 0.4 ? 'AC' : 'DC', x + 430, y - 130, 40, INK(wr, 1), { align: 'center', weight: 'bold' });
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s027', { name: 'To AC, to DC' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 160, y = 480;
    for (var b = 0; b < 2; b++) {
      var yy = y + b * 170 - 85;
      var k = b === 0 ? 1 - EM.clamp(p * 1.4, 0, 1) : EM.clamp(p * 1.4, 0, 1);
      var pts = [];
      for (var i = 0; i <= 80; i++) {
        var x = x0 + (x1 - x0) * i / 80;
        pts.push([x, yy + Math.sin(i / 80 * EM.TAU * 3 + t * 2) * 60 * k]);
      }
      D.line(pts, b ? WARM(0.5 + 0.45 * k) : A(wr, 0.5 + 0.45 * k), 2.6);
      D.mono(b ? 'DC' : 'AC', x0 - 50, yy + 6, 20, A(wr, b ? 0.4 + 0.5 * k : 0.9 - 0.5 * k));
    }
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s028', { name: 'And then blind my vision' }, function (p, cue, t, wr) {
    var x = CX + 100, y = CY - 20, r = 260;
    var open = 1 - EM.ease(EM.clamp(p * 1.3, 0, 1));
    M.eye(x, y, r, open, A(wr, 0.9), 2.6);
    for (var i = 0; i < 8; i++) {
      var yy = 120 + i * 84;
      var h = 40 * EM.ease(EM.clamp(p * 1.6 - i * 0.05, 0, 1));
      D.rect(LINE + 120, yy - h / 2, W - LINE - 260, h, [0, 0, 0, 0.8]);
    }
    M.mono('VISUAL INPUT  ·  OFFLINE', x, 200, 16, A(wr, 0.55), { align: 'center' });
    M.lyric(cue.text, LINE + 120, 760, 28, INK(wr, 0.8), p, {});
  });

  S.def('s029', { name: 'So dizzy, so dizzy' }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY - 10;
    D.save();
    D.translate(x, y); D.rotate(Math.sin(t * 2.2) * 0.12 * EM.clamp(p * 2, 0, 1));
    for (var s = 0; s < 4; s++) {
      var pts = [];
      for (var i = 0; i <= 130; i++) {
        var a = i * 0.22 + t * (1.2 + s * 0.2), r = 12 + i * 2.4;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      D.curve(pts, A(wr, 0.5 - s * 0.1), 2.4 - s * 0.4);
    }
    D.restore();
    D.mono('VESTIBULAR  ERROR', x, y + 380, 15, A(wr, 0.5), { align: 'center' });
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s030', { name: 'Oh, we can travel' }, function (p, cue, t, wr) {
    var x0 = LINE + 160, y = 560, x1 = W - 220;
    D.circle(x0 + 40, y + 40, 200, A(wr, 0.06));
    D.circle(x0 + 40, y + 40, 200, A(wr, 0.25), 1.2);
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var u = i / 40;
      pts.push([x0 + (x1 - x0) * u, y + 40 - Math.sin(u * Math.PI) * 260]);
    }
    D.dashed(x0 + 40, y, x1, y, A(wr, 0.2), 1, 8, 8);
    var k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    var n = Math.max(2, Math.round(pts.length * k));
    D.line(pts.slice(0, n), WARM(0.9), 2.6);
    var lp = pts[n - 1];
    D.circle(lp[0], lp[1], 8, WARM(0.95));
    for (var q = 0; q < 6; q++) {
      D.circle(lp[0], lp[1], 20 + q * 34 * ((EM.saw(t * 0.5 + q * 0.2))), WARM(0.16 * (1 - q / 6)));
    }
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s031', { name: 'To A.D., to B.C.' }, function (p, cue, t, wr) {
    var x0 = LINE + 140, y = 460, x1 = W - 160, mid = (x0 + x1) / 2;
    var shift = Math.sin(p * Math.PI) * 460;
    D.seg(x0, y, x1, y, A(wr, 0.5), 2);
    var year = Math.round(2026 - shift * 4.4);
    D.seg(mid, y - 60, mid, y + 60, A(wr, 0.9), 2.4);
    for (var i = -8; i <= 8; i++) {
      var xx = mid + i * 120 - shift % 120;
      if (xx < x0 || xx > x1) continue;
      D.seg(xx, y - 14, xx, y + 14, A(wr, 0.35), 1.2);
      D.mono(String(year + i * 500), xx + 4, y + 40, 13, A(wr, 0.45));
    }
    M.head((year > 0 ? 'A.D.  ' : 'B.C.  ') + Math.abs(year), mid, y - 120, 46, INK(wr, 1), { align: 'center', weight: 'bold' });
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s032', { name: 'And we can unite' }, function (p, cue, t, wr) {
    var x0 = LINE + 160, x1 = W - 200, y = CY;
    var k = EM.ease(EM.clamp(p * 1.3, 0, 1));
    var a = 140 * (1 - k * 0.5), b = 140 * (1 - k * 0.5);
    for (var i = 0; i <= 80; i++) {
      var x = x0 + (x1 - x0) * i / 80;
      var y1 = y - a * Math.sin(i / 80 * EM.TAU * 2 + t);
      var y2 = y + b * Math.sin(i / 80 * EM.TAU * 2 + t);
      var y3 = (y1 + y2) / 2;
      D.circle(x, y3, 1.6, WARM(0.8 * k));
    }
    D.wave(x0, x1, y, a, 2, t + Math.PI, A(wr, 0.5), 2.2, 80);
    D.wave(x0, x1, y, b, 2, t, AC2(wr, 0.5), 2.2, 80);
    if (k > 0.85) {
      D.wave(x0, x1, y, 200 * (k - 0.85) / 0.15 + 40, 2, t, WARM(0.95), 3.4, 80);
    }
    M.head('A ∪ B', x1 + 20, y + 12, 44, INK(wr, 1), { weight: 'bold' });
    M.lyric(cue.text, x0, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s033', { name: 'So deeply, so deeply' }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY;
    for (var i = 0; i < 14; i++) {
      var k = EM.clamp(p * 3 - i * 0.09, 0, 1);
      if (k <= 0) continue;
      var s = 420 * Math.pow(0.86, i) * EM.ease(k);
      var off = 18 * i * EM.ease(k);
      D.rect(x - s / 2 + off * 0.5, y - s / 2 + off * 0.3, s, s * 0.72, A(wr, 0.4 - i * 0.022), 1.4);
    }
    D.circle(x, y, 6 + 12 * EM.hit(t, 0.3), WARM(0.9));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  /* ------------------------------------------------------- 刺激 / 满足 */

  S.def('s034', { name: 'If I can' }, function (p, cue, t, wr) {
    var x = LINE + 320, y = 420, r = 130;
    var pts = M.diamond(x, y, r, A(wr, 0.75), 2.6);
    M.mono('IF', x, y + 6, 22, INK(wr, 1), { align: 'center' });
    var k = EM.ease(EM.clamp(p * 1.4, 0, 1));
    M.arrow(x + r * 1.35, y, x + r * 1.35 + 140 * k, y, A(wr, 0.7), 2);
    M.arrow(x, y + r, x, y + r + 120 * k, A(wr, 0.35), 1.6);
    D.mono('true', x + r * 1.35 + 30, y - 16, 15, A(wr, 0.6));
    D.mono('false', x + 16, y + r + 40, 15, A(wr, 0.3));
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s035', { name: 'If I can give you all the' }, function (p, cue, t, wr) {
    var x = LINE + 300, y = 400;
    M.diamond(x, y, 110, A(wr, 0.8), 2.4);
    M.mono('IF', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    for (var i = 0; i < 7; i++) {
      var a = -0.9 + i * 0.3;
      var k = EM.clamp(p * 2.4 - i * 0.1, 0, 1);
      if (k <= 0) continue;
      var L = 420 * EM.ease(k);
      var ex = x + 110 + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      D.seg(x + 100, y, ex, ey, A(wr, 0.25 + 0.45 * k), 1.8);
      D.circle(ex, ey, 5 + 5 * EM.hit(t - i * 0.08, 0.2), i === 3 ? WARM(0.9) : AC2(wr, 0.8));
    }
    M.lyric(cue.text, LINE + 60, 200, 30, INK(wr, 0.95), p, {});
  });

  S.def('s036', { name: 'STIMULATIONS' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, x1 = W - 160, y = 480;
    D.seg(x0, y, x1, y, A(wr, 0.35), 1.6);
    var i0 = Math.max(0, EM.indexAt(t - 2.2)), i1 = Math.max(0, EM.indexAt(t));
    for (var i = i0; i <= i1; i++) {
      var age = t - EM.t0[i];
      var x = x1 - (age / 2.2) * (x1 - x0);
      var amp = 40 + 150 * EM.accent[i] * (1 - age / 2.2);
      D.seg(x, y - amp, x, y + amp * 0.4, A(wr, 0.7 - 0.3 * age / 2.2), 2);
      D.circle(x, y - amp, 3.4 + 4 * EM.accent[i], WARM(0.8 - 0.4 * age / 2.2));
    }
    M.head('STIMULATIONS', LINE + 120, 200, 54, INK(wr, 1), { weight: 'bold', track: 2 });
    D.mono('615 EVENTS  ·  130 BPM', LINE + 122, 250, 15, A(wr, 0.5));
    M.lyric(cue.text === 'STIMULATIONS' ? '' : cue.text, LINE + 122, 300, 26, INK(wr, 0.85), p, {});
  });

  S.def('s037', { name: 'Then I can' }, function (p, cue, t, wr) {
    var x = LINE + 320, y = 420;
    M.diamond(x, y, 120, A(wr, 0.38), 2.2);
    var k = EM.ease(EM.clamp(p * 1.6, 0, 1));
    var bright = k > 0.35;
    M.diamond(x, y, 120, bright ? WARM(0.95) : A(wr, 0.4), 2.6);
    M.mono('THEN', x, y + 6, 20, INK(wr, 1), { align: 'center' });
    D.seg(x + 120 * 1.35, y, x + 120 * 1.35 + 200 * k, y, WARM(0.85), 2.6);
    if (k > 0.6) D.sparks(x + 120 * 1.35 + 200, y, 60, 10, WARM(0.7), 9, t, 2);
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s038', { name: 'Then I can be your only' }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY;
    var k = EM.ease(EM.clamp(p * 1.3, 0, 1));
    for (var i = 0; i < 60; i++) {
      var a = i / 60 * EM.TAU * 3, r = 60 + i * 5;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      var isOne = i === 41;
      D.circle(px, py, isOne ? 8 + 8 * EM.hit(t, 0.3) : 2.4, isOne ? WARM(1) : A(wr, 0.35 * (1 - k * 0.5)));
      if (i > 41 - 6 && i < 41 + 6 && k > 0.4) D.circle(px, py, 12, WARM(0.3));
    }
    D.circle(x + Math.cos(41 / 60 * EM.TAU * 3) * (60 + 41 * 5), y + Math.sin(41 / 60 * EM.TAU * 3) * (60 + 41 * 5), 30 * EM.hit(t, 0.4), WARM(0.5));
    M.mono('ONLY  1', x, 200, 18, A(wr, 0.6), { align: 'center' });
    M.lyric(cue.text, LINE + 120, 190, 32, INK(wr, 0.95), p, {});
  });

  S.def('s039', { name: 'SATISFACTION' }, function (p, cue, t, wr) {
    var x = LINE + 200, y = 480, k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    M.gauge(x, y, 620, 46, k, WARM(0.9), 'SATISFACTION');
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var u = i / 40;
      if (u > k) break;
      pts.push([x + u * 620, y + 160 - Math.sin(u * 3.2) * 60 * u]);
    }
    D.line(pts, A(wr, 0.6), 2.4);
    D.mono(Math.round(k * 100) + '%', x + 640, y + 34, 34, INK(wr, 1), { weight: 'bold' });
    M.head('SATISFACTION', LINE + 200, 300, 58, INK(wr, 1), { weight: 'bold', track: 2 });
    M.lyric(cue.text === 'SATISFACTION' ? '' : cue.text, LINE + 200, 360, 26, INK(wr, 0.85), p, {});
  });

  S.def('s040', { name: 'If I can make you happy' }, function (p, cue, t, wr) {
    var x = CX + 60, y = CY - 30, k = EM.ease(EM.clamp(p * 1.2, 0, 1));
    var pts = [];
    for (var i = 0; i <= 60; i++) {
      var u = i / 60;
      var a = Math.PI * (1.15 + 0.7 * Math.sin(u * Math.PI * 0.5));
      pts.push([x + (u - 0.5) * 460, y + 120 * Math.sin(u * Math.PI) - 40 * u * u]);
    }
    D.line(pts, A(wr, 0.85), 3);
    D.circle(x - 110, y - 70, 12, A(wr, 0.8));
    D.circle(x + 110, y - 70, 12, A(wr, 0.8));
    D.arc(x - 110, y - 70, 12, 0, EM.TAU * k, A(wr, 0.4), 1);
    if (k > 0.8) D.sparks(x, y + 40, 260, 16, WARM(0.6 * (k - 0.8) * 5), 12, t, 2);
    M.lyric(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), p, {});
  });

  S.def('s041', { name: 'I will run the' }, function (p, cue, t, wr) {
    var x = LINE + 160, y = 300;
    M.panel(x, y, 780, 300, 'command', A(wr, 0.8));
    var line1 = '> run(EXECUTION)';
    var shown = line1.slice(0, Math.max(1, Math.ceil(line1.length * EM.clamp(p * 1.6, 0, 1))));
    D.mono(shown, x + 26, y + 90, 30, A(wr, 0.95));
    M.caret(x + 26 + D.measure(shown, 30, true), y + 90, 30, WARM(0.95), t);
    D.mono('thread  0x00  ·  priority  normal', x + 26, y + 150, 15, A(wr, 0.45));
    M.ruler(x + 26, y + 220, 700, 20, A(wr, 0.5), 5);
    M.head(cue.text, LINE + 120, 200, 32, INK(wr, 0.95), {});
    M.mono('RUN  ·  one call, no return', LINE + 120, 246, 14, A(wr, 0.4));
  });

  S.def('s042', { name: 'EXECUTION  1/18' }, function (p, cue, t, wr) {
    var x = CX + 40, y = CY - 10;
    var rot = t * (0.25 + p * 0.5);
    M.gear(x, y, 190, 14, A(wr, 0.55), rot, 2.4);
    M.gear(x + 250, y + 90, 110, 11, A(wr, 0.4), -rot * 1.6 + 0.2, 2);
    M.gear(x - 230, y - 70, 80, 9, A(wr, 0.3), rot * 2.2, 1.6);
    D.circle(x, y, 22 + 10 * EM.hit(t, 0.3), WARM(0.35));
    M.head('EXECUTION', x, y - 300, 46, INK(wr, 0.95), { align: 'center', weight: 'bold', track: 4 });
    D.mono('first run  ·  gentle', x, y + 300, 15, A(wr, 0.45), { align: 'center' });
  });

  S.def('s043', { name: 'Though we are trapped' }, function (p, cue, t, wr) {
    var x0 = LINE + 220, y0 = 260, wBox = 700, hBox = 380;
    D.rect(x0, y0, wBox, hBox, A(wr, 0.05));
    D.rect(x0, y0, wBox, hBox, A(wr, 0.6), 2.2);
    var px = x0 + 60 + ((t * 180) % (wBox - 120)), py = y0 + hBox / 2 + Math.sin(t * 3.4) * (hBox / 2 - 60);
    var bx = x0 + 60 + (Math.abs(((t * 180) % (2 * (wBox - 120))) - (wBox - 120)));
    D.circle(bx, py, 14, WARM(0.95));
    for (var i = 0; i < 5; i++) {
      D.circle(bx, py, 20 + i * 26 * EM.saw(t * 0.6 + i * 0.1), WARM(0.12 * (1 - i / 5)));
    }
    M.barcode(x0 + 8, y0 + hBox + 20, 260, 40, A(wr, 0.5), 3);
    // MV 里这一句时它是满屏的 TRAPPED + 三行锁对象/重启——
    // 这里用本片的字体和配色照样打出来
    for (var w2 = 0; w2 < 4; w2++) {
      D.mono('TRAPPEDTRAPPEDTRAPPEDTRAPPEDTRAPPED'.slice(0, 12 + w2 * 6), x0 + 8, y0 + hBox + 78 + w2 * 20, 15, A(wr, 0.30 - w2 * 0.05));
    }
    D.mono('> Lock object (me)', x0 + 8, y0 + hBox + 170, 15, A(wr, 0.75));
    D.mono('> Lock object (you)', x0 + 190, y0 + hBox + 170, 15, A(wr, 0.75));
    D.mono('> Restart simulation...', x0 + 8, y0 + hBox + 192, 15, A(wr, 0.55));
    M.lyric(cue.text, LINE + 120, 190, 32, INK(wr, 0.95), p, {});
  });

  S.def('s044', { name: 'In this strange, strange' }, function (p, cue, t, wr) {
    var x0 = LINE + 120, y0 = 200, w = W - LINE - 260, h = 500;
    for (var i = 0; i < 4; i++) {
      var off = Math.sin(t * 1.4 + i * 1.1) * 18 * EM.clamp(p * 2, 0, 1);
      var a = 0.5 - i * 0.11;
      D.rect(x0 + off, y0 + off * 0.4, w, h, A(wr, Math.max(0.05, a)), 1.4);
    }
    for (var q = 0; q < 26; q++) {
      var yy = y0 + EM.h(q, 3, (t * 2) | 0) * h;
      var ww = 40 + EM.h(q, 4, (t * 2) | 0) * 260;
      var xx = x0 + EM.h(q, 5, (t * 2) | 0) * (w - ww);
      D.rect(xx, yy, ww, 3 + 10 * EM.h(q, 6, (t | 0)), A(wr, 0.12 + 0.22 * EM.h(q, 7, (t | 0))));
    }
    M.head('STRANGE', x0 + w / 2, y0 + h / 2 + 30, 78, INK(wr, 1), { align: 'center', weight: 'bold', track: 6 });
    M.lyric(cue.text, x0, 170, 26, INK(wr, 0.85), p, {});
  });

})(typeof window !== 'undefined' ? window : globalThis);
