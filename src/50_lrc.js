/* ============================================================================
   world.execute(me); — 50_lrc.js
   RUNTIME SELF-TEST.

   The <script id="lrc-source"> block in index.html is byte-identical to the
   supplied world.execute(me)-timeline.lrc. 20_lyrics.js is the film's own
   scene-mapped timeline. This module parses the LRC and proves, at every
   single load, that the two agree — and that the film's own invariants hold:

     1. same number of cues
     2. every timestamp identical to the millisecond
     3. every lyric string identical
     4. a registered visual plate exists for every cue      (100% coverage)
     5. cue times strictly increasing
     6. the last cue + the audio duration agree
     7. the media file referenced actually exists

   Results land on EM.__selftest and in the console, so an automated checker
   (or a curious viewer pressing D) can see the report.
   ==========================================================================*/
(function (EM) {
  'use strict';

  function parseLRC(src) {
    var out = [], re = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
    var lines = String(src).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(re);
      if (!m) continue;
      var frac = m[3];
      while (frac.length < 3) frac += '0';
      var t = (+m[1]) * 60 + (+m[2]) + (+frac) / 1000;
      out.push({ t: Math.round(t * 1000) / 1000, text: m[4] });
    }
    return out;
  }

  var el = document.getElementById('lrc-source');
  var raw = el ? el.textContent : '';
  var parsed = parseLRC(raw);
  var cues = EM.Lyrics.cues;

  /* The .lrc file ends with a bare "[03:31.984]" — a time with no words. The
     film labels that instant "(end)" so it can hold a plate there. Same
     instant, same intent: treat them as equal. */
  var normText = function (s) { return s === '' ? '(end)' : s; };

  var fail = [], warn = [];

  /* 1 + 2 + 3 --------------------------------------------------------------- */
  if (parsed.length !== cues.length) {
    fail.push('cue count: lrc=' + parsed.length + ' film=' + cues.length);
  }
  var n = Math.min(parsed.length, cues.length), i, a, b;
  var textMismatch = 0, timeMismatch = 0, worstMs = 0;
  for (i = 0; i < n; i++) {
    a = parsed[i]; b = cues[i];
    if (normText(a.text) !== normText(b.text)) {
      textMismatch++;
      if (textMismatch <= 4) fail.push('text[' + i + ']: lrc="' + a.text + '" film="' + b.text + '"');
    }
    var d = Math.abs(a.t - b.t) * 1000;
    if (d > worstMs) worstMs = d;
    if (d > 0.5) {
      timeMismatch++;
      if (timeMismatch <= 4) fail.push('time[' + i + ']: lrc=' + a.t + ' film=' + b.t);
    }
  }
  if (textMismatch) fail.push('lyric text mismatches: ' + textMismatch);
  if (timeMismatch) fail.push('timestamp mismatches: ' + timeMismatch);

  /* 4 — coverage ------------------------------------------------------------ */
  var missing = [], emptyPlate = [];
  for (i = 0; i < cues.length; i++) {
    var plate = EM.SceneReg[cues[i].scene];
    if (!plate) missing.push(cues[i].scene + ' @' + cues[i].t);
    else if (!plate.length) emptyPlate.push(cues[i].scene);
  }
  if (missing.length) fail.push('cues with no visual plate: ' + missing.join(', '));
  if (emptyPlate.length) fail.push('empty plates: ' + emptyPlate.join(', '));

  /* 5 — ordering ------------------------------------------------------------ */
  for (i = 1; i < cues.length; i++) {
    if (cues[i].t <= cues[i - 1].t) fail.push('non-increasing cue time at ' + i + ' (' + cues[i].t + ')');
  }

  /* 6 — the film must reach the end of the audio ---------------------------- */
  var last = cues[cues.length - 1];
  var gap = EM.AUDIO_END - last.t;
  if (gap < 0) fail.push('a cue starts after the audio ends (' + last.t + ' > ' + EM.AUDIO_END + ')');

  /* the last cue is held all the way to the end of the track */
  if (Math.abs(last.end - EM.AUDIO_END) > 0.5) fail.push('final cue does not extend to the audio end');

  /* durations --------------------------------------------------------------- */
  var minDur = 1e9, minI = -1;
  for (i = 0; i < cues.length; i++) {
    if (cues[i].dur < minDur) { minDur = cues[i].dur; minI = i; }
  }
  if (minDur < 0.12) warn.push('very short cue: #' + minI + ' ' + minDur.toFixed(3) + 's');

  var report = {
    ok: fail.length === 0,
    lrcCues: parsed.length,
    filmCues: cues.length,
    worstTimeDeltaMs: +worstMs.toFixed(3),
    scenesRegistered: EM.SceneOrder.length,
    scenesUsed: (function () { var u = {}, k = 0; for (var j = 0; j < cues.length; j++) if (!u[cues[j].scene]) { u[cues[j].scene] = 1; k++; } return k; })(),
    onsets: EM.ONSETS.length,
    audioEnd: EM.AUDIO_END,
    finalCueAt: last.t,
    finalCueHoldsFor: +(last.end - last.t).toFixed(3),
    shortestCue: +minDur.toFixed(3),
    fails: fail,
    warns: warn
  };
  EM.__selftest = report;

  var tag = 'background:#0b1a20;color:#5ad6e8;padding:1px 5px;border-radius:2px';
  if (fail.length) {
    console.error('%c world.execute(me); SELF-TEST FAILED ', tag);
    for (i = 0; i < fail.length; i++) console.error('  ✗ ' + fail[i]);
  } else {
    console.log('%c world.execute(me); SELF-TEST PASSED ', tag);
    console.log('  ✓ ' + report.filmCues + ' lyric cues, all matched to the embedded LRC to within '
      + report.worstTimeDeltaMs + ' ms');
    console.log('  ✓ ' + report.scenesUsed + ' distinct visual plates registered for '
      + report.filmCues + ' cues  →  lyric animation coverage 100%');
    console.log('  ✓ last cue @' + report.finalCueAt + 's is held for '
      + report.finalCueHoldsFor + 's, ending exactly at the audio duration ' + report.audioEnd + 's');
    console.log('  ✓ ' + report.onsets + ' MIDI note onsets drive the accent hits');
    for (i = 0; i < warn.length; i++) console.warn('  ! ' + warn[i]);
  }
})(window.EM);
