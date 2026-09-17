/* ============================================================================
   run-all.js — the project's acceptance suite.  `node _tools/run-all.js`
   ==========================================================================*/
const { spawnSync } = require('child_process');
const path = require('path');

const checks = [
  ['static-check.js', 'source syntax, LRC parity, scene coverage, assets, requested filenames'],
  ['scene-audit.js', 'every plate actually DRAWS (this is what caught all plates throwing)'],
  ['contrast-check.js', 'type legibility: 4.5:1 floor, no type below 14 px, decorative linework untouched'],
  ['engine-check.js', 'runtime self-test, coverage, end==duration, per-cue render, seek safety, transport'],
  ['failure-check.js', 'missing audio, a throwing frame, late-arriving audio, crossorigin'],
  ['perf-check.js', 'per-frame render cost across the whole track'],
  ['framing-check.js', 'composition stays on stage and never leaves the core empty'],
  ['diff-lrc.js', 'cue-by-cue diff of the embedded LRC against the supplied .lrc'],
  ['boot-check.js', 'real-browser boot from file:// (skips itself where Chrome cannot run)']
];

const results = [];
for (const [file, what] of checks) {
  console.log('\n' + '='.repeat(78));
  console.log('  ' + file + '  —  ' + what);
  console.log('='.repeat(78));
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  const out = r.stdout === null;   /* stdio inherit: judge only by exit status */
  results.push([file, r.status === 0, r.status]);
}

console.log('\n' + '='.repeat(78));
console.log('  SUMMARY');
console.log('='.repeat(78));
let bad = 0;
for (const [f, okk, status] of results) {
  console.log('  ' + (okk ? 'PASS' : 'FAIL') + '  ' + f);
  if (!okk) bad++;
}
console.log('\n' + (bad ? bad + ' of ' + results.length + ' checks failed' : 'ALL ' + results.length + ' CHECKS PASSED'));
process.exit(bad ? 1 : 0);
