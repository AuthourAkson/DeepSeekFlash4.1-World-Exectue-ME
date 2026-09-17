const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..');
const lrc = fs.readFileSync(path.join(DIR, 'world.execute(me)-timeline.lrc'), 'utf8');
const SPB = 60 / 130;
const lines = [];
for (const raw of lrc.split(/\r?\n/)) {
  const m = raw.match(/^\[(\d+):(\d+\.\d+)\](.*)$/);
  if (!m) continue;
  const t = (+m[1]) * 60 + parseFloat(m[2]);
  lines.push({ t, text: m[3] });
}
console.log('=== LRC beat alignment (130bpm, beat = ' + SPB.toFixed(4) + 's) ===');
let offs = [];
for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const beat = L.t / SPB;
  const nearest = Math.round(beat);
  const devMs = (beat - nearest) * SPB * 1000;
  offs.push(Math.abs(devMs));
  const next = lines[i + 1];
  console.log(
    `${L.t.toFixed(3).padStart(8)}  b=${beat.toFixed(2).padStart(7)} dev=${devMs.toFixed(0).padStart(5)}ms ` +
    `dur=${next ? (next.t - L.t).toFixed(2) : '-'}  ${L.text}`
  );
}
console.log('mean |dev|', (offs.reduce((a, b) => a + b, 0) / offs.length).toFixed(1), 'ms');

// sec -> beat mapping for the whole track
console.log('\n=== bar grid (4 beats/bar), bar = ' + (SPB * 4).toFixed(3) + 's ===');
for (let b = 0; b * SPB * 4 < 212; b++) {
  const t = b * SPB * 4;
  if (b % 4 === 0) process.stdout.write(`\nbar${String(b).padStart(3)} @ ${t.toFixed(2)}s | `);
}
console.log('\n\n=== candidate section boundaries from MIDI gaps ===');
console.log('intro-ish      0.00 - 15.0  (piano active)');
console.log('GAP A         15.0 - 29.0   piano silent -> (instrumental world boot)');
console.log('section B     29.7 - 133.0  verse 1 + verse 2');
console.log('GAP B        133.0 - 147.0  piano silent -> (argument stack)');
console.log('section C    147.7 - 192.0  climax + love');
console.log('GAP C        192.0 - 205.0  piano silent -> (open loop)');
console.log('tail         205.0 - 211.98 final EXECUTION + outro');
