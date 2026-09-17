/* ============================================================================
   scene-audit.js — every plate must ACTUALLY DRAW.

   This exists because of a real failure: the plate files referenced the stage
   constants W / H / U, which live inside 10_draw.js and were never in scope.
   Every one of the 131 plates threw "U is not defined", the per-effect
   try/catch swallowed it, coverage still reported 100%, and the film played
   as an empty grid — "meaningless and misaligned".

   So: run every plate at several progress points, catch anything that throws,
   and require real geometry (not just save/restore noise) from each one.
   ==========================================================================*/
const { createEnv } = require('./stub-env');

const env = createEnv({ quiet: true });
const EM = env.EM;
const D = EM.D;
D.bind(env.els.view.getContext(), 1600, 900);

const PROGRESS = [0.03, 0.2, 0.45, 0.7, 0.92];
/* primitives that actually put ink on the canvas */
const PRIM = /^(moveTo|lineTo|fillRect|strokeRect|rect|fillText|strokeText|arc|ellipse|quadraticCurveTo|bezierCurveTo)\(/;

let faults = 0, empties = 0, thins = 0;
const thinList = [], emptyList = [], faultList = [];
const stats = [];

for (const id of EM.SceneOrder) {
  const plate = EM.SceneReg[id];
  const cue = EM.Lyrics.byScene[id];
  if (!cue) { faultList.push(id + ': no cue binds this plate'); faults++; continue; }

  let prims = 0, calls = 0;
  const thrown = new Set();

  for (const p of PROGRESS) {
    const tt = cue.t + p * cue.dur;
    const w = EM.World.at(tt);
    w.time = tt; w.pal = EM.World.palette(w); w.U = 1;
    for (let k = 0; k < plate.length; k++) {
      const eff = plate[k];
      env.opLog.length = 0;
      try {
        eff.e(w, p, cue);
      } catch (e) {
        thrown.add('p=' + p + ' layer' + eff.l + ': ' + (e && e.message ? e.message : String(e)));
        continue;
      }
      calls += env.opLog.length;
      for (const line of env.opLog) if (PRIM.test(line)) prims++;
    }
  }

  stats.push({ id, prims, calls, cue });

  if (thrown.size) {
    faults++;
    faultList.push(id + ' (cue #' + cue.i + ' "' + cue.text + '")');
    [...thrown].slice(0, 3).forEach(t => faultList.push('    ' + t));
  } else if (prims === 0) {
    empties++;
    emptyList.push(id + ' (cue #' + cue.i + ' "' + cue.text + '") draws no geometry at all');
  } else if (prims < 15) {
    thins++;
    thinList.push(id.padEnd(17) + ' ' + String(prims).padStart(3) + ' primitives   "' + cue.text.slice(0, 32) + '"');
  }
}

console.log('=== every plate draws? ===');
console.log('plates checked           : ' + EM.SceneOrder.length);
console.log('plates that THROW        : ' + faults);
console.log('plates drawing NOTHING   : ' + empties);
console.log('plates drawing very little: ' + thins);
const withInk = stats.filter(r => r.prims > 0);
console.log('median primitives/plate  : ' + (() => {
  const a = withInk.map(r => r.prims).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
})());
console.log('');

if (faultList.length) {
  console.log('THROWING PLATES:');
  faultList.slice(0, 40).forEach(l => console.log('  ' + l));
  console.log('');
}
if (emptyList.length) {
  console.log('EMPTY PLATES:');
  emptyList.slice(0, 40).forEach(l => console.log('  ' + l));
  console.log('');
}
if (thinList.length) {
  console.log('SPARSE PLATES (may be intentional title cards, listed for review):');
  thinList.forEach(l => console.log('  ' + l));
  console.log('');
}

/* ---- the same audit through the real draw path, at cue midpoints -------- */
console.log('=== through EM.drawScene (the path the film actually uses) ===');
let midFaults = 0, midEmpty = 0;
for (const cue of EM.Lyrics.cues) {
  const tt = cue.t + cue.dur * 0.5;
  const w = EM.World.at(tt);
  w.time = tt; w.pal = EM.World.palette(w); w.U = 1;
  const before = EM.sceneFaultCount();
  env.opLog.length = 0;
  EM.drawScene(cue.scene, w, tt, cue);
  const prims = env.opLog.filter(l => PRIM.test(l)).length;
  if (EM.sceneFaultCount() > before) { midFaults++; console.log('  THREW   #' + cue.i + ' ' + cue.scene); }
  else if (prims < 15) { midEmpty++; console.log('  SPARSE  #' + cue.i + ' ' + cue.scene + ' (' + prims + ' primitives)'); }
}
console.log('');
console.log('cue midpoints that threw : ' + midFaults);
console.log('cue midpoints that are sparse: ' + midEmpty);
if (EM.sceneFaultCount()) {
  console.log('');
  console.log('scene faults recorded by the API:');
  EM.sceneFaults().slice(0, 20).forEach(f => console.log('  ' + f));
}

const bad = faults + empties + midFaults;
console.log('');
console.log(bad ? 'SCENE AUDIT: ' + bad + ' problem(s)' : 'SCENE AUDIT: all green — every plate draws');
process.exit(bad ? 1 : 0);
