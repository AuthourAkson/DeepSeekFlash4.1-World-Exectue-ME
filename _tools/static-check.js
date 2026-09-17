/* Static verification: syntax of every script in the page, LRC parity between
   index.html and the supplied .lrc, scene coverage computed from source. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;
const ok = m => console.log('  ok   ' + m);
const no = m => { bad++; console.log('  FAIL ' + m); };

/* ---- 1. syntax ---------------------------------------------------------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const inline = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('=== syntax ===');
for (const s of scripts) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { no('missing script ' + s); continue; }
  try { new vm.Script(fs.readFileSync(p, 'utf8'), { filename: s }); ok(s); }
  catch (e) { no(s + ' → ' + e.message); }
}

/* ---- 2. LRC parity: index.html block vs the supplied .lrc ---------------- */
console.log('=== LRC parity ===');
const block = html.match(/<script id="lrc-source"[^>]*>([\s\S]*?)<\/script>/);
const lrcFile = fs.readFileSync(path.join(ROOT, 'world.execute(me)-timeline.lrc'), 'utf8');
if (!block) no('no lrc-source block');
else {
  const norm = t => t.replace(/\r\n/g, '\n').replace(/\n+$/, '\n');
  if (norm(block[1]) === norm(lrcFile)) ok('index.html <script id="lrc-source"> is byte-identical to world.execute(me)-timeline.lrc');
  else {
    const a = norm(block[1]).split('\n'), b = norm(lrcFile).split('\n');
    no('LRC block differs from the .lrc file');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { console.log('       line ' + (i + 1) + ':\n         html: ' + JSON.stringify(a[i]) + '\n         lrc : ' + JSON.stringify(b[i])); break; }
    }
  }
}

