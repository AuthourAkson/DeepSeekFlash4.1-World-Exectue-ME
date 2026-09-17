/* ============================================================================
   world.execute(me); — 15_sceneapi.js
   The scene registry + the per-line draw protocol that keeps 95 tableaux
   coherent. Effects run in order of `l` (layer), and each one is faded by
   `vis(p)` so two adjacent lines never both sit at full brightness: the
   hand-off at every lyric boundary is a dissolve, not a cut.
   ==========================================================================*/
(function (EM) {
  'use strict';

  var REG = {};
  var ORDER = [];

  /* S(id, effects) — effects: array of {l, e} or a single function          */
  function S(id, effects) {
    var list;
    if (typeof effects === 'function') list = [{ l: 0, e: effects }];
    else list = effects.slice();
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] === 'function') list[i] = { l: i * 10, e: list[i] };
      if (list[i].l === undefined) list[i].l = i * 10;
    }
    list.sort(function (a, b) { return a.l - b.l; });
    REG[id] = list;
    ORDER.push(id);
    return list;
  }

  /* draw the plate for cue `c` at absolute time `t` (+ user sync offset)     */
  var faults = {};                 /* scene id -> message, reported once     */
  function draw(id, w, t, c) {
    var list = REG[id];
    if (!list) return false;
    var p = EM.clamp((t - c.t) / c.dur, 0, 1);
    var ctx = EM.D.ctx();
    for (var i = 0; i < list.length; i++) {
      ctx.save();
      try {
        list[i].e(w, p, c);
      } catch (err) {
        /* A broken effect must not kill the film — but it must not vanish
           either. Swallowing this silently once let all 131 plates throw
           "U is not defined" and draw nothing while coverage still reported
           100%. So: count it, report it once per scene, and surface it. */
        fault(id, err);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalCompositeOperation = 'source-over';
    }
    return true;
  }

  function fault(id, err) {
    var msg = (err && err.message) ? err.message : String(err);
    if (faults[id] === msg) return;      /* already reported this one */
    faults[id] = msg;
    faultCount++;
    var label = 'plate "' + id + '" failed: ' + msg;
    if (faultCount <= 12) {
      console.error('[world.execute(me);] ' + label);
    } else if (faultCount === 13) {
      console.error('[world.execute(me);] … further plate failures suppressed');
    }
    if (EM.onFault) { try { EM.onFault(id, msg); } catch (e) {} }
  }
  var faultCount = 0;

  function faultList() { return Object.keys(faults).map(function (k) { return k + ': ' + faults[k]; }); }
  function faultTotal() { return faultCount; }

  /* expose the raw plate progress so the HUD can type the lyric in sympathy */
  function progress(id, t, c) {
    return EM.clamp((t - c.t) / c.dur, 0, 1);
  }

  EM.Scenes = S;
  EM.SceneReg = REG;
  EM.SceneOrder = ORDER;
  EM.drawScene = draw;
  EM.sceneProgress = progress;
  EM.sceneFaults = faultList;
  EM.sceneFaultCount = faultTotal;
})(window.EM);
