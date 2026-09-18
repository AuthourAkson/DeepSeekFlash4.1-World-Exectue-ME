/* ============================================================================
 * 43_scenes_svg.js — 按参考图重绘的 SVG 画板
 * ----------------------------------------------------------------------------
 * image/ 里那 7 张参考图是同一个视觉语言：
 *   暗场 + 颗粒/扫描线 + 一个描边框住的面板 + 面板里一张**网点（halftone）**
 *   印出来的单色插图 + 底下一行字幕。
 * 这一段把对应的歌词按这个语言重画，但用真 SVG 做：
 *   · 插图是扫描线切片 + <pattern> 网点，从下往上"印"出来
 *   · 轮廓用 stroke-dashoffset 自绘
 *   · 边框带角标，颗粒/扫描线是 (索引, t) 的确定性哈希
 *   · 一切仍然只是 (p, cue, t, 世界状态) 的纯函数
 *
 * 文件名 → 画板：eggplant→s046 · tomato→s049 · antioxidents→s051 ·
 * TabbyCat→s052 · Then-I-Will-Purr-For→s053 · If-im-the-only-god→s055 ·
 * Proof-of-my-existence→s056（＋s057 EXISTENCE 收尾）
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, S = WX.S, V = WX.SVG, W = WX.W, H = WX.H;
  var VEC = WX.VECTORS;
  var CX = W / 2;

  /* 参考图里那块面板的尺寸（1600×900 舞台上） */
  var P = { x: 372, y: 150, w: 856, h: 600 };
  var PAPER = [238, 238, 234];          // 印刷用的"纸白"
  var INK = [232, 240, 246];            // 线条用的近白

  function ink(a) { return EM.withA(INK, a === undefined ? 1 : a); }
  function paper(a) { return EM.withA(PAPER, a === undefined ? 1 : a); }
  function A(wr, a) { return EM.withA(wr.accent, a === undefined ? 1 : a); }

  /** 整幅的颗粒与扫描线：参考图的"底噪"。 */
  function field(t, wr, amt) {
    var pu = EM.pulse(t, 0.30);
    V.grain(P.x - 40, P.y - 40, P.w + 80, P.h + 80, 17, t, (0.55 + 0.5 * pu) * (amt === undefined ? 1 : amt), INK);
  }

  /** 面板 + 四角标。progress 让它自己"画"出来。 */
  function panel(p, colour, fill) {
    V.panel(P.x, P.y, P.w, P.h, colour, p, { progress: EM.clamp(p * 1.7, 0, 1), sw: 2.4, fill: fill });
  }

  /** 字幕：面板下面那行字（画在暗场上，天然满足对比度下限）。 */
  function caption(cue, p, y, size, mono) {
    y = y || P.y + P.h + 52;
    V.text(cue.text, P.x + 6, y, size || 30, INK, { align: 'left', mono: mono !== false, alpha: EM.clamp(p * 2.2, 0.15, 1) });
    V.line(P.x + 6, y + 12, P.x + 6 + 120 + 500 * EM.clamp(p * 1.4, 0, 1), y + 12, { stroke: ink(0.35), sw: 1.4 });
  }

  /** 小标签（面板左上角，机器读数）。 */
  function tag(label, p) {
    V.text(label, P.x + 18, P.y + 34, 15, INK, { mono: true, alpha: 0.55 * EM.clamp(p * 2, 0.2, 1) });
    V.line(P.x + 18, P.y + 42, P.x + 18 + 220 * EM.clamp(p * 1.6, 0, 1), P.y + 42, { stroke: ink(0.3), sw: 1.2 });
  }

  /** 直接把内嵌矢量素材当"白墨剪影"印到面板上（下载素材的原始几何，不改绘）。 */
  function vectorInk(id, box, p, speed) {
    var grow = EM.clamp(p * (speed || 1.5), 0, 1);
    VEC.draw(id, V, box, { fill: ink(0.10 + 0.84 * grow), stroke: ink(0.28 + 0.55 * grow), sw: 1.5 });
    if (grow > 0.06) VEC.draw(id, V, box, { fill: EM.withA(INK, 0.10 * grow) });
  }

  /** 矢量画板：暗面板 + 原样矢量 + 标签/字幕。extra 可再加局部动画。 */
  function vectorScene(id, p, cue, t, wr, label, rightText, extra) {
    field(t, wr, 0.85);
    panel(p, ink(0.8));
    var box = { x: P.x + 156, y: P.y + 72, w: P.w - 312, h: P.h - 168 };
    vectorInk(id, box, p);
    tag(label, p);
    if (rightText) V.text(rightText, P.x + P.w - 18, P.y + 34, 15, WX.WORLD.ink(wr, 0.7), { mono: true, align: 'right' });
    if (extra) extra();
    caption(cue, p, P.y + P.h + 56, 30);
  }

  /* ------------------------------------------------- If I'm an eggplant */
  /* 用户下载的 eggplant.svg 原样绘制：白墨剪影 + 淡叠印。 */
  S.def('s046', { name: "If I'm an eggplant", svg: true }, function (p, cue, t, wr) {
    vectorScene('eggplant', p, cue, t, wr, 'SOLANUM  MELONGENA', null, null);
  });

  /* ---------------------------------------------------- If I'm a tomato */
  /* 用户下载的 tomato.svg 原样绘制。 */
  S.def('s049', { name: "If I'm a tomato", svg: true }, function (p, cue, t, wr) {
    vectorScene('tomato', p, cue, t, wr, 'LYCOPERSICUM', EM.clamp(p * 2.6, 0, 1) > 0.9 ? 'ripe' : 'growing…', null);
  });

  /* ----------------------------------------------------- ANTIOXIDANTS */
  /* 参考图：一个粗环（六边形分子），中间是空的；环外有游离基 */
  S.def('s051', { name: 'ANTIOXIDANTS', svg: true }, function (p, cue, t, wr) {
    field(t, wr, 1);
    panel(p, ink(0.8));
    var cx = P.x + P.w * 0.5, cy = P.y + P.h * 0.52, R = 172;
    var ring = [], hole = [];
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * EM.TAU - Math.PI / 2;
      ring.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
      hole.push([cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62]);
    }
    var grow = EM.clamp(p * 1.6, 0, 1);
    V.outline([ring], { stroke: ink(0.9), sw: 3 }, grow);
    V.outline([hole], { stroke: ink(0.5), sw: 2 }, grow);
    for (var k = 0; k < 6; k++) {                        // 六条边：网点填充
      var q0 = ring[k], q1 = ring[(k + 1) % 6], h0 = hole[k], h1 = hole[(k + 1) % 6];
      V.poly([q0, q1, h1, h0], { fill: EM.withA([210, 216, 214], 0.08) });
      V.halftone([[q0, q1, h1, h0]], {
        pattern: 'b50', band: 7, colour: INK, alpha: 0.9,
        wipe: EM.clamp((p - 0.2 - k * 0.06) / 0.45, 0, 1)
      });
    }
    // 轨道上的电子
    for (var e = 0; e < 3; e++) {
      var ea = t * (1.1 + e * 0.35) + e * 2.1;
      V.circle(cx + Math.cos(ea) * (R + 92), cy + Math.sin(ea) * (R + 92) * 0.62, 7,
        { fill: A(wr, 0.55), stroke: ink(0.8), sw: 1.4 });
    }
    // 游离基 → 被中和
    for (var r = 0; r < 10; r++) {
      var ra = EM.h(r, 5, 0) * EM.TAU, rr = R + 120 + EM.h(r, 6, 0) * 130;
      var px = cx + Math.cos(ra) * rr, py = cy + Math.sin(ra) * rr * 0.62;
      var known = EM.clamp(p * 1.4 - EM.h(r, 7, 0) * 0.5, 0, 1);
      V.circle(px, py, 9, { stroke: known > 0.6 ? A(wr, 0.9) : EM.withA(EM.PAL.heat, 0.85), sw: 2.2 });
      V.line(px - 5, py - 5, px + 5, py + 5, { stroke: known > 0.6 ? A(wr, 0.9) : EM.withA(EM.PAL.heat, 0.85), sw: 2 });
      V.line(px + 5, py - 5, px - 5, py + 5, { stroke: known > 0.6 ? A(wr, 0.9) : EM.withA(EM.PAL.heat, 0.85), sw: 2 });
    }
    V.text('ANTIOXIDANTS', cx, P.y + P.h - 34, 46, INK, { align: 'center', weight: 'bold', tracking: 3, alpha: EM.clamp(p * 1.8, 0.2, 1) });
    tag('FREE  RADICAL  SCAVENGING', p);
    caption(cue, p, P.y + P.h + 56, 28);
  });

  /* ------------------------------------------------- If I'm a tabby cat */
  /* 用户下载的 cat-sit.svg：坐着的第一张猫。 */
  S.def('s052', { name: "If I'm a tabby cat", svg: true }, function (p, cue, t, wr) {
    vectorScene('catSit', p, cue, t, wr, 'FELIS  CATUS  ·  TABBY', 'purr  pending…', null);
  });

  /* ------------------------------------------- Then I will purr for your */
  /* 用户下载的 cat-walk.svg：第二张，站起/走动的猫；底部一条呼噜振纹。 */
  S.def('s053', { name: 'Then I will purr for your', svg: true }, function (p, cue, t, wr) {
    vectorScene('catWalk', p, cue, t, wr, 'PURR  MONITOR', '25 Hz', function () {
      var pu = EM.pulse(t, 0.22);
      var y0 = P.y + P.h - 88, pts = [];
      for (var i = 0; i <= 80; i++) {
        var u = i / 80, x = P.x + 140 + u * (P.w - 280);
        pts.push([x, y0 - Math.sin(u * 22 + t * 10) * (4 + 20 * pu) * Math.sin(u * Math.PI)]);
      }
      V.poly(pts, { stroke: A(wr, 0.85), sw: 2.0 }, false);
      V.poly(pts.map(function (q) { return [q[0], q[1] + 9]; }), { stroke: ink(0.22), sw: 1.1 }, false);
    });
  });

  /* ------------------------------------------------ If I'm the only God */
  /* 参考图：一片噪点里的一块暗质量 —— 虚空。前面只有一个极小的自己。 */
  S.def('s055', { name: "If I'm the only God", svg: true }, function (p, cue, t, wr) {
    var pu = EM.pulse(t, 0.35);
    V.grain(P.x - 60, P.y - 60, P.w + 120, P.h + 120, 23, t, 1.5 + 0.8 * pu, INK);
    panel(p, ink(0.7));
    var cx = P.x + P.w * 0.5, cy = P.y + P.h * 0.46;
    var r = 150 + 46 * EM.ease(EM.clamp(p * 1.3, 0, 1));
    // 噪点场（越靠外越亮）
    for (var i = 0; i < 120; i++) {
      var a = EM.h(i, 1, 0) * EM.TAU, rr = 210 + EM.h(i, 2, 0) * 190;
      var v = EM.h(i, 3, (t * 10) | 0);
      if (v < 0.45) continue;
      V.rect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.72, 2 + v * 5, 1.6, { fill: ink(0.06 + 0.16 * v) });
    }
    // 暗质量（负空间）：一圈环 + 实心暗
    V.circle(cx, cy, r, { fill: EM.withA([6, 7, 10], 0.92) });
    V.circle(cx, cy, r, { stroke: ink(0.55 + 0.35 * pu), sw: 2.4 });
    V.circle(cx, cy, r + 16, { stroke: EM.withA(EM.PAL.heat, 0.10 + 0.18 * pu), sw: 1.2 });
    // 光环
    V.drawOn('M' + cx + ' ' + (cy - r - 60) + ' A' + (r + 60) + ' ' + (r + 60) * 0.72 + ' 0 0 1 ' + cx + ' ' + (cy + r + 60),
      { stroke: ink(0.28), sw: 1.6 }, EM.clamp((p - 0.2) / 0.6, 0, 1));
    // 唯一的自己
    var me = P.y + P.h * 0.86, mx = cx;
    V.line(mx, me - 44, mx, me - 16, { stroke: ink(0.9), sw: 3 });
    V.circle(mx, me - 52, 8, { stroke: ink(0.9), sw: 2.4 });
    V.line(mx, me - 34, mx - 14, me, { stroke: ink(0.9), sw: 3 });
    V.line(mx, me - 34, mx + 14, me, { stroke: ink(0.9), sw: 3 });
    V.circle(mx, me - 66, 4 + 8 * EM.hit(t, 0.5), { fill: ink(0.9) });
    V.text('only  God', P.x + P.w - 18, P.y + 34, 15, WX.WORLD.ink(wr, 0.7), { mono: true, align: 'right' });
    tag('ONE  OF  ONE', p);
    caption(cue, p, P.y + P.h + 56, 30);
  });

  /* ---------------------------- Then you're the proof of my / EXISTENCE */
  function heartScene(p, cue, t, wr, word, size) {
    var pu = EM.pulse(t, 0.26), hit = EM.hit(t, 0.2);
    V.grain(P.x - 70, P.y - 70, P.w + 140, P.h + 140, 31, t, 1.2 + 1.0 * pu, INK);
    panel(p, ink(0.75));
    var cx = P.x + P.w * 0.5, cy = P.y + P.h * 0.50;
    var beat = 1 + 0.055 * hit + 0.02 * Math.sin(t * 3.1);
    var heart = V.scl(V.heartPoly(0, 0, 230, 72), 0, 0, beat);
    heart = V.move(heart, cx, cy + 10);
    var grow = EM.clamp(p * 1.5, 0, 1);
    V.outline([heart], { stroke: ink(0.9), sw: 2.6 }, grow);
    V.poly(heart, { fill: EM.withA([214, 214, 210], 0.09 * EM.clamp((p - 0.1) / 0.6, 0, 1)) });
    V.halftone([heart], {
      pattern: 'b50', band: 8, colour: INK, alpha: 0.85,
      wipe: EM.clamp((p - 0.1) / 0.6, 0, 1), jitter: 1.6
    });
    // 心跳线
    var pts = [];
    for (var i = 0; i <= 110; i++) {
      var u = i / 110, x = P.x + 90 + u * (P.w - 180);
      var spike = Math.pow(Math.max(0, Math.sin(u * Math.PI * 5 - t * 2.4)), 8);
      pts.push([x, P.y + P.h - 120 - spike * (70 + 90 * pu)]);
    }
    V.poly(pts, { stroke: A(wr, 0.8), sw: 2.4 }, false);
    if (word) V.text(word, cx, P.y + P.h - 40, size || 44, INK, { align: 'center', weight: 'bold', tracking: 6, alpha: EM.clamp(p * 1.9, 0.2, 1) });
    tag('exists(self) == true', p);
    caption(cue, p, P.y + P.h + 56, 30);
  }

  S.def('s056', { name: "Then you're the proof of my", svg: true }, function (p, cue, t, wr) {
    heartScene(p, cue, t, wr, 'PROOF', 40);
  });

  S.def('s057', { name: 'EXISTENCE', svg: true }, function (p, cue, t, wr) {
    heartScene(p, cue, t, wr, 'EXISTENCE', 46);
    // 收尾：这一颗心不熄灭
    var cx = P.x + P.w * 0.5, cy = P.y + P.h * 0.50;
    var a = 0.25 * (1 - EM.ease(EM.clamp(p * 1.2, 0, 1)) * 0.5) + 0.2 * EM.hit(t, 0.4);
    V.circle(cx, cy + 10, 300, { fill: EM.withA(EM.PAL.warm, a * 0.25) });
  });

})(typeof window !== 'undefined' ? window : globalThis);
