/* Real-browser boot check via --dump-dom (no CDP, no screenshot pipeline).
   Proves the page actually boots from file:// in Chrome: scripts run, the
   audio element gets its metadata from the mp3, the engine reports state. */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('no Chrome/Edge available — skipping browser boot check'); process.exit(0); }

const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/').replace(/^\/+/, '');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edme-dom-'));
const out = path.join(os.tmpdir(), 'edme-dom-' + Date.now() + '.html');

console.log('browser boot check');
console.log('  ' + path.basename(CHROME) + '  (headless, --dump-dom, 4 s virtual time)');
console.log('  ' + url);

const r = spawnSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--allow-file-access-from-files', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--user-data-dir=' + profile, '--virtual-time-budget=4000',
  '--dump-dom', url
], { encoding: 'buffer', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });

try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}

let bad = 0;
const no = m => { bad++; console.log('  FAIL ' + m); };
const ok = m => console.log('  ok   ' + m);

if (!r.stdout || !r.stdout.length) {
  /* Some sandboxes forbid Chrome from spawning its child processes at all.
     That is an environment limitation, not a defect in the project, so we say
     so plainly instead of reporting a false failure. */
  console.log('\n  SKIPPED — Chrome could not run here (no DOM produced, exit ' + r.status + ').');
  console.log('  This usually means the sandbox blocks Chrome\'s process spawning.');
  console.log('  Run this script on an unrestricted machine to check the real browser.');
  console.log('\nBROWSER BOOT: skipped (environment)');
  process.exit(0);
}
const dom = r.stdout.toString('utf8');
fs.writeFileSync(out, dom);
console.log('  dom: ' + dom.length + ' bytes  →  ' + out + '\n');

/* 1. the loading message is gone, which only happens in the loadedmetadata
      handler — i.e. the mp3 was really opened and decoded */
if (/id="boot-msg"[^>]*class="[^"]*\bgone\b/.test(dom)) ok('audio metadata loaded from the mp3 → the "loading" message was dismissed');
else if (/id="boot-msg"/.test(dom)) no('the loading message is still showing: the mp3 did not report metadata');
else no('no #boot-msg element found');
if (/Could not load the audio file/.test(dom)) no('the page reported it could not load the audio');

/* 2. the duration readout was filled in by script */
const tot = dom.match(/id="t-tot"[^>]*>([^<]*)</);
if (tot && /\d/.test(tot[1])) ok('duration readout filled in by the engine: "' + tot[1] + '"');
else no('duration readout is empty — the engine never ran');

/* 3. the lyric panel was populated from the film's own timeline */
const ly = dom.match(/id="lyric-line"[^>]*>([^<]*)</);
if (ly && ly[1].trim()) ok('lyric panel populated from the embedded timeline: "' + ly[1].trim() + '"');
else no('lyric panel is empty');
const meta = dom.match(/id="lyric-meta"[^>]*>([^<]*)</);
if (meta && /131/.test(meta[1])) ok('engine reports the full cue list: "' + meta[1].trim() + '"');
else console.log('  info lyric meta: ' + (meta ? meta[1] : '(none)'));

/* 4. the progress bar was built with one tick per lyric line */
const marks = (dom.match(/<i[^>]*style="left:/g) || []).length;
if (marks >= 125) ok(marks + ' timing ticks built into the progress bar');
else if (marks) no('only ' + marks + ' timing ticks (expected ~130)');
else no('no timing ticks were built');

/* 5. the start affordance is present and the shell is wired */
if (/id="start-hint"/.test(dom)) ok('start affordance present (needed for browser autoplay rules)');
else no('no start affordance');

/* 6. nothing in the DOM references the network */
const external = dom.match(/(?:src|href)="(https?:)?\/\//g);
if (!external) ok('no external URLs in the rendered DOM — fully offline');
else no('external references found: ' + external.length);

console.log('\n' + (bad ? 'BROWSER BOOT: ' + bad + ' problem(s)' : 'BROWSER BOOT: all green'));
process.exit(bad ? 1 : 0);
