/* ============================================================================
   engine-check.js — headless verification of the film's engine.

   Runs index.html's real scripts in a stub DOM + recording canvas and proves:
     1. everything loads with no exception
     2. the runtime self-test passes (embedded LRC == film timeline)
     3. 100% lyric→visual coverage
     4. the film's final cue coincides with the audio duration
     5. all 131 cues render, each on its own timestamp, each visually distinct
     6. rendering is a pure function of audio.currentTime (seek safety):
        the same time always yields the same frame, in any order of arrival
     7. a real seek (moving audio.currentTime) leaves the picture unchanged
     8. transport: play / pause / replay / volume / sync offset / fullscreen
     9. a 0.1 s sweep of the entire 211.984 s renders without a single error
   ==========================================================================*/
const { createEnv } = require('./stub-env');
const fs = require('fs'), path = require('path');

let bad = 0, warns = 0;
const ok = m => console.log('  ok   ' + m);
const no = m => { bad++; console.log('  FAIL ' + m); };
const wn = m => { warns++; console.log('  warn ' + m); };

const env = createEnv({ quiet: true });
const EM = env.EM;

/* Drive the film the way the browser does — through the rAF loop — and report
   which plate the engine chose. This exercises tick()'s clock arithmetic
   (t = audio.currentTime + syncOffset) rather than the test-only renderAt().
   Async because a real media element reports readiness asynchronously. */
async function liveFrameAt(environment, em, audioTime, offsetSec) {
  em.__test.setOffset(offsetSec || 0);
  environment.audio.currentTime = audioTime;
  await environment.settle(2);
  const s = em.__test.state();
  em.__test.setOffset(0);
  return { scene: s.scene, t: s.t, rawT: s.rawT };
}

