/* ============================================================================
 * 50_lrc.js — 运行时自检：内嵌 LRC  vs  成片时间轴
 * ----------------------------------------------------------------------------
 * index.html 里逐字节内嵌了委托方给的 original/world.execute(me)-timeline.lrc
 * （<script id="lrc-source" type="text/plain">），而 src/20_lyrics.js 里是
 * 真正驱动画面的那条时间轴。两份如果对不上，这里会当场发现 ——
 * 任何一处被手改（或复制粘贴时吃掉一个毫秒）都藏不住。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM;

  var CHECK = WX.CHECK = {
    ok: false, lrcCount: 0, cueCount: 0, mismatches: [], audioEndOk: null, embeddedOk: null
  };

  function parseLrc(text) {
    var out = [], lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var m = /^\[(\d+):(\d+\.\d+)\](.*)$/.exec(lines[i].trim());
      if (!m) continue;
      out.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3] });
    }
    return out;
  }
  CHECK.parseLrc = parseLrc;

  CHECK.run = function () {
    var el = null;
    try { el = document.getElementById('lrc-source'); } catch (e) { el = null; }
    var raw = el ? (el.textContent || '') : '';
    var lrc = parseLrc(raw);
    CHECK.lrcCount = lrc.length;
    CHECK.cueCount = WX.CUES.length;
    CHECK.embeddedOk = raw.length > 0;
    CHECK.mismatches = [];
    var n = Math.min(lrc.length, WX.CUES.length);
    for (var i = 0; i < n; i++) {
      var a = lrc[i], b = WX.CUES[i];
      if (Math.abs(a.t - b.t) > 0.0011 || a.text !== b.text) {
        CHECK.mismatches.push({
          i: i + 1,
          lrc: a.t.toFixed(3) + ' "' + a.text + '"',
          timeline: b.t.toFixed(3) + ' "' + b.text + '"'
        });
      }
    }
    // 终点：最后一条 cue 必须落在音频的真实时长上
    var last = WX.CUES[WX.CUES.length - 1];
    CHECK.audioEndOk = Math.abs(last.t - EM.AUDIO_END) < 0.002;
    CHECK.ok = CHECK.embeddedOk && lrc.length === WX.CUES.length && CHECK.mismatches.length === 0 && CHECK.audioEndOk;
    if (!CHECK.ok) {
      console.error('[自检失败] LRC ' + lrc.length + ' 条 / 时间轴 ' + WX.CUES.length + ' 条 / 不一致 ' +
        CHECK.mismatches.length + ' 处 / 终点对齐 ' + CHECK.audioEndOk);
      if (CHECK.mismatches.length) console.error('第一处不一致：', CHECK.mismatches[0]);
    } else {
      console.log('[自检通过] 内嵌 LRC 与成片时间轴逐条一致：' + lrc.length + ' 条 cue，终点 ' + EM.AUDIO_END + ' s');
    }
    return CHECK;
  };

})(typeof window !== 'undefined' ? window : globalThis);