const cueSrcText = (() => {
  for (const s of scripts) {
    const x = fs.readFileSync(path.join(ROOT, s), 'utf8');
    if (/var CUES = \[/.test(x)) return x;
  }
  return '';
})();
const sceneFiles = scripts.filter(s => /S\('[a-zA-Z0-9._]+'/.test(fs.readFileSync(path.join(ROOT, s), 'utf8')));

/* ---- 3. scene coverage, computed from the sources ----------------------- */
console.log('=== scene coverage ===');
const cueSrc = (() => {
  let t = '';
  for (const s of scripts) {
    const x = fs.readFileSync(path.join(ROOT, s), 'utf8');
    if (/var CUES = \[/.test(x)) t = x;
  }
  /* only the CUES array body — the loader below it also contains bracketed
     index expressions that a naive regex would mistake for cue rows */
  const a = t.indexOf('var CUES = [');
  const b = t.indexOf('\n  ];', a);
  return t.slice(a, b);
})();
const cueIds = [...cueSrc.matchAll(/\[\s*[\d.]+\s*,\s*(?:'[^']*'|"[^"]*")\s*,\s*\d+\s*,\s*'([^']+)'\s*\]/g)].map(m => m[1]);
const registered = new Set();
for (const f of sceneFiles) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  /* a literal S('id', ...) registration; the prefix inside
     S('ex.r' + (r + 1), ...) is not a real id, so skip it */
  for (const m of t.matchAll(/\bS\('([^']+)'\s*(\+|,)/g)) {
    if (m[2] === '+') continue;
    registered.add(m[1]);
  }
  if (/for \(var r = 0; r < 16; r\+\+\) S\('ex\.r' \+ \(r \+ 1\)/.test(t)) {
    for (let i = 1; i <= 16; i++) registered.add('ex.r' + i);
  }
}
console.log('  cues in 20_lyrics.js      : ' + cueIds.length);
console.log('  plates registered         : ' + registered.size);
const missing = cueIds.filter(c => !registered.has(c));
const dupes = cueIds.filter((c, i) => cueIds.indexOf(c) !== i);
if (missing.length) no('cues with no plate: ' + missing.join(', ')); else ok('every cue has a registered visual plate → coverage 100%');
if (dupes.length) no('duplicate scene ids in CUES: ' + [...new Set(dupes)].join(', ')); else ok('all scene ids used at most once');
const unused = [...registered].filter(r => !cueIds.includes(r));
if (unused.length) no('plates never used: ' + unused.join(', ')); else ok('no dead plates');

/* ---- 4. timeline sanity ------------------------------------------------- */
console.log('=== timeline ===');
const cues = [];
const re = /\[\s*([\d.]+)\s*,\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,\s*\d+\s*,\s*'([^']+)'\s*\]/g;
let m;
while ((m = re.exec(cueSrc))) cues.push({ t: parseFloat(m[1]), text: m[2] !== undefined ? m[2] : m[3], scene: m[4] });
const AUDIO_END = 211.984;
let mono = true;
for (let i = 1; i < cues.length; i++) if (cues[i].t <= cues[i - 1].t) { mono = false; no('non-increasing time at ' + i); }
if (mono) ok('cue times strictly increasing');
const lastCue = cues[cues.length - 1];
console.log('  first cue ' + cues[0].t.toFixed(3) + 's   last cue ' + lastCue.t.toFixed(3) + 's   audio end ' + AUDIO_END + 's');
if (Math.abs(lastCue.t - AUDIO_END) < 0.001) ok('last cue sits exactly on the audio duration → animation ends with the track');
else no('last cue ' + lastCue.t + ' != audio end ' + AUDIO_END);
const maxGap = cues.reduce((a, c, i) => Math.max(a, (i + 1 < cues.length ? cues[i + 1].t : AUDIO_END) - c.t), 0);
console.log('  longest single cue: ' + maxGap.toFixed(3) + 's');

/* ---- 5. assets ---------------------------------------------------------- */
console.log('=== assets ===');
/* The audio the page asks for must exist, character for character. This is
   the check that catches a renamed download: the page previously requested
   "world.execute(me) ;.mp3" while the supplied file is actually
   "world.execute (me) ;.mp3" (a space before the parenthesis), which made the
   browser fail to open the track and the film never start. */
const appSrc = fs.readFileSync(path.join(ROOT, 'src', '60_app.js'), 'utf8');
const clipM = appSrc.match(/var CLIP = '([^']+)'/);
const listed = [...appSrc.matchAll(/^\s*'([^']*\.mp3)',?\s*$/gm)].map(m => m[1]);
const candidates = [...new Set([].concat(clipM ? [clipM[1]] : [], listed))];

if (!clipM) no('could not find the CLIP filename in src/60_app.js');
for (const c of candidates) {
  if (fs.existsSync(path.join(ROOT, c))) {
    ok('audio present: ' + c + '  (' + (fs.statSync(path.join(ROOT, c)).size / 1048576).toFixed(2) + ' MB)'
      + (c === clipM[1] ? '   [primary]' : ''));
  } else if (c === clipM[1]) {
    no('PRIMARY AUDIO FILE NOT FOUND: the page asks for "' + c + '" but no such file exists next to index.html'
      + ' — the film will not start');
  } else {
    console.log('  info fallback name not present (fine): ' + c);
  }
}
/* report near-misses, which is exactly the shape of the original bug */
const onDisk = fs.readdirSync(ROOT).filter(f => /\.mp3$/i.test(f));
for (const f of onDisk) {
  if (!candidates.includes(f)) {
    console.log('  info another mp3 sits in the folder: "' + f + '"');
    let same = f.toLowerCase().replace(/[\s()]/g, '') === (clipM ? clipM[1].toLowerCase().replace(/[\s()]/g, '') : '');
    if (same) no('"' + f + '" differs from the requested "' + clipM[1] + '" only in spaces/parentheses — this is the rename trap');
  }
}
const cssRef = html.match(/<link rel="stylesheet" href="([^"]+)"/);
if (cssRef && fs.existsSync(path.join(ROOT, cssRef[1]))) ok(cssRef[1]);
else no('missing stylesheet');
if (!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, ''))) ok('index.html references no external URLs');
else no('index.html contains an external URL');

/* A crossorigin attribute on a media element makes the request CORS-mode.
   Under file:// the page origin is opaque and a local file cannot answer with
   Access-Control-Allow-Origin, so Chrome fails the load with
   MEDIA_ERR_SRC_NOT_SUPPORTED (code 4). This is exactly what made the film
   silent; nothing in the project reads media pixels back, so it must never
   come back. */
const mediaTags = html.match(/<(audio|video)\b[^>]*>/g) || [];
let cross = 0;
for (const tag of mediaTags) {
  if (/crossorigin/i.test(tag)) {
    cross++;
    no('a <' + tag.match(/^<(\w+)/)[1] + '> tag carries crossorigin — this breaks local playback: ' + tag);
  }
}
if (!cross) ok(mediaTags.length + ' media tag(s), none with crossorigin (required for file:// playback)');
const anyCross = /crossorigin/i.test(html.replace(/<!--[\s\S]*?-->/g, ''));
if (!anyCross) ok('no crossorigin attribute anywhere in index.html');
else no('index.html still mentions crossorigin outside a comment');

console.log('\n' + (bad ? 'STATIC CHECK: ' + bad + ' problem(s)' : 'STATIC CHECK: all green'));
process.exit(bad ? 1 : 0);
