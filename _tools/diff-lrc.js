/* Precise diff between the embedded LRC and the film's CUES array. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

const lrc = fs.readFileSync(path.join(ROOT, 'world.execute(me)-timeline.lrc'), 'utf8');
const re = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
const L = [];
for (const line of lrc.split(/\r?\n/)) {
  const m = line.match(re);
  if (!m) continue;
  let f = m[3]; while (f.length < 3) f += '0';
  L.push([Math.round(((+m[1]) * 60 + (+m[2]) + (+f) / 1000) * 1000) / 1000, m[4]]);
}

const src = fs.readFileSync(path.join(ROOT, 'src/20_lyrics.js'), 'utf8');
const start = src.indexOf('var CUES = [');
const end = src.indexOf('\n  ];', start);
const body = src.slice(start, end);
const C = [];
const cre = /^\s*\[([\d.]+),\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,\s*\d+\s*,\s*'([^']+)'\],?\s*$/;
for (const line of body.split(/\r?\n/)) {
  const m = line.match(cre);
  if (!m) { if (line.trim() && line.trim() !== 'var CUES = [') console.log('UNPARSED: ' + JSON.stringify(line)); continue; }
  C.push([parseFloat(m[1]), m[2] !== undefined ? m[2] : m[3], m[4]]);
}

/* The LRC file's final line "[03:31.984]" carries no text — it is the end
   marker. The film labels that same instant "(end)" so it can hold a plate
   there. Treat that one as equivalent. */
const normText = s => (s === '' ? '(end)' : s);

console.log('LRC cues  :', L.length);
console.log('CUES array:', C.length);

let i = 0, j = 0, diffs = 0;
while (i < L.length || j < C.length) {
  const a = L[i], b = C[j];
  if (a && b && Math.abs(a[0] - b[0]) < 0.0005 && normText(a[1]) === normText(b[1])) { i++; j++; continue; }
  diffs++;
  console.log('MISMATCH  lrc#' + i + ' film#' + j
    + '   lrc=' + JSON.stringify(a) + '   film=' + JSON.stringify(b));
  if (b && (!a || b[0] < a[0])) j++;
  else if (a && (!b || a[0] < b[0])) i++;
  else { i++; j++; }
  if (diffs > 20) break;
}
console.log(diffs ? diffs + ' difference(s)' : 'IDENTICAL — every timestamp and lyric string matches');
