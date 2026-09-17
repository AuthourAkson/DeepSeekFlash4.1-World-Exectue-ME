/* ============================================================================
   failure-check.js — regression tests for the ways the film can fail to start.

   The bug this exists for: the page asked the browser for
   "Mili - world.execute(me) ;.mp3" while the supplied file is
   "Mili - world.execute (me) ;.mp3". The element failed, loadedmetadata never
   fired, and because the redraw heartbeat was gated on `running` (which stays
   false when the audio cannot be opened) the canvas stayed black and clicking
   did nothing at all.

   Requirements asserted here:
     A. with NO audio file, the page still says so out loud
     B. with NO audio file, the film still draws (world + plate + lyric panel)
     C. a throwing frame does not kill the render loop
     D. the filename the page requests actually exists on disk
     E. a late-arriving audio element still takes over the clock
   ==========================================================================*/
const fs = require('fs'), path = require('path');
const { createEnv, makeEl } = require('./stub-env');

const ROOT = path.join(__dirname, '..');
let bad = 0;
const ok = m => console.log('  ok   ' + m);
const no = m => { bad++; console.log('  FAIL ' + m); };

/* ---------------------------------------------------------------- A + B --- */
console.log('=== A/B. the audio file cannot be opened ===');
{
  const env = createEnv({ quiet: true });
  const EM = env.EM;

  /* pretend the browser refused every candidate name, as it would if none of
     them exists on disk */
  env.audio.error = { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
  env.audio.networkState = 3;
  env.audio.currentSrc = '';
  env.audio.duration = NaN;
  for (let i = 0; i < 6; i++) {
    env.audio.fire('error', { type: 'error' });
    env.beat(1);
  }
  env.audio.fire('error', { type: 'error' });
  env.beat(2);

  const boot = env.els['boot-msg'];
  const shown = (boot.textContent || '').length > 0 && !boot.classList.contains('gone');
  if (shown) ok('the page reports the failure on screen: "' + (boot.textContent || '').split('\n')[0] + '"');
  else no('the page stayed silent about a missing audio file');
  if (boot.classList.contains('fatal')) ok('the message is marked as fatal so it is styled as an error');
  else no('the failure message is not marked fatal');
  if (/world\.execute \(me\) ;\.mp3/.test(boot.textContent || '')) ok('the message names the exact file it expected');
  else no('the message does not name the expected file');

  /* the crucial part: is the picture still being drawn? */
  env.opLog.length = 0;
  const drawn = env.beat(3);
  if (drawn > 0) ok('the render loop is still alive with no audio (' + drawn + ' frames drawn by the heartbeat)');
  else no('THE RENDER LOOP IS DEAD with no audio — the heartbeat is not driving frames');
  if (env.opLog.length > 200) ok('those frames actually drew the film (' + env.opLog.length + ' drawing calls)');
  else no('the heartbeat frames drew almost nothing (' + env.opLog.length + ' calls)');

  /* and the film can still be PLAYED without audio, using the fallback clock */
  const T = EM.__test;
  T.seek(0);
  T.play();
  env.beat(20);
  const st2 = T.state();
  if (st2.rawT > 0.1) ok('clicking play drives the film on the fallback clock with no audio (t=' + st2.rawT.toFixed(2) + 's after 20 frames)');
  else no('play does nothing without audio — the viewer would see a frozen frame (t=' + st2.rawT + ')');
  if (st2.running) ok('the engine reports it is running');
  else no('the engine does not consider itself running');
  /* and the lyric plate must advance with it */
  if (/\(pre-roll\)|Switch on the power/.test(env.els['lyric-line'].textContent || ''))
    ok('the lyric panel follows the fallback clock');
  else no('the lyric panel did not advance');
  /* it must reach the end and STOP, not overshoot */
  T.seek(EM.AUDIO_END - 0.2);
  T.play();
  env.beat(40);
  const st3 = T.state();
  if (st3.ended && Math.abs(st3.rawT - EM.AUDIO_END) < 0.01) ok('the fallback clock stops exactly at the audio duration (' + st3.rawT.toFixed(3) + 's)');
  else no('the fallback clock did not end cleanly (ended=' + st3.ended + ' t=' + st3.rawT + ')');
  T.pause();

  /* and the lyric panel was populated from the embedded timeline */
  const line = env.els['lyric-line'].textContent || '';
  if (line) ok('the lyric panel works without audio: "' + line + '"');
  else no('the lyric panel is empty without audio');

  /* the failure itself is reported to the console on purpose; what must not
     happen is anything else going wrong on top of it */
  const unexpected = env.errors.filter(e => !/ALL audio candidates failed/.test(e));
  if (!unexpected.length) ok('no exceptions beyond the deliberate report of the failure');
  else unexpected.slice(0, 4).forEach(e => no('error: ' + e));
}

/* -------------------------------------------------------------------- C --- */
console.log('\n=== C. a throwing frame must not end the film ===');
{
  const env = createEnv({ quiet: true });
  const EM = env.EM;
  env.audio.fire('loadedmetadata', { type: 'loadedmetadata' });
  env.beat(1);

  /* sabotage exactly one scene so one frame throws */
  const victim = EM.SceneReg['p.circle'];
  const good = victim[0].e;
  victim[0].e = function () { throw new Error('deliberate test failure'); };

  let alive = 0;
  for (let i = 0; i < 6; i++) alive += env.beat(1);
  if (alive >= 4) ok('the loop survived ' + alive + ' frames after a scene threw');
  else no('the loop stopped after the throwing frame (' + alive + ' further frames)');

  victim[0].e = good;
  const after = env.beat(2);
  if (after > 0) ok('the loop recovers once the fault is gone (' + after + ' more frames)');
  else no('the loop never recovered');
  const unexpected = env.errors.filter(e => !/frame error/.test(e));
  if (!unexpected.length) ok('the injected fault was contained: nothing else broke');
  else unexpected.slice(0, 3).forEach(e => no('unexpected error: ' + e));
}

/* -------------------------------------------------------------------- D --- */
console.log('\n=== D. the requested audio filename exists on disk ===');
{
  const app = fs.readFileSync(path.join(ROOT, 'src', '60_app.js'), 'utf8');
  const clip = (app.match(/var CLIP = '([^']+)'/) || [])[1];
  if (!clip) no('could not read CLIP from src/60_app.js');
  else if (fs.existsSync(path.join(ROOT, clip))) ok('CLIP exists verbatim: "' + clip + '"');
  else no('CLIP does not exist on disk: "' + clip + '"');

  /* every candidate listed as a fallback should either exist or be harmless */
  const cands = [...new Set([].concat([clip], [...app.matchAll(/^\s*'([^']*\.mp3)',?\s*$/gm)].map(m => m[1])))];
  const anyReal = cands.some(c => fs.existsSync(path.join(ROOT, c)));
  if (anyReal) ok(cands.length + ' candidate names tried, at least one is present');
  else no('none of the ' + cands.length + ' candidate names exist on disk');
}

/* -------------------------------------------------------------------- E --- */
console.log('\n=== E. audio that arrives late still becomes the clock ===');
{
  const env = createEnv({ quiet: true });
  const EM = env.EM;
  /* draw a few frames first, as if the file were still opening */
  env.beat(3);
  const beforeFrames = EM.__test.state().frames;
  /* now the file finally loads */
  env.audio.duration = 211.984;
  env.audio.fire('loadedmetadata', { type: 'loadedmetadata' });
  env.audio.currentTime = 42.5;
  env.beat(1);
  const s = EM.__test.state();
  if (Math.abs(s.rawT - 42.5) < 1e-9) ok('once metadata arrives the clock follows audio.currentTime (' + s.rawT + 's)');
  else no('the clock did not pick up the audio position (got ' + s.rawT + ')');
  if (s.frames > beforeFrames) ok('frames continued without interruption across the load');
  else no('the loop stalled across the load');
  const gone = env.els['boot-msg'].classList.contains('gone');
  if (gone) ok('the loading message is dismissed once the audio is ready');
  else no('the loading message is still showing after a successful load');
}

/* -------------------------------------------------------------------- F --- */
console.log('\n=== F. a crossorigin attribute must never break local playback ===');
{
  /* This is the bug the viewer actually hit: <audio crossorigin="anonymous">
     makes the request CORS-mode, file:// can never satisfy it, and Chrome
     fails the load with MEDIA_ERR_SRC_NOT_SUPPORTED (code 4) — a silent film
     even though the file is perfectly readable. The page must not carry the
     attribute, and if it somehow does, the loader must strip it and recover. */
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const tags = html.match(/<(audio|video)\b[^>]*>/g) || [];
  const withCross = tags.filter(t => /crossorigin/i.test(t));
  if (!withCross.length) ok('neither <audio> nor <video> carries crossorigin in index.html');
  else withCross.forEach(t => no('crossorigin present, breaks file:// playback: ' + t));

  /* and prove the loader heals an element that has been given the attribute */
  const env = createEnv({ quiet: true });
  const EM = env.EM;
  env.audio.setAttribute('crossorigin', 'anonymous');   /* sabotage */
  env.audio.fire('error', { type: 'error' });
  env.beat(2);
  const attrs = ['crossorigin', 'src'].map(k => k + '=' + env.audio.getAttribute(k)).join('  ');
  if (!env.audio.hasAttribute('crossorigin')) ok('the loader stripped crossorigin and retried (' + attrs + ')');
  else no('crossorigin survived the retry — every load would keep failing');
  env.audio.duration = 211.984;
  env.audio.fire('canplay', { type: 'canplay' });
  env.beat(2);
  const S = EM.__test.state();
  if (S.audioOK) ok('the audio then loads normally and becomes the clock (audioOK=' + S.audioOK + ')');
  else no('the audio never recovered after the CORS failure');
}

console.log('\n' + (bad ? 'FAILURE HANDLING: ' + bad + ' problem(s)' : 'FAILURE HANDLING: all green'));
process.exit(bad ? 1 : 0);
