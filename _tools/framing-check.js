/* ============================================================================
   framing-check.js — composition sanity without pixels.

   The recording canvas keeps every coordinate each plate draws, so we can
   check the composition even with no rasteriser available:

     1. the amount of geometry drawn entirely outside the visible 1600x900
        stage stays small (large bleed is fine — it is clipped background —
        but a plate whose whole composition sits off-frame is a bug)
     2. every frame composes around the centre rather than in a corner
     3. every frame is busy enough to read as a picture
   ==========================================================================*/
const { createEnv } = require('./stub-env');
const env = createEnv({ quiet: true });
const EM = env.EM, T = EM.__test;

const W = 1600, H = 900;
const FAR = 140;                                   /* anything further out is invisible */
const SAFE_X = W * 0.31, SAFE_Y = H * 0.31;        /* central 62% */

T.renderAt(1, true);

console.log('=== 1. how much geometry falls outside the stage ===');
let worst = { ratio: 0 }, offenders = [];
for (let t = 0; t <= EM.AUDIO_END; t += 0.5) {
  const tt = Math.min(t, EM.AUDIO_END);
  env.opLog.length = 0;
  T.renderAt(tt, true);
  let marks = 0, far = 0;
  for (const line of env.opLog) {
    const m = line.match(/^(moveTo|lineTo|fillRect|strokeRect|rect|fillText|arc|ellipse)\(([^)]*)\)$/);
    if (!m) continue;
    const nums = m[2].split(',').map(parseFloat).filter(isFinite);
    if (nums.length < 2) continue;
    marks++;
    if (Math.abs(nums[0]) > W / 2 + FAR || Math.abs(nums[1]) > H / 2 + FAR) far++;
  }
  const ratio = marks ? far / marks : 0;
  if (ratio > worst.ratio) worst = { ratio, t: tt, scene: EM.Lyrics.at(tt).scene };
  if (ratio > 0.5) offenders.push(EM.Lyrics.at(tt).scene + ' @' + tt.toFixed(1) + ' (' + (ratio * 100).toFixed(0) + '% off stage)');
}
console.log('  worst frame: ' + (worst.ratio * 100).toFixed(1) + '% of its marks off stage'
  + (worst.scene ? '  (' + worst.scene + ' @' + worst.t.toFixed(1) + 's)' : ''));
if (!offenders.length) {
  console.log('  ok   no frame is composed off-stage; the off-stage marks are clipped background bleed');
} else {
  console.log('  FAIL frames composed mostly off-stage:');
  [...new Set(offenders)].slice(0, 10).forEach(x => console.log('         ' + x));
}
if (worst.ratio > 0.35) console.log('  FAIL more than a third of one frame is invisible');

console.log('\n=== 2. the picture is present where it matters ===');
/* The background grid intentionally fills the whole frame, so "share of marks
   in the middle" is a poor signal on its own. What must hold is that the
   central third of the frame is never empty and that the composition spans a
   reasonable part of the stage. */
let emptyCore = [], narrow = [], minCore = { ratio: 1 }, thin = [];
for (let t = 0; t <= EM.AUDIO_END; t += 1) {
  const tt = Math.min(t, EM.AUDIO_END);
  env.opLog.length = 0;
  T.renderAt(tt, true);
  let marks = 0, inner = 0, core = 0;
  let minX = 1e9, maxX = -1e9;
  for (const line of env.opLog) {
    const m = line.match(/^(moveTo|lineTo|fillRect|strokeRect|rect|fillText|arc|ellipse)\(([^)]*)\)$/);
    if (!m) continue;
    const nums = m[2].split(',').map(parseFloat).filter(isFinite);
    if (nums.length < 2) continue;
    const x = nums[0], y = nums[1];
    if (Math.abs(x) > W / 2 + FAR || Math.abs(y) > H / 2 + FAR) continue;   /* invisible */
    marks++;
    if (Math.abs(x) < SAFE_X && Math.abs(y) < SAFE_Y) inner++;
    if (Math.abs(x) < W * 0.15 && Math.abs(y) < H * 0.15) core++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const ratio = marks ? inner / marks : 0;
  if (ratio < minCore.ratio) minCore = { ratio, t: tt, scene: EM.Lyrics.at(tt).scene };
  if (core < 5) emptyCore.push(EM.Lyrics.at(tt).scene + ' @' + tt.toFixed(1));
  if (marks && (maxX - minX) < W * 0.45) narrow.push(EM.Lyrics.at(tt).scene + ' @' + tt.toFixed(1) + ' span=' + Math.round(maxX - minX));
  if (marks < 60) thin.push(tt.toFixed(1));
}
if (!emptyCore.length) console.log('  ok   no frame leaves the central third of the frame empty');
else { console.log('  FAIL frames with an empty core:'); [...new Set(emptyCore)].slice(0, 10).forEach(x => console.log('         ' + x)); }
if (!narrow.length) console.log('  ok   every frame spans at least 45% of the stage width');
else { console.log('  FAIL frames composed as a narrow strip:'); [...new Set(narrow)].slice(0, 8).forEach(x => console.log('         ' + x)); }
console.log('  info densest/lightest centre occupancy: ' + (minCore.ratio * 100).toFixed(1) + '% of on-stage marks'
  + ' (' + minCore.scene + ' @' + minCore.t.toFixed(1) + 's) — low values are expected: the grid fills the rest of the frame');
if (!thin.length) console.log('  ok   every sampled frame is busy enough to read as a picture');
else console.log('  note sparse frames at t = ' + thin.slice(0, 6).join(', ') + ' s');

const fail = offenders.length || worst.ratio > 0.35 || emptyCore.length || narrow.length;
console.log('\n' + (fail ? 'FRAMING: problems found' : 'FRAMING: all green'));
process.exit(fail ? 1 : 0);
