/* ============================================================================
 * 06_mv-text.js — 参考 MV 屏幕上真实出现过的文字（OCR 读出，_tools 生成）
 * ----------------------------------------------------------------------------
 * 参考片 video/World.execute(me).mp4 是一台"假操作系统的终端"：
 * 歌词被当成命令和状态消息一条条敲出来 —— 创建对象、锁对象、报引用错误、
 * 重启模拟、宣布、检查网络…… 下面这些是它屏幕上**真实显示过**的文字，
 * 用 Windows 自带 OCR 逐镜头读出来（镜头切点来自 _tools/extract-mv.js）。
 * 时间已换算成歌曲时间（视频时间 = 歌曲时间 + 0.15）。
 * 作品里会在我自己的画面风格里，把这些内容照样打出来。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, MV = WX.MV;
  if (!MV) return;
  /** [歌曲时间, 屏幕上的文字] —— 按时间顺序 */
  MV.TEXT = [
  [6.86, "Objects (me, you) are created."],
  [14.36, "SIMULATION"],
  [16.27, "world."],
  [16.70, "world. | exec"],
  [17.27, "sees"],
  [18.04, "world | execute"],
  [19.40, "execute | > Mili.pr"],
  [20.25, "world | execute | > Mili.produce(s"],
  [21.32, "world. | execute | > Mili.produce(song);"],
  [21.81, "world. | execute | > Mili.produce(song);"],
  [23.01, "world. | execute | > Mili.produce(song); | > Eodslv.prod"],
  [24.21, "ilihliiil"],
  [24.54, "world. | execute | > Mili.produce(song); | > Eodslv.produce(video[6]);"],
  [25.01, "execute"],
  [25.69, "world. | execute | > Mili.produce(song);"],
  [28.51, ".oroduce(sonq);"],
  [31.31, "a set of points, | then"],
  [40.39, "TANGENF"],
  [40.66, "17-.AIXC+IHN, 1"],
  [41.24, "approac"],
  [55.44, "Ohl We can travel | Set time for timetravel"],
  [70.39, "> Lock object (me) | > Lock object (you) | > Restart simulation..."],
  [71.31, "PEDTRAPPEDTRAP | RAPPEDTRAPPEDTRAPPEDT | EDTRAPPED RAPPEDTRAPPE | DPEDTRAPPEDTRAP | PPE RAP D | APPEDTR | DTRAPPE | D [RAPPEDTRAPPED | ?PEDTRAPPEDTRAPP | D ED TRA D | PPEDTRAFDI' | DTRAPPEDTRAPPEDTR"],
  [71.82, "TRAPPEDTRAPPEDTRAP | PEDTRAPPL DTRAPPED | RAPPED RAPPEDTRAPP | DTRAPPED | 'ADO DTR"],
  [72.91, "simulation"],
  [75.49, "NUTRIENTS"],
  [80.76, "ANT IOXILENTS"],
  [125.09, "[Reference Error] | 'It is just Undefined' Error."],
  [160.28, "ANNOUNCE"],
  [182.12, "Check : Network"],
  [184.30, "iiiiiiiliiiiiiiiiiilliiiiiiiiiiiiiliiiliiiiiiiiilliliiiiiiiiiiililiiiiiiiiiiiiilliiiiliiiiiiiiliiiiiliii'lililiiiiflliliiilitliiifiiliiilitiiflii'liliili"],
  [213.26, "worl d.execute(me);"]
  ];

  /** 找 t 时刻该显示的那条 MV 文字（最近一条，超过 9 秒淡出）。 */
  MV.textAt = function (t) {
    var best = null;
    for (var i = 0; i < MV.TEXT.length; i++) {
      if (MV.TEXT[i][0] <= t + 0.05) best = MV.TEXT[i]; else break;
    }
    if (!best) return null;
    var age = t - best[0];
    if (age > 9) return null;
    return { t: best[0], text: best[1], age: age };
  };
})(typeof window !== 'undefined' ? window : globalThis);
