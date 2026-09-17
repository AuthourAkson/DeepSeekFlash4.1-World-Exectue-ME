/* ============================================================================
   contrast-check.js — the guard on the film's legibility.

   The film is deliberately dim: a near-black ground (rgb(4,6,10) … rgb(9,13,21))
   with thin cyan lines. That aesthetic only works if the TYPE still clears a
   readable contrast ratio — and it did not: captions written as
   rgba(accent, 0.5) measured 1.9:1 once the palette turned molten at 02:30.

   Two invariants are asserted here:
     1. the palette's own text colour stays well clear of the ground
     2. the readability lift in the draw kernel brings ANY colour it is asked
        to draw text with up to at least the 4.5:1 body-copy floor
   ==========================================================================*/
const { createEnv } = require('./stub-env');
const fs = require('fs'), path = require('path');

let bad = 0;
const ok = m => console.log('  ok   ' + m);
const no = m => { bad++; console.log('  FAIL ' + m); };

const env = createEnv({ quiet: true });
const EM = env.EM, D = EM.D;

function relLum(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function ratio(a, b) {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
function parse(s) {
  const m = String(s).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
}
/* what a colour actually looks like composited over the ground */
function over(c, bg) { return [c.rgb[0] * c.a + bg[0] * (1 - c.a), c.rgb[1] * c.a + bg[1] * (1 - c.a), c.rgb[2] * c.a + bg[2] * (1 - c.a)]; }

/* ------------------------------------------------------------------ 1 --- */
console.log('=== 1. the palette\'s text colour over the film\'s ground ===');
let worstInk = 99, worstAt = 0, worstAccent = 99, worstAccentAt = 0;
for (let t = 0; t <= EM.AUDIO_END; t += 2) {
  const w = EM.World.at(t);
  const p = EM.World.palette(w);
  const bg = parse(p.bg0).rgb;
  const ink = parse(p.ink);
  const acc = parse(p.accentCSS);
  const rInk = ratio(over(ink, bg), bg);
  const rAcc = ratio(over(acc, bg), bg);
  if (rInk < worstInk) { worstInk = rInk; worstAt = t; }
  if (rAcc < worstAccent) { worstAccent = rAcc; worstAccentAt = t; }
}
console.log('  body text (pal.ink)  worst ' + worstInk.toFixed(2) + ':1 at t=' + worstAt.toFixed(0) + 's');
console.log('  accent              worst ' + worstAccent.toFixed(2) + ':1 at t=' + worstAccentAt.toFixed(0) + 's');
if (worstInk >= 7) ok('body text never drops below 7:1 anywhere in the film');
else no('body text falls to ' + worstInk.toFixed(2) + ':1 — too low for the primary lyric colour');
if (worstAccent >= 4.5) ok('the accent never drops below 4.5:1');
else if (worstAccent >= 3) console.log('  note accent dips to ' + worstAccent.toFixed(2) + ':1 (lifted automatically when used for type)');
else no('accent falls to ' + worstAccent.toFixed(2) + ':1');

/* ------------------------------------------------------------------ 2 --- */
console.log('\n=== 2. the readability lift ===');
/* Colours the plates actually pass to rgba() for type. The palette exposes
   some entries as arrays and some as finished CSS strings, so both forms are
   exercised — passing a string used to produce rgba(0,0,0,a). */
const CASES = [];
for (let t = 0; t <= EM.AUDIO_END; t += 8) {
  const p = EM.World.palette(EM.World.at(t));
  CASES.push(['accent', p.accent, t]);
  CASES.push(['hot', p.hot, t]);
  CASES.push(['grid', p.grid, t]);
  CASES.push(['love', p.love, t]);
  CASES.push(['ink(string)', p.ink, t]);
}
const ALPHAS = [0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1.0];
let worstAfter = 99, worstCase = '', lifted = 0, total = 0, dark = 0;
for (const [name, col, t] of CASES) {
  for (const a of ALPHAS) {
    total++;
    const before = EM.rgba(col, a);
    const cb = parse(before);
    if (!cb) { no('rgba() produced an unparseable colour from ' + name + ': ' + before); continue; }
    /* a black result means a channel triple was read from a string again */
    if (cb.rgb[0] === 0 && cb.rgb[1] === 0 && cb.rgb[2] === 0 && name !== 'black') {
      dark++;
      no('rgba(' + name + ', ' + a + ') collapsed to black — channel parsing bug');
      continue;
    }
    const after = D.readable(before, 4.5);
    const ca = parse(after);
    if (!ca) { no('lift produced an unparseable colour: ' + after); continue; }
    const ground = [5, 7, 12];
    const rr = ratio(over(ca, ground), ground);
    if (after !== before) lifted++;
    if (rr < worstAfter) { worstAfter = rr; worstCase = name + '@' + a + ' at t=' + t + 's'; }
  }
}
console.log('  combinations tested : ' + total);
console.log('  actually lifted     : ' + lifted);
console.log('  worst ratio after   : ' + worstAfter.toFixed(2) + ':1   (' + worstCase + ')');
if (!dark) ok('no colour collapses to black when passed through rgba()');
if (worstAfter >= 4.5) ok('every text colour reaches at least 4.5:1 after the lift');
else no('some text still falls below 4.5:1 (worst ' + worstAfter.toFixed(2) + ':1)');

/* ------------------------------------------------------------------ 3 --- */
console.log('\n=== 3. no type below the legibility floor ===');
const FLOOR = 14;
const sizes = new Map();
for (const f of ['src/40_scenes.js', 'src/41_scenes2.js', 'src/42_scenes3.js']) {
  const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const m of src.matchAll(/D\.font\(\s*([\d.]+)\s*\*\s*U/g)) {
    const px = parseFloat(m[1]);
    if (px < FLOOR) sizes.set(px, (sizes.get(px) || 0) + 1);
  }
  for (const m of src.matchAll(/D\.font\(\s*([\d.]+)\s*\)/g)) {
    const px = parseFloat(m[1]);
    if (px < FLOOR) sizes.set(px, (sizes.get(px) || 0) + 1);
  }
}
if (!sizes.size) ok('no plate sets type below ' + FLOOR + ' px on the 1600x900 stage');
else {
  [...sizes.entries()].sort((a, b) => a[0] - b[0]).forEach(([px, n]) =>
    no(n + ' declaration(s) at ' + px + ' px — below the ' + FLOOR + ' px floor'));
}

/* ------------------------------------------------------------------ 4 --- */
console.log('\n=== 4. decorations may stay dim, words may not ===');
/* the readable() path is only for type; a plain fill must be left alone */
const dim = 'rgba(90,140,170,0.18)';
const asShape = D.readableShape(dim, 3.0);
const asText = D.readable(dim, 4.5);
console.log('  rgba(90,140,170,0.18)  as a shape -> ' + asShape);
console.log('                         as type   -> ' + asText);
if (parse(asText).a > parse(asShape).a) ok('type is lifted further than shapes, so decorative linework keeps its delicacy');
else no('the type path is not lifting more than the shape path');

console.log('\n' + (bad ? 'CONTRAST: ' + bad + ' problem(s)' : 'CONTRAST: all green'));
process.exit(bad ? 1 : 0);
