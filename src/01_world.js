/* ============================================================================
 * 01_world.js — 世界状态曲线 + 调色板
 * ----------------------------------------------------------------------------
 * 观众看到的不是"机器人在谈恋爱"的插画，而是这台机器的显示器的输出：
 * 一个逐渐被它自己无法处理的数据撑坏的系统。整块屏幕由下面这几个参数驱动，
 * 它们全是时间的函数（关键帧线性插值），所以画面永远是 t 的纯函数：
 *
 *   struct  世界还遵守自己规则的程度        1 → 0.03
 *   chaos   几何失序 / 抖动                 0.03 → 0.86
 *   warm    0 = 显示器冷蓝  1 = 体温        0 → 0.86
 *   heat    0 = 安全        1 = 报警红      0 → 1.0 → 0
 *   rot     0 = 干净代码    1 = 有机物      0 → 0.66 → 0
 *   love    这台机器不该拥有的变量          0 → 1.0
 *   topo    grid → sphere → wave → organic → tangle → open
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM;

  var KEYS = {
    //        启动        证明自己        血肉          被抛下          指控          处决          LO-O-OVE      开环/尾奏
    //         0     16     29.7   44.5   74     110.9  117.3  125.7  134.4  147.7  175.0  193.5  211.984
    struct: [[0, 1.00], [16, 0.99], [29.7, 0.97], [44.5, 0.94], [59.2, 0.90], [74.0, 0.82], [103.5, 0.62], [110.9, 0.46], [125.7, 0.40], [147.7, 0.26], [175.0, 0.16], [193.5, 0.07], [211.98, 0.03]],
    chaos: [[0, 0.03], [13.9, 0.05], [29.7, 0.07], [44.5, 0.10], [74.0, 0.18], [103.5, 0.30], [110.9, 0.48], [125.7, 0.58], [147.7, 0.74], [158.0, 0.86], [175.0, 0.86], [193.5, 0.34], [211.98, 0.12]],
    warm: [[0, 0.00], [29.7, 0.00], [74.0, 0.04], [85.0, 0.12], [103.5, 0.18], [110.9, 0.10], [117.3, 0.06], [147.7, 0.04], [175.0, 0.26], [185.0, 0.62], [193.5, 0.72], [211.98, 0.86]],
    heat: [[0, 0.00], [110.9, 0.06], [117.3, 0.02], [125.7, 0.16], [131.2, 0.62], [147.7, 0.80], [152.0, 1.00], [168.0, 0.92], [175.0, 0.60], [185.0, 0.22], [193.5, 0.08], [211.98, 0.00]],
    rot: [[0, 0.00], [74.0, 0.00], [85.0, 0.10], [103.5, 0.30], [110.9, 0.42], [131.0, 0.52], [147.7, 0.62], [166.0, 0.66], [175.0, 0.58], [185.0, 0.34], [193.5, 0.10], [211.98, 0.00]],
    love: [[0, 0.00], [74.0, 0.00], [110.9, 0.05], [117.3, 0.10], [125.7, 0.12], [147.7, 0.10], [175.0, 0.30], [179.9, 0.62], [187.7, 0.88], [193.5, 1.00], [211.98, 1.00]],
    topo: [[0, 0], [13.9, 1], [29.7, 2], [50.0, 1.6], [74.0, 3], [110.9, 3.4], [125.7, 4], [147.7, 4.4], [175.0, 4.2], [187.7, 5], [195.0, 5.2], [211.98, 6]]
  };
  var NAMES = ['grid', 'sphere', 'wave', 'organic', 'tangle', 'open'];

  function sample(keys, t) {
    var i, a, b;
    if (t <= keys[0][0]) return keys[0][1];
    for (i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        a = keys[i - 1]; b = keys[i];
        var u = EM.smooth((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
        return a[1] + (b[1] - a[1]) * u;
      }
    }
    return keys[keys.length - 1][1];
  }

  var WORLD = WX.WORLD = {};

  /** 世界状态。返回**新对象**——调用方随便存，不会被后续帧改掉。 */
  WORLD.at = function (t) {
    var p = {
      t: t,
      struct: sample(KEYS.struct, t),
      chaos: sample(KEYS.chaos, t),
      warm: sample(KEYS.warm, t),
      heat: sample(KEYS.heat, t),
      rot: sample(KEYS.rot, t),
      love: sample(KEYS.love, t),
      topo: sample(KEYS.topo, t)
    };
    p.topoName = NAMES[Math.min(NAMES.length - 1, Math.round(p.topo))];
    p.bg = WORLD.bg(p);
    p.accent = WORLD.accent(p);
    p.hot = Math.max(p.heat, p.chaos * 0.35);   // 合成器的触发量
    // 参考 MV 的状态（剪辑表 / 亮度包络 / 颗粒度）
    var MV = WX.MV;
    p.mv = MV ? MV.at(t) : null;
    p.mvOn = !!(MV && MV.ON);
    if (p.mvOn && p.mv) p.bg = WORLD.gradeBg(p.bg, p.mv);
    return p;
  };

  /** MV 模式：把颜色按亮度压成灰，并让整体明暗跟着 MV 的亮度包络走。 */
  WORLD.grade = function (c, mv) {
    var g = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return [EM.clamp(g, 0, 255), EM.clamp(g, 0, 255), EM.clamp(g, 0, 255), c[3] === undefined ? 1 : c[3]];
  };
  /** 背景专用：MV 大部分时间很黑（中位 12/255），底色跟着它压暗。 */
  WORLD.gradeBg = function (c, mv) {
    var g = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    g = EM.clamp(g * 0.30 + 34 * mv.lum, 0, 255);
    return [g, g, g, 1];
  };
  WORLD.grayOf = function (c) {
    var v = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return [v, v, v, c[3] === undefined ? 1 : c[3]];
  };

  /** 底色：冷 → 体温 → 报警红。 */
  WORLD.bg = function (p) {
    var base = EM.mix(EM.PAL.bg0, EM.PAL.bg1, 0.5 + 0.5 * Math.sin(p.struct * 3.1));
    var warmBg = EM.mix(EM.PAL.warmBg0, EM.PAL.warmBg1, 0.5);
    var heatBg = EM.mix(EM.PAL.heatBg0, EM.PAL.heatBg1, 0.5);
    var c = EM.mix(base, warmBg, EM.clamp(p.warm, 0, 1) * 0.85);
    c = EM.mix(c, heatBg, EM.clamp(p.heat, 0, 1) * 0.75);
    return [c[0], c[1], c[2], 1];
  };

  /** 强调色：冷蓝 → 体温琥珀 → 报警红；剩下的规则性会把色相往回拉一点。 */
  WORLD.accent = function (p) {
    var c = EM.mix(EM.PAL.accent, EM.PAL.warm, EM.clamp(p.warm * 1.05, 0, 1));
    c = EM.mix(c, EM.PAL.heat, EM.clamp(p.heat, 0, 1) * 0.85);
    if (p.mvOn && p.mv) c = WORLD.grade([c[0], c[1], c[2], 1], p.mv);   // MV 是纯灰的
    return c;
  };
  WORLD.accent2 = function (p) {
    var c = EM.mix(EM.PAL.accent2, EM.PAL.warm2, EM.clamp(p.warm * 1.05, 0, 1));
    c = EM.mix(c, EM.PAL.heat, EM.clamp(p.heat, 0, 1) * 0.6);
    if (p.mvOn && p.mv) c = WORLD.grade([c[0], c[1], c[2], 1], p.mv);
    return c;
  };
  /** 文字色：暖起来时会轻微变暖，但永远是亮的；MV 模式下就是白。 */
  WORLD.ink = function (p, a) {
    var c = EM.mix(EM.PAL.ink, [255, 226, 196], EM.clamp(p.warm * 0.7, 0, 1));
    if (p && p.mvOn && p.mv) c = [255, 255, 255];
    return EM.withA(c, a === undefined ? 1 : a);
  };

  /** 曲式分段（调试叠层与验证工具都会读它）。 */
  var SECTIONS = [
    [0.000, 'PRE-ROLL'], [0.100, 'BOOT'], [16.000, 'BOOT.SIM'], [29.709, 'THEOREM'],
    [44.452, 'CURRENT'], [59.223, 'STIMULATION'], [74.045, 'FLESH'], [88.587, 'GENDER'],
    [103.489, 'COMPLETION'], [110.900, 'LEFT'], [118.333, 'ERASE'], [125.708, 'CHARGE'],
    [134.380, 'ARG.STACK'], [147.660, 'EXECUTION'], [175.000, 'LOVE'], [193.460, 'OPEN LOOP'],
    [206.620, 'OUTRO'], [211.984, 'END']
  ];
  WORLD.section = function (t) {
    var s = SECTIONS[0][1];
    for (var i = 0; i < SECTIONS.length; i++) if (t >= SECTIONS[i][0]) s = SECTIONS[i][1];
    return s;
  };
  WORLD.SECTIONS = SECTIONS;
  WORLD.TOPO_NAMES = NAMES;

})(typeof window !== 'undefined' ? window : globalThis);