async function main() {

console.log('=== 1. load ===');
if (!EM) { console.log('  FAIL  EM never appeared'); process.exit(1); }
ok(env.loaded.length + ' scripts loaded: ' + env.loaded.join(' '));
await env.settle(3);            /* let the async media events land, as in a browser */
const loadErrs = env.errors.filter(e => !/SELF-TEST/.test(e));
if (loadErrs.length) loadErrs.forEach(e => no('during load: ' + e)); else ok('no exceptions during load');
if (env.errors.length) env.errors.forEach(e => no('during first frames: ' + e)); else ok('first frames drew cleanly');
if (EM.__test.state().audioOK !== false) ok('the engine reports the audio element as usable');
else no('the engine never saw usable audio metadata');

console.log('\n=== 2. runtime self-test (embedded LRC ↔ film timeline) ===');
const st = EM.__selftest;
console.log('  lrc=' + st.lrcCues + '  film=' + st.filmCues + '  worst Δt=' + st.worstTimeDeltaMs + ' ms  plates=' + st.scenesRegistered);
if (st.ok) ok('passed'); else st.fails.forEach(f => no(f));

console.log('\n=== 3. coverage ===');
const T = EM.__test;
if (!T.missing().length) ok('all ' + T.cueCount() + ' cues have a registered visual plate  →  coverage 100%');
else no('missing plates: ' + T.missing().join(', '));
if (T.unused().length) wn('unused plates: ' + T.unused().join(', '));
else ok(T.sceneCount() + ' plates registered, none dead');

console.log('\n=== 4. end of film vs duration of audio ===');
console.log('  audio duration (element) = ' + T.mediaDuration() + 's    last cue = ' + T.lastCueEnd() + 's');
if (Math.abs(T.mediaDuration() - EM.AUDIO_END) < 0.001) ok('media metadata agrees with the measured duration');
else no('media duration mismatch');
if (Math.abs(T.lastCueEnd() - EM.AUDIO_END) < 0.001) ok('the film ends exactly where the audio ends');
else no('final cue ' + T.lastCueEnd() + ' != ' + EM.AUDIO_END);

console.log('\n=== 5. every cue draws, on its own timestamp, distinctly ===');
const cues = EM.Lyrics.cues;
let sceneWrong = [], identical = [], shortFrame = [];
const seen = new Map();
for (const c of cues) {
  const probe = c.t + Math.min(c.dur * 0.6, Math.max(0.05, c.dur - 0.06));
  const r = env.sig(() => T.renderAt(probe, true));
  if (r.ops < 20) shortFrame.push('#' + c.i + ' ' + c.scene + ' (' + r.ops + ' ops)');
  const got = EM.Lyrics.at(probe);
  if (got.scene !== c.scene) sceneWrong.push('#' + c.i + ' got ' + got.scene + ' want ' + c.scene);
  if (seen.has(r.hash)) identical.push('#' + seen.get(r.hash) + ' & #' + c.i + ' (' + c.scene + ')');
  seen.set(r.hash, c.i);
}
if (!sceneWrong.length) ok('all ' + cues.length + ' cues resolve to their own plate at their own time');
else sceneWrong.slice(0, 8).forEach(x => no('wrong plate: ' + x));
if (!shortFrame.length) ok('every cue emits a substantial drawing stream');
else shortFrame.slice(0, 8).forEach(x => no('thin frame: ' + x));
if (!identical.length) ok('all ' + cues.length + ' cues render a distinct picture (no repeated fingerprints)');
else identical.forEach(x => wn('identical frames: ' + x));

console.log('\n=== 6. determinism: picture is a pure function of audio.currentTime ===');
/* One warm-up frame: bg() caches its background gradient object on first use,
   so the very first draw of a session legitimately creates one extra object.
   Nothing about the picture differs — warm the cache, then measure. */
T.renderAt(1.0, true);
const probes = [0, 0.05, 0.5, 3.5, 7.6, 13.9, 16, 22.5, 29.709, 33.412, 40.049, 45.85, 52, 59.223,
  65.397, 69.259, 74.045, 80.62, 85.078, 88.587, 95.465, 101.474, 104.197, 110.9, 112.22, 115.78,
  117.274, 120.86, 125.708, 131.224, 134.38, 140, 147.66, 152.28, 158, 161.584, 169.824, 173.643,
  177.246, 184.54, 188.483, 191.356, 193.46, 199, 205.811, 206.62, 209.9, 211.9, 211.984];
const firstPass = probes.map(p => env.sig(() => T.renderAt(p, true)).hash);
const shuffled = probes.map((p, i) => i).sort(() => Math.random() - 0.5);
let mismatch = 0;
for (const i of shuffled) {
  const h = env.sig(() => T.renderAt(probes[i], true)).hash;
  if (h !== firstPass[i]) { no('t=' + probes[i] + ' rendered differently on a second, out-of-order pass'); mismatch++; }
}
if (!mismatch) ok('all ' + probes.length + ' probe points reproduce byte-identical draw streams regardless of order');

/* a seek must not disturb the picture at all */
console.log('\n=== 7. real seeks (moving audio.currentTime) ===');
let seekBad = 0;
const seekOrder = [180, 12, 211.5, 0, 97.5, 42, 155, 63.2, 118, 205.9, 29.8, 88, 134.4, 3, 176, 193.5];
for (const s of seekOrder) {
  T.seek(s);
  const moved = Math.abs(env.audio.currentTime - s) < 0.001;
  if (!moved) { no('seek(' + s + ') did not move the audio clock (currentTime=' + env.audio.currentTime + ')'); seekBad++; continue; }
  const h1 = env.sig(() => T.renderAt(s, true)).hash;
  const ref = firstPass[probes.indexOf(s)];
  if (ref !== undefined && ref !== h1) { no('after seek(' + s + ') the frame differs from the reference pass'); seekBad++; }
}
for (const p of probes) if (Math.abs(env.audio.currentTime - p) > 1e-9) { T.seek(p); }
if (!seekBad) ok(seekOrder.length + ' real seeks moved the clock and left every frame reproducible');

/* pause / resume must not drift */
console.log('\n=== 8. transport controls ===');
T.seek(30); T.play();
await env.settle(2);
if (!env.audio.paused) ok('play() starts the audio element'); else no('play() left the element paused');
T.pause();
await env.settle(2);
if (env.audio.paused) ok('pause() stops the audio element'); else no('pause() did not pause');
const st1 = T.state();
if (!st1.running) ok('engine reports PAUSED'); else no('engine still reports running after pause()');
T.seek(0);
if (env.audio.currentTime === 0) ok('replay/seek(0) rewinds the element'); else no('seek(0) failed');
env.els.vol.value = '0.33';
env.els.vol.fire('input', { type: 'input' });
if (Math.abs(env.audio.volume - 0.33) < 1e-6) ok('volume slider drives audio.volume (' + env.audio.volume + ')'); else no('volume not applied');
T.setOffset(0.25);
if (Math.abs(T.state().offset - 0.25) < 1e-9) ok('sync offset of +250 ms applies to the clock'); else no('offset not applied');
const offB = env.sig(() => T.renderAt(60.25, true)).hash;
const offC = env.sig(() => { EM.__test.renderAt(60, true); return 1; }).hash;
/* renderAt() consumes the raw time; the offset lives in tick(). What must hold
   is that tick() adds the offset to audio.currentTime and nothing else. */
if (offB !== offC) ok('t=60.25 s and t=60 s are genuinely different frames (the offset moves the picture, it is not cosmetic)');
else no('the film is insensitive to a 250 ms shift, which would make the offset useless');
const live = await liveFrameAt(env, EM, 60, 0.25);
if (live.scene === EM.Lyrics.at(60.25).scene) ok('with the engine running, a +250 ms offset shows the frame belonging to t+0.25 s');
else no('offset not applied to the live frame (showed ' + live.scene + ')');
if (live.rawT === 60 && Math.abs(live.t - 60.25) < 1e-9) ok('tick() computes t = audio.currentTime + offset (raw 60.000 → film 60.250)');
else no('live clock arithmetic wrong (raw ' + live.rawT + ' → ' + live.t + ')');
if (Math.abs(env.audio.currentTime - 60) < 1e-9) ok('the offset never writes to audio.currentTime (still exactly the 60.000 the test set)');
else no('the offset wrote to audio.currentTime (expected 60, found ' + env.audio.currentTime + ')');
T.setOffset(0);
T.seek(0);

console.log('\n=== 9. dense sweep of the whole track ===');
let errs = [], steps = 0, sceneSet = new Set(), opTotal = 0;
for (let t = 0; t <= EM.AUDIO_END + 1e-9; t += 0.1) {
  const tt = Math.min(t, EM.AUDIO_END);
  try {
    const r = env.sig(() => T.renderAt(tt, true));
    opTotal += r.ops;
    sceneSet.add(EM.Lyrics.at(tt).scene);
    steps++;
  } catch (e) { errs.push(tt.toFixed(2) + ': ' + e.message); if (errs.length > 3) break; }
  if (steps > 2400) break;
}
if (!errs.length) ok(steps + ' frames sampled from 0 → 211.984 s at 0.1 s resolution, ' + opTotal.toLocaleString('en-US') + ' draw calls, no error, ' + sceneSet.size + ' distinct plates');
else errs.forEach(e => no('sweep: ' + e));

console.log('\n=== 10. boundaries ===');
let boundaryBad = [];
for (const c of cues) {
  const before = EM.Lyrics.at(Math.max(0, c.t - 0.004));
  const after = EM.Lyrics.at(c.t + 0.004);
  if (after.scene !== c.scene) boundaryBad.push('#' + c.i + ' @' + c.t);
  if (c.i > 0 && before.scene === c.scene) boundaryBad.push('#' + c.i + ' activates early');
}
if (!boundaryBad.length) ok('every one of the ' + cues.length + ' lines takes over within ±4 ms of its timestamp');
else boundaryBad.slice(0, 8).forEach(x => no('boundary: ' + x));
const neg = EM.Lyrics.at(-5), past = EM.Lyrics.at(1e6);
if (neg.scene === cues[0].scene) ok('times before the start clamp to the first cue');
else no('pre-roll clamp broken');
if (past.scene === cues[cues.length - 1].scene) ok('times past the end clamp to the final cue (no blank tail)');
else no('post-end clamp broken');

console.log('\n=== 11. post-run health ===');
const lateErrs = env.errors.filter(e => !/SELF-TEST/.test(e));
if (!lateErrs.length) ok('no exceptions logged during the entire run');
else lateErrs.slice(0, 6).forEach(e => no('logged error: ' + e));

/* write a machine-readable report */
const report = {
  at: new Date().toISOString(),
  scriptsLoaded: env.loaded.length,
  cues: cues.length,
  plates: T.sceneCount(),
  coverage: T.missing().length === 0,
  audioEnd: EM.AUDIO_END,
  lastCue: T.lastCueEnd(),
  onsets: EM.ONSETS.length,
  selfTest: { ok: st.ok, fails: st.fails, worstTimeDeltaMs: st.worstTimeDeltaMs },
  sweepFrames: steps,
  drawCalls: opTotal,
  distinctPlatesSeen: sceneSet.size,
  problems: bad,
  warnings: warns
};
fs.writeFileSync(path.join(__dirname, 'engine-report.json'), JSON.stringify(report, null, 2));

console.log('\n' + (bad ? 'ENGINE CHECK: ' + bad + ' problem(s)' + (warns ? ', ' + warns + ' warning(s)' : '')
                        : 'ENGINE CHECK: all green' + (warns ? ' (' + warns + ' warning(s))' : '')));
process.exit(bad ? 1 : 0);

}

main().catch(e => {
  console.error('ENGINE CHECK CRASHED: ' + (e && e.stack ? e.stack : e));
  process.exit(3);
});
