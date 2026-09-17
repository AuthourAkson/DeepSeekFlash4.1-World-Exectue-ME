/* ============================================================================
   type-audit.js — what type does the film actually set?

   Reads every fillText / D.font / text-drawing call in the plates and reports
   the real size distribution, the colours used, and every string that is at or
   below the legibility floor. A 13 px monospace line is unreadable on a 1080p
   screen and invisible at 1600x900 scaled down; the point of this is to find
   them all at once rather than by eye.
   ==========================================================================*/
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FILES = ['src/40_scenes.js', 'src/41_scenes2.js', 'src/42_scenes3.js'];

const sizes = new Map();
const smallText = [];
const colors = new Map();
let literalCount = 0;

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const lines = src.split(/\r?\n/);

  lines.forEach((line, i) => {
    /* D.font(<px> * U, ...)  — the declared size */
    let m = line.match(/D\.font\(\s*([\d.]+)\s*\*\s*U/);
    if (m) {
      const px = parseFloat(m[1]);
      const k = px.toFixed(0);
      if (!sizes.has(k)) sizes.set(k, { px: px, n: 0, where: [] });
      const e = sizes.get(k);
      e.n++;
      if (e.where.length < 4) e.where.push(f.replace('src/', '') + ':' + (i + 1));
    }
    /* D.type('...', x, y, <px> * U, ...) */
    m = line.match(/D\.type\(\s*'([^']*)'[^,]*,[^,]*,[^,]*,\s*([\d.]+)\s*\*\s*U/);
    if (m) {
      literalCount++;
      const px = parseFloat(m[2]);
      if (px <= 13.5) smallText.push({ f: f.replace('src/', ''), line: i + 1, px: px, s: m[1].slice(0, 44) });
    }
    /* any rgba(...) used as a fill near a font call: collect for the palette view */
    const cm = line.match(/rgba\(\s*\[?([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\]?\s*,\s*([\d.]+)\s*\)/);
    if (cm && /D\.(font|text|spaced|type|fill|stroke)/.test(line)) {
      const key = [+cm[1] | 0, +cm[2] | 0, +cm[3] | 0].join(',') + ' @' + (+cm[4]).toFixed(2);
      colors.set(key, (colors.get(key) || 0) + 1);
    }
  });
}

/* direct font sizes without the U factor */
const direct = new Map();
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/D\.font\(\s*([\d.]+)\s*\)/g)) {
    const px = parseFloat(m[1]);
    direct.set(px.toFixed(0), (direct.get(px.toFixed(0)) || 0) + 1);
  }
  for (const m of src.matchAll(/D\.spaced\([^)]*?([\d.]+)\s*\*\s*U\s*,/g)) {
    const px = parseFloat(m[1]);
    if (!isNaN(px)) {
      const k = px.toFixed(0);
      if (!sizes.has(k)) sizes.set(k, { px: px, n: 0, where: [] });
      sizes.get(k).n++;
    }
  }
}

console.log('=== declared type sizes (D.font(n * U)) ===');
const sorted = [...sizes.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
for (const [k, v] of sorted) {
  const flag = v.px < 12 ? '  <-- BELOW LEGIBILITY FLOOR' : (v.px < 14 ? '  <-- small' : '');
  console.log('  ' + String(k).padStart(3) + ' px  ×' + String(v.n).padStart(3) + flag
    + (v.where.length ? '   ' + v.where[0] : ''));
}
if (direct.size) {
  console.log('\n=== declared type sizes (D.font(n), no U factor) ===');
  [...direct.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .forEach(([k, n]) => {
      const px = parseFloat(k);
      console.log('  ' + String(k).padStart(3) + ' px  ×' + String(n).padStart(3)
        + (px < 12 ? '  <-- BELOW LEGIBILITY FLOOR' : px < 14 ? '  <-- small' : ''));
    });
}

/* the hardcoded ticker / overlay sizes in 60_app.js */
const app = fs.readFileSync(path.join(ROOT, 'src/60_app.js'), 'utf8');
console.log('\n=== engine overlay type (60_app.js) ===');
for (const m of app.matchAll(/(\d+)\s*px\s*'\s*\+\s*D\.MONO/g)) {
  console.log('  ' + m[1] + ' px');
}

console.log('\n=== text colours on plates ===');
const cs = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
for (const [k, n] of cs) {
  const [rgb, a] = k.split(' @');
  console.log('  rgb(' + rgb + ')  alpha ' + a + '   ×' + n);
}

console.log('\n=== literal strings drawn at <= 13.5 px through D.type ===');
if (!smallText.length) console.log('  (none)');
smallText.slice(0, 30).forEach(r => console.log('  ' + r.px + 'px  ' + r.f + ':' + r.line + '  "' + r.s + '"'));
