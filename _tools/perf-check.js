/* ============================================================================
   perf-check.js — how expensive is a frame?

   Walks the whole track at 0.5 s resolution, times each render and records the
   drawing-call count, then names the heaviest plates. A browser must be able to
   hold 60 fps (16.7 ms) with room to spare; anything close to that budget gets
   reported so it can be trimmed.
   ==========================================================================*/
const { createEnv } = require('./stub-env');
const env = createEnv({ quiet: true });
const EM = env.EM, T = EM.__test;

T.renderAt(1, true);   /* settle */

const rows = [];
let worst = { ms: 0 };
for (let t = 0; t <= EM.AUDIO_END; t += 0.5) {
  const tt = Math.min(t, EM.AUDIO_END);
  env.opLog.length = 0;
  const t0 = process.hrtime.bigint();
  T.renderAt(tt, true);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const ops = env.opLog.length;
  const cue = EM.Lyrics.at(tt);
  rows.push({ t: tt, ms, ops, scene: cue.scene, text: cue.text });
  if (ms > worst.ms) worst = { ms, t: tt, scene: cue.scene, text: cue.text, ops };
}

const ms = rows.map(r => r.ms).sort((a, b) => a - b);
const ops = rows.map(r => r.ops).sort((a, b) => a - b);
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log('frames profiled: ' + rows.length + '  (0 → 211.984 s at 0.5 s steps)');
console.log('render time  avg ' + avg(ms).toFixed(2) + ' ms   p50 ' + pct(ms, 0.5).toFixed(2)
  + '   p95 ' + pct(ms, 0.95).toFixed(2) + '   max ' + ms[ms.length - 1].toFixed(2));
console.log('draw calls   avg ' + Math.round(avg(ops)) + '   p50 ' + pct(ops, 0.5)
  + '   p95 ' + pct(ops, 0.95) + '   max ' + ops[ops.length - 1]);
console.log('\nheaviest single frame: ' + worst.ms.toFixed(2) + ' ms at t=' + worst.t.toFixed(2)
  + 's  scene=' + worst.scene + '  "' + worst.text + '"  (' + worst.ops + ' draw calls)');

/* per-plate averages */
const byScene = new Map();
for (const r of rows) {
  const e = byScene.get(r.scene) || { n: 0, ms: 0, ops: 0, text: r.text };
  e.n++; e.ms += r.ms; e.ops += r.ops;
  byScene.set(r.scene, e);
}
const heavy = [...byScene.entries()]
  .map(([s, e]) => ({ scene: s, ms: e.ms / e.n, ops: e.ops / e.n, text: e.text }))
  .sort((a, b) => b.ms - a.ms).slice(0, 10);
console.log('\nheaviest plates (average per frame):');
for (const h of heavy) console.log('  ' + h.ms.toFixed(2).padStart(6) + ' ms  ' + String(Math.round(h.ops)).padStart(5)
  + ' ops  ' + h.scene.padEnd(18) + ' "' + h.text.slice(0, 34) + '"');

const budget = 16.7;
const p95 = pct(ms, 0.95);
console.log('');
if (p95 < budget * 0.5) console.log('PERF: comfortable — p95 is ' + p95.toFixed(2) + ' ms of a ' + budget + ' ms frame (<50% budget)');
else if (p95 < budget) console.log('PERF: inside budget — p95 ' + p95.toFixed(2) + ' ms of ' + budget + ' ms');
else { console.log('PERF: OVER BUDGET — p95 ' + p95.toFixed(2) + ' ms'); process.exit(1); }
