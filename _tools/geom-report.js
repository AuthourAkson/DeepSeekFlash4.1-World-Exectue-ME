/* ============================================================================
   geom-report.js — where does each frame actually draw?

   No rasterising, no guessing: the stub records every drawing call with its
   arguments, and this prints a spatial histogram of the marks plus the exact
   coordinates of the plate's own geometry. If something is drawn off-frame or
   piled into one corner, this shows it directly.
   ==========================================================================*/
const { createEnv } = require('./stub-env');

const COLS = 16, ROWS = 9;   /* coverage grid over the 1600x900 stage */

const CELLS = [];
for (let r = 0; r < ROWS; r++) {
  let line = '';
  for (let c = 0; c < COLS; c++) line += ' ';
  CELLS.push(line.split(''));
}

function marksOf(log) {
  const pts = [];
  for (const line of log) {
    const m = line.match(/^(moveTo|lineTo|fillRect|strokeRect|rect|fillText|arc|ellipse)\(([^)]*)\)$/);
    if (!m) continue;
    const nums = m[2].split(',').map(parseFloat).filter(v => isFinite(v));
    if (nums.length < 2) continue;
    let x, y;
    if (m[1] === 'fillText') { x = nums[nums.length - 2]; y = nums[nums.length - 1]; }
    else { x = nums[0]; y = nums[1]; }
    pts.push({ x: x, y: y, op: m[1], line: line });
  }
  return pts;
}

function report(t, label) {
  const env = createEnv({ quiet: true });
  const EM = env.EM;
  const cue = EM.Lyrics.at(t);

  /* --- world layer alone --- */
  env.opLog.length = 0;
  const w = EM.World.at(t); w.time = t; w.pal = EM.World.palette(w); w.U = 1;
  EM.D.bind(env.els.view.getContext(), 1600, 900);
  EM.WorldLayer.frame(1600, 900, 1, 0, 0);
  EM.WorldLayer.draw(w, w.pal, t, 0);
  const worldPts = marksOf(env.opLog);

  /* --- plate alone --- */
  env.opLog.length = 0;
  EM.drawScene(cue.scene, w, t, cue);
  const platePts = marksOf(env.opLog);
  const rawPlate = env.opLog.slice();

  console.log('\n' + '='.repeat(78));
  console.log('t = ' + t.toFixed(3) + 's   cue #' + cue.i + '  scene ' + cue.scene);
  console.log('"' + cue.text + '"    window ' + cue.t.toFixed(3) + ' → ' + cue.end.toFixed(3)
    + 's   progress p = ' + EM.sceneProgress(cue.scene, t, cue).toFixed(3));
  console.log('='.repeat(78));
  console.log('world marks: ' + worldPts.length + '     plate marks: ' + platePts.length
    + '     plate draw calls: ' + rawPlate.length);

  /* plate bounding box */
  if (platePts.length) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of platePts) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    console.log('plate bbox  : x ' + x0.toFixed(0) + ' … ' + x1.toFixed(0)
      + '     y ' + y0.toFixed(0) + ' … ' + y1.toFixed(0)
      + '     (stage is x -800…800, y -450…450)');
  } else {
    console.log('plate bbox  : NOTHING DRAWN BY THE PLATE');
  }

  /* coverage grid for the plate */
  console.log('\nplate coverage over the stage (each cell = 100 x 100 px):');
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (const p of platePts) {
    const c = Math.floor((p.x + 800) / 100), r = Math.floor((p.y + 450) / 100);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) grid[r][c]++;
  }
  const max = Math.max(1, ...grid.flat());
  const shade = ' .:-=+*#%@';
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c];
      line += v === 0 ? ' ' : shade[Math.min(9, 1 + Math.floor(v / max * 8.99))];
    }
    console.log('  |' + line + '|  y ' + (-450 + r * 100));
  }
  console.log('   ' + '-'.repeat(COLS));
  console.log('   x -800' + ' '.repeat(COLS - 12) + 'x 800   (left → right)');

  /* what the plate actually draws: first few primitives with coordinates */
  console.log('\nfirst 14 plate drawing calls:');
  rawPlate.slice(0, 14).forEach(l => console.log('   ' + l.slice(0, 120)));
}

const times = process.argv.slice(2).filter(a => !isNaN(parseFloat(a))).map(parseFloat);
const list = times.length ? times : [8.0, 31.5, 82.0];
for (const t of list) report(t);
