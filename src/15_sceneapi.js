/* ============================================================================
 * 15_sceneapi.js — 画板注册表 + 逐句淡入淡出协议
 * ----------------------------------------------------------------------------
 * 每条 cue 带一个 scene id，每块画板在这里登记。播放时按时间轴取用。
 *
 * 两条纪律：
 *  1) 画板里的异常可以被捕获（不让一块画板拖垮全片），但**绝不能静默**：
 *     会计数、会 console.error，也会出现在调试叠层里。
 *  2) 画完之后要检查"到底画出了几个图元"。注册过 ≠ 画出来了 ——
 *     这是本项目真实踩过的坑（131 块画板全部静默画空，覆盖率却显示 100%）。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D;

  var S = WX.S = {
    SCENES: {},
    ORDER: [],          // 由 20_lyrics.js 按时间轴填好
    stats: { drawn: 0, errors: 0, empty: 0, list: [] }
  };

  /* 时间戳容差。
     真实 mp3 的容器时长是 211.98367 s（8,115 帧 × 1,152 ÷ 44,100），
     而 LRC 给的末尾时间戳是 211.984 —— 差 0.33 ms。没有这条容差，
     最后那条"结束帧" cue 在浏览器里永远不会被点亮。
     2 ms 远小于一个视频帧，也远小于任何人能察觉的卡点误差。 */
  S.EPS = 0.002;

  /** 登记一块画板。fn(p, cue, t, world) —— p 是本句进度 0..1。 */
  S.def = function (id, meta, fn) {
    if (S.SCENES[id]) throw new Error('画板 id 重复：' + id);
    S.SCENES[id] = { id: id, meta: meta || {}, fn: fn };
    return S.SCENES[id];
  };
  S.get = function (id) { return S.SCENES[id]; };
  S.count = function () { return Object.keys(S.SCENES).length; };

  /* --------------------------------------------------------------- 淡入淡出 */

  /** 一句歌词的可见度包络（纯函数）。最后一条 cue 是终点标记：只进不出。 */
  S.envelope = function (j, t) {
    var C = WX.CUES;
    if (!C || !C.length) return 0;
    if (j < 0 || j >= C.length) return 0;
    var cue = C[j], T0 = cue.t, last = j >= C.length - 1;
    var T1 = last ? EM.AUDIO_END : C[j + 1].t;
    var dur = Math.max(0.001, T1 - T0);
    var tt = t + S.EPS;                 // 见上面的容差说明
    var fi = cue.fadeIn === undefined ? Math.min(0.20, dur * 0.34) : cue.fadeIn;
    var fo = cue.fadeOut === undefined ? Math.min(0.24, dur * 0.38) : cue.fadeOut;
    if (WX.MV && WX.MV.ON) { fi = Math.min(fi, 0.05); fo = Math.min(fo, 0.05); }   // MV 是硬切
    if (cue.hold) fo = 0;
    if (tt < T0) return 0;
    if (!last && tt >= T1 + fo) return 0;
    var up = fi > 0 ? EM.smooth((tt - T0) / fi) : 1;
    var dn = (last || fo <= 0) ? 1 : EM.smooth((T1 - tt) / fo);
    return Math.min(up, Math.max(0, dn));
  };

  /** t 时刻的主 cue 下标（最后一条 <= t 的）。 */
  S.cueIndexAt = function (t) {
    var C = WX.CUES, lo = 0, hi = C.length - 1, ans = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (C[mid].t <= t + S.EPS) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };

  S.reset = function () { S.stats = { drawn: 0, errors: 0, empty: 0, list: [] }; };

  /**
   * 画出 t 时刻所有可见的画板（通常是 1 块，换行时 2 块交叉淡入）。
   * 返回当前主 cue 下标。
   */
  S.render = function (t) {
    var C = WX.CUES, i, main = S.cueIndexAt(t), w = WX.WORLD.at(t);
    var SV = WX.SVG;
    if (SV) SV.open(t);
    for (i = 0; i < C.length; i++) {
      var al = S.envelope(i, t);
      if (al <= 0.004) continue;
      S.drawOne(i, al, t, w);
    }
    if (SV) { if (SV.count) SV.close(); else SV.clear(); }   // 这一帧没有 SVG 画板就清干净
    return main;
  };

  /** 画一块画板。alpha 为本帧的可见度。 */
  S.drawOne = function (j, alpha, t, w) {
    var cue = WX.CUES[j];
    var sc = S.SCENES[cue.scene];
    if (!sc) {
      S.stats.errors++;
      S.stats.list.push({ id: cue.scene, err: '未注册的画板', at: cue.t });
      console.error('[画板缺失] cue#' + (j + 1) + ' "' + cue.text + '" 指向未注册的 scene: ' + cue.scene);
      return;
    }
    var T1 = (j + 1 < WX.CUES.length) ? WX.CUES[j + 1].t : EM.AUDIO_END;
    var dur = Math.max(0.001, T1 - cue.t);
    var p = EM.clamp((t - cue.t) / dur, 0, 1);
    var before = D.S.calls;
    D.save();
    D.a(alpha);
    try {
      sc.fn(p, cue, t, w);
    } catch (e) {
      S.stats.errors++;
      S.stats.list.push({ id: cue.scene, err: String(e && e.message || e), at: cue.t });
      console.error('[画板异常] ' + cue.scene + ' @ ' + cue.t.toFixed(3) + 's:', e);
    }
    var drew = D.S.calls - before;
    if (drew <= 0) {
      S.stats.empty++;
      S.stats.list.push({ id: cue.scene, err: '没有画出任何图元', at: cue.t });
      console.warn('[画板空转] ' + cue.scene + ' @ ' + cue.t.toFixed(3) + 's 一个图元都没画出来');
    }
    S.stats.drawn += drew;
    D.restore();
  };

})(typeof window !== 'undefined' ? window : globalThis);
