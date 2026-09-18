/* ============================================================================
 * 07_gauge.js — 性别仪表盘（进片版，按修正后的描述重做）
 * ----------------------------------------------------------------------------
 * 修正后的动画语义（由用户描述）：
 *   · "Switch my gender"：上方 Configuration 弹窗 + 中间 SWITCH MY GENDER 大字
 *     + 左右两个性别符号（描边）
 *   · "To F, to M"：两个符号向中心合并；唱到 F 时**女性符号被填充成白色**，
 *     唱到 M 时**男性符号被填充成白色**
 *   · "And then do whatever"：合并后的符号**变成钟表的指针**，同时周围泛起
 *     同心圆，作为表框
 *   · "From A.M. to P.M."：唱到 AM 指针开始移动，唱到 PM 移动完
 *
 * 几何与颜色仍对齐 gpt-advice/gender_gauge_svg_assets/（#11164A / #F4F4F4 /
 * 符号圆 r58 等），元素全部走本片 SVG 层，严格是时间 t 的纯函数。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM;
  var G = WX.GAUGE = {};

  G.cfg = {
    colors: { bg: [17, 22, 74], ink: [244, 244, 244], dim: [124, 127, 163], sub: [87, 91, 134], badgeText: [32, 35, 58] },
    stage: { w: 1600, h: 900, cx: 800, cy: 450 },
    symbol: { r: 58, stroke: 8, arm: 93, armFrom: 41, filledStroke: 26 },
    intro: {
      badge: { x: 635, y: 335, w: 330, h: 58 },
      title: { x: 800, y: 510, size: 34, track: 13 },
      left: { x: 410, y: 520, s: 0.82 },
      right: { x: 1190, y: 520, s: 0.82 }
    },
    ripples: [70, 120, 190, 270],          // 资产包的同心圆半径
    timeline: {
      intro:  { from: 88.55, to: 88.95 },   // 弹窗 + 标题 + 左右符号
      merge:  { from: 90.00, to: 90.80 },   // 两个符号向中心合并
      Ffill:  { from: 90.461, to: 90.95 },  // 唱到 F：女性符号填充
      Mfill:  { from: 91.385, to: 91.90 },  // 唱到 M：男性符号填充
      ripple: { from: 92.015, to: 92.60 },  // 同心圆泛起成表框
      windup: { from: 92.60, to: 94.154 },  // 指针上弦到 AM 起点（9 点钟）
      sweep:  { from: 94.154, to: 95.077 }, // AM → PM：指针扫过 180°
      hold:   { to: 96.00 }, fadeOut: 0.9
    },
    needle: { startRot: 225, endRot: 45 },  // 合并符号的旋转：225°=箭头指左(AM)，45°=箭头指右(PM)
    font: 'Arial, Helvetica, "Microsoft YaHei", sans-serif'
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function inv(a, b, v) { return clamp((v - a) / (b - a || 1), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** t 时刻的完整状态（纯函数）。 */
  G.state = function (t) {
    var T = G.cfg.timeline, N = G.cfg.needle;
    var s = { t: t, intro: 0, merge: 0, split: 1, fFill: 0, mFill: 0, ripple: 0, needleRot: 0, alpha: 1, phase: 0 };
    s.intro = smooth(inv(T.intro.from, T.intro.to, t));
    s.split = 1 - smooth(inv(T.merge.from, T.merge.to, t));
    s.merge = smooth(inv(T.merge.from, T.merge.to, t));
    s.titleFade = 1 - s.merge;   // 两个符号一结合，Configuration 和 SWITCH MY GENDER 就逐渐消失
    s.fFill = smooth(inv(T.Ffill.from, T.Ffill.to, t));
    s.mFill = smooth(inv(T.Mfill.from, T.Mfill.to, t));
    s.ripple = inv(T.ripple.from, T.ripple.to, t);

    // 指针：上弦（0 → 225°）→ AM→PM 扫描（225° → 45°）→ 保持 45°
    if (t >= T.windup.from) s.needleRot = lerp(0, N.startRot, smooth(inv(T.windup.from, T.windup.to, t)));
    if (t >= T.sweep.from) s.needleRot = lerp(N.startRot, N.endRot, smooth(inv(T.sweep.from, T.sweep.to, t)));
    if (t >= T.sweep.to) s.needleRot = N.endRot;

    s.phase = t < T.merge.from ? 1 : (t < T.Ffill.from ? 2 : (t < T.Mfill.from ? 3 : (t < T.ripple.from ? 4 : (t < T.sweep.from ? 5 : (t < T.sweep.to ? 6 : 7)))));
    var fs = T.hold.to - T.fadeOut;
    if (t > fs) s.alpha = 1 - smooth(inv(fs, T.hold.to, t));
    return s;
  };

  /* ------------------------------------------------------------ 几何/绘制 */
  /** 画一个性别符号。fill 0..1：0 = 描边；1 = 填成白色实心。 */
  /* 性别符号：kind = 'female' | 'male' | 'combined'（全部描边，不填充）。 */
  function drawSymbol(V, cx, cy, k, kind, alpha) {
    var S = G.cfg.symbol, ink = G.cfg.colors.ink;
    var sw = S.stroke * k;
    var col = EM.withA(ink, alpha);
    V.circle(cx, cy, S.r * k, { stroke: col, sw: sw });
    if (kind === 'female' || kind === 'combined') {
      // 女性：左下十字
      V.line(cx - S.armFrom * k, cy + S.armFrom * k, cx - S.arm * k, cy + S.arm * k, { stroke: col, sw: sw });
      V.line(cx - S.arm * k, cy + S.arm * k, cx - (S.arm - 20) * k, cy + (S.arm + 20) * k, { stroke: col, sw: sw });
      V.line(cx - S.arm * k, cy + S.arm * k, cx - (S.arm + 20) * k, cy + (S.arm - 20) * k, { stroke: col, sw: sw });
    }
    if (kind === 'male' || kind === 'combined') {
      // 男性：右上箭头
      V.line(cx + S.armFrom * k, cy - S.armFrom * k, cx + S.arm * k, cy - S.arm * k, { stroke: col, sw: sw });
      V.line(cx + 67 * k, cy - 93 * k, cx + 93 * k, cy - 93 * k, { stroke: col, sw: sw });
      V.line(cx + 93 * k, cy - 93 * k, cx + 93 * k, cy - 67 * k, { stroke: col, sw: sw });
    }
  }

  /* ------------------------------------------------- 透明 PNG 那一段
   * "To F, to M" 这句按用户要求直接用两张图：
   *   FromS.png（歌词 To 时）→ 渐变 → ToM.png（歌词 M 时）
   * 图片是 DOM <img> 叠层（_tools/gauge-probe 会验证它们的透明度），
   * SVG 层这里只负责在图片窗口里垫一点柔光，让两个后端都有内容。 */
  G.img = {
    fromS: 'gpt-advice/transparent_svg_assets/FromS.png',
    toM: 'gpt-advice/transparent_svg_assets/ToM.png',
    in: 97.60,            // FromS 淡入（贴着 "To S, to M" 这句的起点）
    crossFrom: 97.739,    // 渐变开始（歌词 To）
    crossTo: 98.769,      // 渐变结束（歌词 M，取自 MIDI 音符）
    out: 99.35,           // 下一句 So we can enter 时退出
    outTo: 99.70
  };
  G.imageState = function (t) {
    var I = G.img, a = 1;   // 图片有自己的淡入淡出窗口，不受仪表盘整体 alpha 影响
    var fromS = smooth(inv(I.in, I.crossFrom, t)) * (1 - smooth(inv(I.crossFrom, I.crossTo, t)));
    var toM = smooth(inv(I.crossFrom, I.crossTo, t)) * (1 - smooth(inv(I.out, I.outTo, t)));
    return { fromS: fromS * a, toM: toM * a, on: (fromS + toM) > 0.004 };
  };
  /** 浏览器里更新两个 <img> 的透明度（node 里无 DOM，直接返回）。 */
  G.updateImages = function (t) {
    var doc = (typeof document !== 'undefined') ? document : null;
    if (!doc) return;
    var host = doc.getElementById('stagewrap') || doc.body;
    var layer = doc.getElementById('gaugelayer');
    if (!layer) {
      layer = doc.createElement('div');
      layer.id = 'gaugelayer';
      layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3;';
      var mk = function (id, src) {
        var im = doc.createElement('img');
        im.id = id; im.src = src;
        im.style.cssText = 'position:absolute;left:50%;top:50%;width:66%;transform:translate(-50%,-50%);opacity:0;';
        layer.appendChild(im);
        return im;
      };
      layer.appendChild ? null : null;
      mk('gauge-img-froms', G.img.fromS);
      mk('gauge-img-tom', G.img.toM);
      host.appendChild(layer);
    }
    var st = G.imageState(t);
    var a = doc.getElementById('gauge-img-froms'), b = doc.getElementById('gauge-img-tom');
    if (a) a.style.opacity = String(st.fromS);
    if (b) b.style.opacity = String(st.toM);
    layer.style.display = st.on ? 'block' : 'none';
  };

  /** 深蓝底 + 盘面辉光（世界层每帧调一次）。 */
  G.backdrop = function (t) {
    var D = WX.D, C = G.cfg;
    if (!D || !D.ctx) return;
    var a = Math.max(EM.gate(t, 88.20, 96.30, 0.5, 0.6), EM.gate(t, 97.55, 99.95, 0.4, 0.5));
    if (a <= 0.002) return;
    var ctx = D.ctx, c = C.colors.bg;
    ctx.save();
    ctx.globalAlpha = D.alpha * a;
    ctx.fillStyle = D.linear(0, 0, 0, C.stage.h, [[0, [c[0] + 4, c[1] + 4, c[2] + 8]], [0.55, c], [1, [8, 10, 36]]]);
    ctx.fillRect(0, 0, C.stage.w, C.stage.h);
    D.S.calls++;
    var rg = D.radial(C.stage.cx, C.stage.cy, 40, 380, [[0, [255, 255, 255, 0.05]], [0.62, [255, 255, 255, 0.012]], [1, [255, 255, 255, 0]]]);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, C.stage.w, C.stage.h);
    D.S.calls++;
    ctx.restore();
    D.setBg(c);
  };

  /** 画一帧。t = 歌曲时间。 */
  G.draw = function (t, cueText) {
    var V = WX.SVG;
    if (!V) return null;
    var C = G.cfg, s = G.state(t);
    var ink = C.colors.ink, dim = C.colors.dim, badgeText = C.colors.badgeText;
    var CX = C.stage.cx, CY = C.stage.cy;
    var alpha = s.alpha;

    /* 歌词：SVG 文字（之前 <text/> 是空标签，这就是"歌词不显示"的根因，已修） */
    if (cueText) {
      V.text(cueText, CX, 812, 30, EM.withA([210, 216, 232], s.alpha),
        { align: 'center', tracking: 2, font: C.font });
    }

    /* 阶段 1：Configuration 弹窗 + SWITCH MY GENDER + 左右两个符号（描边） */
    var introA = s.intro * s.titleFade * s.alpha;
    if (introA > 0.004) {
      var B = C.intro.badge, T = C.intro.title;
      V.rect(B.x, B.y, B.w, B.h, { fill: EM.withA(ink, 0.96 * introA) });
      V.text('Configuration', T.x, B.y + 43, 34, EM.withA(badgeText, introA),
        { align: 'center', minRatio: 1, font: C.font, bg: ink });
      V.text('SWITCH  MY  GENDER', T.x, T.y, T.size, EM.withA([180, 185, 215], introA),
        { align: 'center', tracking: T.track, font: C.font });
    }

    /* 阶段 2：女符号（左）+ 男符号（右）向中心合并，生成合并符号（全部描边，不填充） */
    var split = s.split;
    if (split > 0.004) {
      var fl = lerp(C.intro.left.x, CX, s.merge), fy = lerp(C.intro.left.y, CY, s.merge);
      var fr = lerp(C.intro.right.x, CX, s.merge), fy2 = lerp(C.intro.right.y, CY, s.merge);
      var k = lerp(C.intro.left.s, 1, s.merge);
      var fade = (1 - smooth(inv(0.82, 1, s.merge))) * s.alpha;
      if (fade > 0.004) {
        drawSymbol(V, fl, fy, k, 'female', fade);
        drawSymbol(V, fr, fy2, k, 'male', fade);
      }
    }

    /* To S, to M：这句用两张透明 PNG，SVG 里垫一点柔光（图片在 DOM 叠层里显示） */
    if (t >= 97.60 && t < 99.70) {
      var ig = G.imageState(t);
      V.rect(180, 120, 1240, 640, { fill: EM.withA([255, 255, 255], 0.05 * (ig.fromS + ig.toM) * s.alpha) });
    }

    /* 合并后的符号：合并完成后出现在中心；Do whatever 起成为钟表指针并旋转 */
    var needleAppear = s.merge >= 0.999 ? 1 : 0;
    if (needleAppear > 0.004) {
      var rot = s.needleRot * Math.PI / 180;
      V.at(CX, CY, rot, 1, function () {
        drawSymbol(V, 0, 0, 1, 'combined', s.alpha * needleAppear);
      });
    }

    /* 同心圆：Do whatever 时泛起来，作为表框 */
    if (s.ripple > 0) {
      for (var i = 0; i < C.ripples.length; i++) {
        var kk = clamp(s.ripple * 1.35 - i * 0.18, 0, 1);
        if (kk <= 0) continue;
        V.circle(CX, CY, lerp(40, C.ripples[i], kk), {
          stroke: EM.withA(ink, (0.55 * (1 - kk) + 0.14) * s.alpha),
          sw: 1.5 + 5 * (1 - kk)
        });
      }
    }
    return s;
  };

})(typeof window !== 'undefined' ? window : globalThis);
