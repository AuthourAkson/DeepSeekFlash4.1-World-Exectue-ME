/* ============================================================================
 * 30_world_layer.js — 持续世界
 * ----------------------------------------------------------------------------
 * 从第 0 秒活到第 211.984 秒的那一层。它不是任何一句歌词的插图，
 * 而是"这台机器的显示系统"本身：网格 → 球 → 波 → 有机 → 乱麻 → 开环，
 * 由世界参数 topo 连续形变；再叠上音高尺、脉冲环、裂缝、代码雨、HUD。
 *
 * 全部由 t 决定；没有一处累积状态。往回拖进度条不会花屏。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, M = WX.D.m;
  var W = WX.W, H = WX.H;

  var WL = WX.WL = {};

  /* ------------------------------------------------------------- 拓扑场几何 */

  var NN = 150;                      // 节点数（固定，保证画面与性能都可预期）
  var NX = 15, NY = 10;
  var PX = [], PY = [];             // 每个节点的"逻辑格"坐标（-1..1）
  var SPH = [];                      // 单位球上的位置
  var NBR = [];                      // 邻居表
  var CX = W / 2, CY = H / 2 - 20, RX = 560, RY = 300;

  (function init() {
    var i, j;
    for (i = 0; i < NN; i++) {
      var gx = i % NX, gy = (i / NX) | 0;
      var u = NX === 1 ? 0 : gx / (NX - 1), v = NY === 1 ? 0 : gy / (NY - 1);
      PX.push((u - 0.5) * 2);
      PY.push((v - 0.5) * 2);
    }
    var ga = Math.PI * (3 - Math.sqrt(5));
    for (i = 0; i < NN; i++) {
      var y = 1 - (i / (NN - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = ga * i;
      SPH.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    for (i = 0; i < NN; i++) {
      j = [];
      var gx2 = i % NX, gy2 = (i / NX) | 0;
      if (gx2 > 0) j.push(i - 1);
      if (gx2 < NX - 1) j.push(i + 1);
      if (gy2 > 0) j.push(i - NX);
      if (gy2 < NY - 1) j.push(i + NX);
      if (gx2 > 0 && gy2 > 0) j.push(i - NX - 1);
      if (gx2 < NX - 1 && gy2 < NY - 1) j.push(i + NX + 1);
      NBR.push(j);
    }
  })();

  var nx = new Float32Array(NN), ny = new Float32Array(NN), nz = new Float32Array(NN);

  function modePos(i, mode, t, out) {
    var u = PX[i], v = PY[i], a, b, r, th;
    if (mode <= 0.0001) {                        // grid
      out[0] = CX + u * RX * 0.92; out[1] = CY + v * RY * 0.92; out[2] = 0;
    } else if (mode <= 1.0001) {                 // sphere
      a = SPH[i]; th = t * 0.33;
      var ca = Math.cos(th), sa = Math.sin(th);
      var X = a[0] * ca - a[2] * sa, Z = a[0] * sa + a[2] * ca;
      out[0] = CX + X * 330; out[1] = CY + a[1] * 300; out[2] = Z;
    } else if (mode <= 2.0001) {                 // wave
      var ph = u * 3.4 + t * 1.1;
      out[0] = CX + u * RX; out[1] = CY + v * RY * 0.55 + Math.sin(ph) * 88; out[2] = Math.cos(ph);
    } else if (mode <= 3.0001) {                 // organic
      r = 1 + 0.34 * (EM.fbm(u * 1.6 + t * 0.12, v * 1.6 - t * 0.07, 11, 4) - 0.5) * 2;
      out[0] = CX + u * RX * 0.72 * r; out[1] = CY + v * RY * 0.78 * r; out[2] = r - 1;
    } else if (mode <= 4.0001) {                 // tangle
      var d1 = EM.fbm(u * 2.2 + t * 0.09, v * 2.2, 23, 4) - 0.5;
      var d2 = EM.fbm(u * 2.4, v * 2.4 - t * 0.11, 31, 3) - 0.5;
      out[0] = CX + u * RX * 0.68 + d1 * 260; out[1] = CY + v * RY * 0.68 + d2 * 210; out[2] = d1;
    } else {                                     // open —— 打开、松开、暖
      a = SPH[i]; th = t * 0.18;
      var k = EM.clamp(mode - 5, 0, 1);
      var rad = 300 + k * 190;
      var gap = 0.55 * k;
      var ang = Math.atan2(a[1], a[0]) + th * 0.4;
      var open = 1 - gap * Math.abs(Math.cos(ang * 0.5));
      out[0] = CX + Math.cos(ang) * rad * open * (1 + a[2] * 0.25);
      out[1] = CY + Math.sin(ang) * rad * 0.66 * open;
      out[2] = a[2];
    }
  }

  var tmpA = [0, 0, 0], tmpB = [0, 0, 0];

  /** 计算本帧的拓扑场坐标（含两档形态之间的连续形变）。 */
  function buildField(t, w) {
    var m = EM.clamp(w.topo, 0, 6);
    var m0 = Math.floor(m), f = m - m0, m1 = Math.min(6, m0 + 1);
    for (var i = 0; i < NN; i++) {
      modePos(i, m0, t, tmpA);
      modePos(i, m1, t, tmpB);
      nx[i] = tmpA[0] + (tmpB[0] - tmpA[0]) * f;
      ny[i] = tmpA[1] + (tmpB[1] - tmpA[1]) * f;
      nz[i] = tmpA[2] + (tmpB[2] - tmpA[2]) * f;
    }
  }

  /* ------------------------------------------------------------------ 背景 */

  WL.backdrop = function (t, w) {
    var ctx = D.ctx;
    var bg = w.bg;
    D.setBg(bg);
    var g = D.linear(0, 0, W, H, [[0, EM.mix(bg, [255, 255, 255], 0.05)], [0.55, bg], [1, EM.mix(bg, [0, 0, 0], 0.55)]]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    D.S.calls++;
    // 屏幕中部的辉光：随音乐脉冲
    var pu = EM.pulse(t, 0.30);
    var glow = EM.mix(w.accent, [255, 255, 255], 0.25);
    var rg = D.radial(CX, CY - 30, 40, 760, [
      [0, EM.withA(glow, 0.055 + 0.10 * Math.min(1, pu))],
      [0.55, EM.withA(glow, 0.02)],
      [1, EM.withA(glow, 0)]
    ]);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    D.S.calls++;
    // 暗角
    var vg = D.radial(W / 2, H / 2, 280, 900, [[0, [0, 0, 0, 0]], [1, [0, 0, 0, 0.66]]]);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    D.S.calls++;

    // 底层网格：世界越"守规矩"，网格越清楚
    if (w.struct > 0.05) {
      var sp = 64, al = 0.028 + 0.075 * w.struct, i;
      var jit = w.chaos * 26;
      var gm = EM.withA(w.accent, al * 0.75);
      for (i = 1; i < W / sp; i++) {
        var x = i * sp + (EM.h(i, 91, (t * 2) | 0) - 0.5) * jit;
        D.seg(x, 0, x, H, i % 4 === 0 ? gm : EM.withA(gm, al * 0.4), i % 4 === 0 ? 1.1 : 0.7);
      }
      for (i = 1; i < H / sp; i++) {
        var y = i * sp + (EM.h(71, i, (t * 2) | 0) - 0.5) * jit;
        D.seg(0, y, W, y, i % 4 === 0 ? gm : EM.withA(gm, al * 0.4), i % 4 === 0 ? 1.1 : 0.7);
      }
    }
  };

  /* -------------------------------------------------------------- 拓扑场绘制 */

  WL.field = function (t, w) {
    buildField(t, w);
    var i, j, k;
    var accent = w.accent;
    // 注意：这两个必须是**数字**（透明度），不是颜色数组 ——
    // 早先这里写成 EM.withA(...) 再拿去做乘法，alpha 全变成 NaN，
    // 而浏览器遇到非法颜色会静默沿用上一个颜色，画面错了却不报错。
    var linkA = 0.05 + 0.13 * (1 - w.struct) + 0.05 * w.chaos;
    var nodeA = 0.30 + 0.45 * w.struct;
    var maxLinks = 210 + Math.round(w.chaos * 190);
    var links = 0;
    var reach = 210 + w.chaos * 90;

    for (i = 0; i < NN && links < maxLinks; i++) {
      var nb = NBR[i];
      for (k = 0; k < nb.length && links < maxLinks; k++) {
        j = nb[k];
        if (j < i) continue;
        var dx = nx[i] - nx[j], dy = ny[i] - ny[j];
        var d = Math.sqrt(dx * dx + dy * dy);
        var lim = w.topo > 3 ? reach : 260;
        if (d > lim) continue;
        var a = linkA * (1 - d / lim) * (0.5 + 0.5 * nz[i] + 0.5);
        D.seg(nx[i], ny[i], nx[j], ny[j], EM.withA(accent, a), 0.8 + w.struct * 0.9);
        links++;
      }
    }
    // 乱麻/开环阶段：再多连一些远距离的线，世界开始不讲道理
    if (w.topo > 3.4) {
      var extra = Math.round(90 * EM.clamp(w.topo - 3.4, 0, 2));
      for (i = 0; i < extra; i++) {
        var a1 = (EM.h(i, 5, (t * 0.5) | 0) * NN) | 0;
        var a2 = (EM.h(i, 9, (t * 0.5) | 0) * NN) | 0;
        D.seg(nx[a1], ny[a1], nx[a2], ny[a2], EM.withA(w.warm > 0.5 ? EM.PAL.warm : accent, 0.05 + 0.05 * w.chaos), 0.7);
      }
    }
    // 节点
    for (i = 0; i < NN; i++) {
      var s = (1.4 + 1.9 * (0.5 + 0.5 * nz[i])) * (0.35 + 0.65 * w.struct) * (1 + 0.5 * EM.hit(t - EM.h(i, 3, 1) * 0.4, 0.12));
      var col = w.warm > 0.45 && (i % 7 === 0) ? EM.withA(EM.PAL.warm, nodeA) : EM.withA(accent, nodeA);
      D.circle(nx[i], ny[i], Math.max(0.6, s), col);
    }
    D.S.labels.fieldNodes = NN;
  };

  /* ------------------------------------------------------------------ 音高尺 */

  /** 画面左侧：把 EM.ONSETS 这张真实的音符表实时画出来。 */
  WL.pitchRuler = function (t, w) {
    var X0 = 62, X1 = 214, Y0 = 150, Y1 = 760;
    var lo = EM.PITCH_LO - 1, hi = EM.PITCH_HI + 1, span = hi - lo;
    function py(p) { return Y1 - (p - lo) / span * (Y1 - Y0); }
    var accent = w.accent;
    var dim = EM.withA(accent, 0.18);
    D.seg(X1, Y0 - 14, X1, Y1 + 14, dim, 1);
    var p;
    for (p = lo; p <= hi; p++) {
      var big = p % 12 === 0;
      D.seg(X1 - (big ? 16 : 8), py(p), X1, py(p), big ? EM.withA(accent, 0.4) : EM.withA(accent, 0.16), big ? 1.4 : 1);
    }
    // 过去 6 秒的真实音符：从右往左退去
    var win = 6;
    var i0 = EM.indexAt(t - win), i1 = EM.indexAt(t);
    if (i0 < 0) i0 = 0;
    for (var i = i0; i <= i1; i++) {
      var age = t - EM.t0[i];
      if (age > win) continue;
      var x = X1 - age / win * (X1 - X0);
      var y = py(EM.pitch[i]);
      var k = 1 - age / win;
      D.seg(x - 9 - 12 * k, y, x + 4, y, EM.withA(accent, 0.10 + 0.55 * k * EM.accent[i]), 1.2 + 2.2 * k);
      D.circle(x, y, 1.2 + 2.6 * k * EM.accent[i], EM.withA(accent, 0.25 + 0.6 * k));
    }
    // 当前音高：一条指向舞台的水平线
    var cur = EM.pitchAt(t);
    D.seg(X1, py(cur), X1 + 46 + 30 * EM.hit(t, 0.2), py(cur), EM.withA(accent, 0.5), 1.6);
    D.mono(EM.PITCH_NAMES ? EM.PITCH_NAMES[cur] : ('MIDI ' + cur), X1 + 52, py(cur) - 8, 12, EM.withA(w.accent, 0.75));
    D.mono('PITCH', X0, Y0 - 34, 11, EM.withA(accent, 0.55), { tracking: 2 });
  };

  /* ------------------------------------------------------ 脉冲环 / 裂缝 / 雨 */

  WL.pulses = function (t, w) {
    var rec = EM.recent(t, 1.15, 16), i;
    for (i = 0; i < rec.length; i++) {
      var r = rec[i], age = r.age;
      var rad = 90 + age * 520;
      var a = (1 - age / 1.15) * 0.20 * (0.4 + 0.6 * r.accent);
      D.circle(CX, CY - 20, rad, EM.withA(w.accent, a), 1.2 + 2.4 * (1 - age / 1.15));
    }
    // 底部节奏刻度：真实音符的时间位置
    var X0 = 380, X1 = 1520, Y = H - 46, win = 3.4;
    for (i = 0; i < 40; i++) {
      var tt = t - i * (win / 40);
      if (tt < 0) break;
      var hh = 4 + 16 * EM.hit(tt, 0.14);
      var a2 = 0.05 + 0.28 * (1 - i / 40) * EM.hit(tt, 0.3);
      D.seg(X0 + (i / 40) * (X1 - X0), Y, X0 + (i / 40) * (X1 - X0), Y + hh, EM.withA(w.accent, a2), 1.4);
    }
  };

  WL.fracture = function (t, w) {
    if (w.heat < 0.16) return;
    var n = Math.round(w.heat * 13);
    for (var i = 0; i < n; i++) {
      var seed = i * 37;
      var side = (EM.h(i, 1, 0) * 4) | 0;
      var x, y, dx, dy;
      if (side === 0) { x = EM.h(i, 2, 0) * W; y = 0; dx = 0.4; dy = 1; }
      else if (side === 1) { x = EM.h(i, 2, 0) * W; y = H; dx = 0.4; dy = -1; }
      else if (side === 2) { x = 0; y = EM.h(i, 2, 0) * H; dx = 1; dy = 0.4; }
      else { x = W; y = EM.h(i, 2, 0) * H; dx = -1; dy = 0.4; }
      var pts = [[x, y]], len = 40 + EM.h(i, 4, 0) * 120;
      for (var k = 0; k < 7; k++) {
        var step = len * (0.5 + EM.h(i, k, 3) * 0.7);
        x += dx * step + (EM.h(i, k, 5) - 0.5) * 90;
        y += dy * step + (EM.h(i, k, 6) - 0.5) * 90;
        pts.push([x, y]);
      }
      D.line(pts, EM.withA(i % 3 === 0 ? EM.PAL.heat : w.accent, 0.10 + 0.34 * w.heat), 1 + w.heat * 2.4);
    }
  };

  WL.rain = function (t, w) {
    if (w.chaos < 0.32) return;
    var n = Math.round((w.chaos - 0.32) * 70);
    for (var i = 0; i < n; i++) {
      var col = (EM.h(i, 11, 0) * 22) | 0;
      var x = 240 + col * 60;
      var speed = 90 + EM.h(i, 12, 0) * 210;
      var y = ((t * speed + EM.h(i, 13, 0) * 2000) % (H + 220)) - 110;
      var len = 22 + EM.h(i, 14, 0) * 70;
      var a = 0.04 + 0.12 * w.chaos;
      if (y < -len || y > H) continue;                 // 完全在画外的字符雨不必画
      D.seg(x, y, x, y + len, EM.withA(w.accent, a), 1);
      if (y + len < H - 6 && EM.h(i, 15, (t * 3) | 0) > 0.86) {
        D.mono(String.fromCharCode(48 + ((EM.h(i, 16, (t | 0)) * 10) | 0)), x - 5, y + len, 11, EM.withA(w.accent, a * 2.4));
      }
    }
  };

  /* ------------------------------------------------------------------ 前景 */

  /* ------------------------------------------------- MV：闪白 / 硬切 / 噪声
   * 参考 MV 里 7.4% 的帧是**整屏纯白**，中位亮度只有 12/255，切点 139 个。
   * 这一层不做解释，只把它的明暗结构照搬过来：MV 白我就白，MV 黑我就黑。
   */
  WL.mv = function (t, w) {
    if (!w.mvOn || !w.mv) return;
    var mv = w.mv, ctx = D.ctx;
    // 整屏闪白（亮度包络直接当遮罩用）
    if (mv.lum > 0.30) {
      var a = EM.smooth(EM.inv(0.30, 0.85, mv.lum));
      ctx.fillStyle = EM.css([255, 255, 255, a]);
      ctx.fillRect(0, 0, W, H); D.S.calls++;
    }
    // 硬切：剪辑点后 2 帧压一次黑，模拟它的硬切感
    if (mv.sinceCut < 0.07) {
      ctx.fillStyle = EM.css([0, 0, 0, 0.55 * (1 - mv.sinceCut / 0.07)]);
      ctx.fillRect(0, 0, W, H); D.S.calls++;
    }
    // 噪声颗粒：密度跟着 MV 的标准差走
    var n = Math.round(60 + mv.sd * 900);
    for (var i = 0; i < n; i++) {
      var x = EM.h(i, 41, (t * 60) | 0) * W, y = EM.h(i, 42, (t * 60) | 0) * H;
      var v = EM.h(i, 43, (t * 60) | 0);
      D.rect(x, y, 1 + v * 2.6, 1 + v * 1.4, EM.withA([255, 255, 255], 0.05 + 0.20 * v * mv.sd * 3));
    }
    D.S.labels.mvGrain = n;
  };

  /* ------------------------------------- MV 的内容层（用我的画面风格呈现）
   * 参考 MV 是一台"假操作系统的终端"：歌词被当成命令/状态消息敲出来。
   * 这里把 _tools 用 OCR 从它屏幕上读到的原文照样打出来 ——
   * 但用的是本片的语言：细青线、等宽字、角标、光标，不是它的纯灰闪白。
   */
  WL.mvText = function (t, w) {
    var MV = WX.MV;
    if (!MV || !MV.textAt) return;
    var cur = MV.textAt(t);
    if (!cur) return;
    // MV 的终端是"越打越长"的：把最近几条一起留在屏幕上，最新的那条正在打
    var log = [];
    for (var i = 0; i < MV.TEXT.length; i++) {
      var e = MV.TEXT[i];
      if (e[0] <= t - 0.02 && t - e[0] < 6.5) log.push(e);
    }
    log = log.slice(-3);
    if (!log.length) return;
    var accent = w.accent;
    var seed = Math.round(log[0][0] * 7);
    var right = EM.h(seed, 71, 0) > 0.5;
    var px = right ? 880 + EM.h(seed, 72, 0) * 110 : 250;
    var py = right ? 92 + EM.h(seed, 73, 0) * 36 : 600 + EM.h(seed, 74, 0) * 56;
    var rows = [];
    var newest = log[log.length - 1];
    for (var k = 0; k < log.length; k++) {
      var lns = wrap(log[k][1], 52);
      for (var q = 0; q < lns.length && rows.length < 5; q++) {
        rows.push({ s: lns[q], last: (k === log.length - 1) && q === lns.length - 1, age: t - log[k][0] });
      }
    }
    var pw = 470, ph = 46 + rows.length * 24;
    var appear = EM.smooth(EM.clamp((t - newest[0]) / 0.15, 0, 1));
    var fade = 1 - EM.smooth(EM.clamp((cur.age - 5.0) / 1.5, 0, 1));
    D.save();
    D.am(appear * fade);
    M.panel(px, py, pw, ph, 'mv.terminal', accent, { a: 0.9 });
    var revealed = EM.clamp((t - newest[0]) / 1.4, 0, 1);
    for (var r2 = 0; r2 < rows.length; r2++) {
      var row = rows[r2];
      var txt = row.s;
      if (row.last) txt = row.s.slice(0, Math.max(1, Math.round(row.s.length * revealed)));
      var a = row.age < 0.9 ? 0.95 : 0.45;              // 更旧的行淡一些
      D.mono(txt, px + 14, py + 44 + r2 * 24, 16, EM.withA(accent, a));
    }
    var lastRow = rows[rows.length - 1];
    if (revealed < 1) {
      M.caret(px + 14 + D.measure(lastRow.s.slice(0, Math.max(1, Math.round(lastRow.s.length * revealed))), 16, true),
        py + 44 + (rows.length - 1) * 24, 16, EM.withA(accent, 0.9), t);
    }
    D.restore();
  };

  function wrap(s, n) {
    var out = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      cur += s[i];
      if (cur.length >= n) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out.slice(0, 3);
  }

  /** MV 的剪辑脉冲：它整屏闪白/硬切的地方，我这边给一下本片风格的冲击。
   *  不改成灰白屏 —— 保留本片的配色与线条，只借它的节奏。 */
  WL.mvBeat = function (t, w) {
    var MV = WX.MV;
    if (!MV || !MV.ON === 'never') return;
    if (!MV.STRUCT) return;
    var mv = w.mv;
    if (!mv) return;
    var accent = w.accent;
    // 闪白时刻：短促的整屏加光 + 一道横扫
    if (mv.lum > 0.45) {
      var k = EM.smooth(EM.inv(0.45, 0.95, mv.lum));
      D.ctx.fillStyle = EM.css(EM.withA([255, 255, 255], 0.05 + 0.16 * k));
      D.ctx.fillRect(0, 0, W, H); D.S.calls++;
      D.seg(0, H * 0.5 - 40 * k, W, H * 0.5 + 40 * k, EM.withA(accent, 0.20 * k), 2 + 6 * k);
    }
    // 硬切：切点后 120 ms 内的横向错位条
    if (mv.sinceCut < 0.12) {
      var s0 = 1 - mv.sinceCut / 0.12;
      for (var i = 0; i < 5; i++) {
        var y = EM.h(i, 81, Math.round(mv.cut * 30)) * H;
        D.rect(0, y, W, 2 + 8 * s0, EM.withA(accent, 0.05 + 0.14 * s0));
      }
    }
  };

  WL.hud = function (t, w, info) {
    var accent = w.accent;
    var pad = 34;
    D.bracket(pad, pad, W - pad * 2, H - pad * 2, 26, EM.withA(accent, 0.18), 1.2);
    // 顶部：整首歌的进度 + 131 条歌词刻度
    var X0 = pad + 10, X1 = W - pad - 10, Y = pad + 16;
    D.seg(X0, Y, X1, Y, EM.withA(accent, 0.18), 1.2);
    var C = WX.CUES, i;
    for (i = 0; i < C.length; i++) {
      var px = X0 + (C[i].t / EM.AUDIO_END) * (X1 - X0);
      var big = C[i].text && C[i].text === C[i].text.toUpperCase() && C[i].text.length > 2;
      D.seg(px, Y - (big ? 7 : 3), px, Y + (big ? 7 : 3), EM.withA(accent, big ? 0.5 : 0.22), big ? 1.4 : 0.9);
    }
    var ph = X0 + (t / EM.AUDIO_END) * (X1 - X0);
    D.seg(ph, Y - 12, ph, Y + 12, EM.withA(w.accent, 0.85), 2);
    D.circle(ph, Y, 3.4, EM.withA([255, 255, 255], 0.8));

    // 底部：615 个真实音符的轮廓线（整首歌的形状）
    var BX0 = 380, BX1 = W - 60, BY = H - 78, BH = 44;
    D.seg(BX0, BY + BH, BX1, BY + BH, EM.withA(accent, 0.20), 1);
    for (i = 0; i < EM.N; i += 2) {
      var x = BX0 + (EM.t0[i] / EM.AUDIO_END) * (BX1 - BX0);
      var u = (EM.pitch[i] - EM.PITCH_LO) / Math.max(1, EM.PITCH_HI - EM.PITCH_LO);
      var y = BY + (1 - u) * BH;
      D.seg(x, BY + BH, x, y, EM.withA(accent, 0.06 + 0.16 * EM.accent[i]), 0.8);
    }
    D.seg(ph, BY - 4, ph, BY + BH + 4, EM.withA([255, 255, 255], 0.45), 1);

    // 左下角：机器自报家门
    D.mono('world.execute(me);', 62, H - 70, 13, EM.withA(accent, 0.5), { tracking: 1 });
    D.mono('t = audio.currentTime  ·  ' + t.toFixed(3) + ' / ' + EM.AUDIO_END.toFixed(3) + ' s', 62, H - 50, 12, EM.withA(accent, 0.34));
    if (info) {
      D.mono(info, 62, H - 30, 12, EM.withA(accent, 0.28));
    }
    D.mono((w.mvOn ? 'MV REF  ·  ' : '') + '130 BPM · 615 notes · ' + C.length + ' cues', W - 60, H - 50, 12, EM.withA(accent, 0.32), { align: 'right' });
    D.mono(WORLD_TIME(t), W - 60, H - 30, 12, EM.withA(accent, 0.32), { align: 'right' });
  };

  function WORLD_TIME(t) {
    var m = Math.floor(t / 60), s = t - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }
  WL.timecode = WORLD_TIME;

  /** 在画板**下面**画。 */
  WL.under = function (t, w) {
    if (WX.GAUGE && WX.GAUGE.backdrop) WX.GAUGE.backdrop(t);   // 仪表盘那一段的深蓝底
    WL.backdrop(t, w);
    WL.field(t, w);
    WL.rain(t, w);
    WL.pulses(t, w);
    WL.fracture(t, w);
    WL.pitchRuler(t, w);
  };

  /** 在画板**上面**画（HUD 与少量前景颗粒）。 */
  WL.over = function (t, w, info) {
    WL.mv(t, w);          // 只有 MV 模式（M 键）才会压成纯灰 + 闪白
    WL.mvBeat(t, w);      // 参考 MV 的剪辑节奏（保持本片配色）
    WL.mvText(t, w);      // 参考 MV 屏幕上真实出现过的文字
    if (WX.GAUGE && WX.GAUGE.updateImages) WX.GAUGE.updateImages(t);   // To F, to M 的两张透明 PNG
    // 少许浮尘，让"显示器"有实体感
    var n = 26;
    for (var i = 0; i < n; i++) {
      var x = ((EM.h(i, 21, 0) * W + t * (6 + EM.h(i, 22, 0) * 22)) % W);
      var y = (EM.h(i, 23, 0) * H + t * (3 + EM.h(i, 24, 0) * 11)) % H;
      D.circle(x, y, 0.6 + EM.h(i, 25, 0) * 1.5, EM.withA(w.accent, 0.05 + 0.10 * EM.h(i, 26, (t | 0))));
    }
    WL.hud(t, w, info);
  };

})(typeof window !== 'undefined' ? window : globalThis);
