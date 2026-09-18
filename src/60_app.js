/* ============================================================================
   world.execute(me); — 60_app.js
   THE ENGINE.

   ONE clock: audio.currentTime. The render loop never integrates its own time
   and never counts frames, so pausing, resuming, scrubbing and seeking cannot
   desynchronise the picture — every frame is a pure function of
     t = audio.currentTime + syncOffset
   requested with requestAnimationFrame and re-requested on audio events so the
   picture keeps updating even while paused.
   ==========================================================================*/
(function (EM) {
  'use strict';

  var clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, hash = EM.hash;
  var D = EM.D;

  /* ---------- DOM ---------------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  var audio = $('audio'), video = $('video'), view = $('view');
  /* ONE main canvas: world + plate share it, so the bloom / chroma / glitch
     compositor operates on the finished frame rather than on a layer. */
  var vctx = view.getContext('2d', { alpha: false });
  var fx = document.createElement('canvas'), fctx = fx.getContext('2d');

  var el = {
    stage: $('stage'), shell: $('shell'),
    play: $('btn-play'), replay: $('btn-replay'), bar: $('wave'), barFill: $('wave-fill'),
    barBuf: $('wave-buf'), barHead: $('wave-head'), marks: $('marks'),
    tcur: $('t-cur'), ttot: $('t-tot'), vol: $('vol'), full: $('btn-full'),
    off: $('offset'), offVal: $('off-val'), offReset: $('off-reset'),
    lyric: $('lyric-line'), lyricNext: $('lyric-next'), lyricMeta: $('lyric-meta'),
    hudTop: $('hud-top'), clock: $('clock'), state: $('state'),
    dbg: $('dbg'), media: $('media'), boot: $('boot-msg'), toast: $('toast')
  };

  /* ---------- state ------------------------------------------------------- */
  /* The supplied file is literally named
     "Mili - world.execute (me) ;.mp3"  — note the space between "execute"
     and "(me)". The exact name is tried first; the other spellings are
     fallbacks so a rename can never silently kill the audio again. */
  var CLIP = 'Mili - world.execute (me) ;.mp3';
  var CLIP_CANDIDATES = [
    CLIP,
    'Mili - world.execute(me) ;.mp3',
    'Mili - world.execute (me);.mp3',
    'Mili - world.execute(me);.mp3',
    'audio.mp3'
  ];
  var DUR = EM.AUDIO_END;                 /* authoritative, verified offline   */
  var syncOffset = 0.000;                 /* user-tunable, in seconds          */
  var t = 0;                              /* the one clock, in song seconds    */
  var rawT = 0;                           /* audio.currentTime directly        */
  var running = false, started = false, ended = false;
  var lastQ = -1, lastWall = 0;
  var frames = 0, fpsAcc = 0, fps = 60;
  var fatal = '';                         /* a message the viewer must see     */
  var audioOK = false;                    /* did the browser manage to open it */
  var fallbackClock = 0;                  /* used ONLY when the audio is absent */
  /* the startup log: every loader decision is recorded, shown on screen and
     printed on the debug overlay, so no failure is ever invisible */
  var bootLog = [];
  var T0 = (window.performance && performance.now) ? performance.now() : Date.now();
  /* The video element is only ever a picture bed, and only when explicitly
     enabled through EM.Settings.useVideo. The film's clock is ALWAYS
     audio.currentTime, so an optional bed can never drift the picture away
     from the song — even if the user seeks in the <video> itself. */
  var useVideo = !!EM.Settings.useVideo;
  var W = 1600, H = 900, U = 1, CW = 0, CH = 0, DPR = 1;
  var offX = 0, offY = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* how long the film takes to emerge from black and to sink back into it */
  var FADE_IN = 1.6, FADE_OUT = 3.2;

  /* ---------- boot: attach the media --------------------------------------- */
  /* IMPORTANT: this deliberately does NOT rely on stacking <source> children.
     Resource selection for nested <source> elements is asynchronous, its error
     reporting is inconsistent, and a single wrong spelling there fails
     silently. Instead we attach the FIRST candidate directly, and if the
     element reports it cannot be opened, we walk to the next candidate by
     hand — logging every attempt, so a failure is never invisible again. */
  var trackIndex = 0;
  (function attach() {
    audio.volume = 0.85; el.vol.value = '0.85';
    audio.preload = 'auto';
    audio.loop = false;
    video.loop = true; video.muted = true;   /* bed only: never a second clock */

    var vs = [];
    for (var i = 0; i < CLIP_CANDIDATES.length; i++) {
      if (/\.mp3$/.test(CLIP_CANDIDATES[i])) {
        vs.push(CLIP_CANDIDATES[i].replace(/\.mp3$/, '.mp4'));
        vs.push(CLIP_CANDIDATES[i].replace(/\.mp3$/, '.m4v'));
      }
    }
    vs.push('video.mp4');
    for (i = 0; i < vs.length; i++) {
      var s2 = document.createElement('source');
      s2.src = vs[i]; s2.type = 'video/mp4';
      video.appendChild(s2);
    }
    video.load();
  })();

  /* switch the audio element to the next candidate name; returns false when
     every name has been tried */
  function tryTrack(i) {
    if (i >= CLIP_CANDIDATES.length) return false;
    trackIndex = i;
    settled = false;              /* each attempt gets a clean slate */
    audioOK = false;
    var name = CLIP_CANDIDATES[i];
    try {
      /* Under file:// a crossorigin media request can NEVER succeed: the page
         origin is opaque and a local file cannot return Access-Control-Allow-
         Origin, so Chrome fails the load with error code 4. Strip it and retry
         once — this is exactly the bug that made the film silent. */
      if (audio.hasAttribute && audio.hasAttribute('crossorigin')) {
        audio.removeAttribute('crossorigin');
        note('removed crossorigin from <audio> (it breaks file:// media loads)');
      }
      if (audio.getAttribute('src')) audio.removeAttribute('src');
      while (audio.firstChild) audio.removeChild(audio.firstChild);
      audio.setAttribute('src', name);
      audio.load();
    } catch (err) {
      console.error('[world.execute(me);] could not even set src=' + name, err);
      return tryTrack(i + 1);
    }
    console.info('[world.execute(me);] trying audio file: "' + name + '"');
    note('trying audio file: "' + name + '"');
    return true;
  }
  var attachOK = tryTrack(0);
  if (!attachOK) {
    console.error('[world.execute(me);] no audio candidate could be attached at all');
  }

  video.addEventListener('loadeddata', function () {
    if (useVideo && video.videoWidth) el.media.classList.add('has-video');
  });
  video.addEventListener('error', function () { /* the drawn film needs nothing */ });

  /* ---------- audio load supervision --------------------------------------
     If the browser cannot open the track, the film must say so out loud
     instead of sitting on "loading…" forever — and it must keep running. */
  var loadWatch = 0, settled = false;
  function describe() {
    var src = audio.currentSrc || audio.getAttribute('src') || CLIP;
    try { src = decodeURIComponent(src.replace(/^.*\//, '')); } catch (e) { src = CLIP; }
    return src;
  }
  function audioFailed() {
    if (settled) return;
    /* walk to the next spelling before giving up */
    if (trackIndex + 1 < CLIP_CANDIDATES.length) {
      console.warn('[world.execute(me);] could not open "' + CLIP_CANDIDATES[trackIndex]
        + '" (networkState=' + audio.networkState + ') — trying "' + CLIP_CANDIDATES[trackIndex + 1] + '"');
      tryTrack(trackIndex + 1);
      armLoadWatchdog();
      return;
    }
    /* every name has been tried: say so once, and keep the film running */
    if (fatal) return;
    clearTimeout(loadWatch);
    audioOK = false;
    started = true;                 /* the clock falls back to the page timer */
    el.shell.classList.add('begun');
    fatal = 'NO AUDIO\n\nThe browser could not open any of these files:\n\n'
      + CLIP_CANDIDATES.join('\n')
      + '\n\nThey must sit next to index.html with the name spelled exactly,\n'
      + 'including the space in "execute (me)" and the space before ";".\n\n'
      + 'The animation is still playing (without sound) so you can watch it.\n'
      + 'Open the console (F12) for the exact network error.';
    showBoot(fatal);
    console.error('[world.execute(me);] ALL audio candidates failed.'
      + ' lastSrc=' + (audio.currentSrc || audio.getAttribute('src'))
      + ' networkState=' + audio.networkState
      + ' readyState=' + audio.readyState
      + ' error=' + (audio.error ? audio.error.code : 'none'));
    note('ALL candidates failed — no audio, animation continues silently', true);
    note('networkState=' + audio.networkState + ' readyState=' + audio.readyState
      + ' error=' + (audio.error ? audio.error.code : 'none')
      + ' currentSrc=' + (audio.currentSrc || '(none)'));
    showBoot(fatal);              /* the log tail must not overwrite the reason */
    requestFrame();
  }
  function audioReady() {
    /* ignore a readiness event that belongs to a superseded attempt */
    var d = audio.duration;
    if (!d || !isFinite(d) || d <= 0) return;
    if (settled && audioOK) return;
    settled = true;
    audioOK = true;
    clearTimeout(loadWatch);
    el.boot.classList.add('gone');
    fatal = '';
    console.info('[world.execute(me);] audio loaded: "' + describe() + '"  duration=' + d.toFixed(3) + 's');
    note('audio ready: "' + describe() + '" duration=' + d.toFixed(3) + 's');
    requestFrame();
  }
  function armLoadWatchdog() {
    clearTimeout(loadWatch);
    loadWatch = setTimeout(function () {
      if (settled) return;
      var d = audio.duration;
      note('watchdog: no metadata after 3.5 s (duration=' + d
        + ' networkState=' + audio.networkState + ' readyState=' + audio.readyState + ')');
      if (!d || !isFinite(d) || d <= 0) audioFailed();
      else audioReady();
    }, 3500);
  }

  audio.addEventListener('loadedmetadata', function () {
    if (isFinite(audio.duration) && audio.duration > 1) {
      DUR = audio.duration;
      EM.Lyrics.cues[EM.Lyrics.count - 1].end = DUR;
    }
    el.ttot.textContent = EM.fmtTime(DUR);
    audioReady();
  });
  audio.addEventListener('canplay', audioReady);
  audio.addEventListener('durationchange', function () {
    if (isFinite(audio.duration) && audio.duration > 1) { DUR = audio.duration; el.ttot.textContent = EM.fmtTime(DUR); }
  });
  audio.addEventListener('error', audioFailed);
  audio.addEventListener('stalled', function () { armLoadWatchdog(); });
  audio.addEventListener('timeupdate', function () { requestFrame(); refreshBar(); });
  audio.addEventListener('progress', refreshBar);
  audio.addEventListener('seeked', function () { requestFrame(); lastQ = -1; });
  audio.addEventListener('playing', function () { running = true; paintPlay(); if (video.paused && useVideo) video.play().catch(function () {}); });
  audio.addEventListener('pause', function () { running = false; paintPlay(); if (useVideo) video.pause(); });
  audio.addEventListener('play', function () { running = true; paintPlay(); });
  audio.addEventListener('ended', function () { ended = true; endedAt = t; running = false; paintPlay(); requestFrame(); });
  video.addEventListener('ended', function () { ended = true; endedAt = t; running = false; paintPlay(); requestFrame(); });
  var endedAt = 0;
  armLoadWatchdog();

  function showBoot(m) {
    if (!el.boot) return;
    el.boot.textContent = m;
    el.boot.classList.remove('gone');
    el.boot.classList.toggle('fatal', !!fatal);
  }

  /* ---------- on-screen startup log ---------------------------------------
     Every decision the loader makes is recorded and, on the debug overlay,
     printed on the canvas itself. That way a failure is diagnosable without
     opening the developer console. */
  function note(msg, fatalFlag) {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    var ms = Math.round(now - T0);
    bootLog.push({ t: ms, m: msg, fatal: !!fatalFlag });
    /* while the film is still starting, show the tail of the log on screen so
       a stall is visible without opening the developer console */
    if (el.boot && !settled) {
      var tail = bootLog.slice(-3).map(function (e) { return '[' + e.t + 'ms] ' + e.m; }).join('\n');
      el.boot.textContent = tail;
    }
    if (dbgOn) requestFrame();
  }
  function bootText() {
    var out = [];
    for (var i = 0; i < bootLog.length; i++) out.push('[' + bootLog[i].t + 'ms] ' + bootLog[i].m);
    return out.join('\n');
  }

  /* ---------- rAF that survives pausing, seeking and even a crash ----------
     Two rules, both learned the hard way:
       1. the heartbeat is NOT gated on playback, so the film draws even when
          the audio could not be opened (otherwise a broken file gives you a
          permanently black screen with no explanation);
       2. a throwing frame is caught and rescheduled, so one bad frame can
          never kill the loop for the rest of the session. */
  var pending = 0, frameErrors = 0, noAudio = false;
  function requestFrame() {
    if (pending) return;
    pending = requestAnimationFrame(tick);
  }
  /* the heartbeat: while playing, rAF already chains itself; when paused or
     stalled it keeps the cursor, easing and diagnostics alive */
  setInterval(function () { requestFrame(); }, 100);

  /* ---------- geometry ---------------------------------------------------- */
  function resize() {
    var st = el.stage.getBoundingClientRect();
    CW = Math.max(320, Math.round(st.width));
    CH = Math.max(200, Math.round(st.height));
    DPR = Math.min(2, window.devicePixelRatio || 1);
    /* virtual stage: 1600x900, letterboxed inside the real viewport */
    U = Math.min(CW / 1600, CH / 900);
    W = 1600; H = 900;
    offX = (CW - W * U) / 2;
    offY = (CH - H * U) / 2;

    view.width = Math.round(CW * DPR); view.height = Math.round(CH * DPR);
    view.style.width = CW + 'px'; view.style.height = CH + 'px';
    fx.width = Math.max(64, Math.round(CW / 4)); fx.height = Math.max(36, Math.round(CH / 4));
    rebuildGrainPattern();
    EM.WorldLayer.frame(W, H, U, 0, 0);
    requestFrame();
  }
  window.addEventListener('resize', resize);

  /* the grain tile has to be re-fetched from the context after a resize */
  function rebuildGrainPattern() {
    if (!grainTile) return;
    try { grainPattern = vctx.createPattern(grainTile, 'repeat'); } catch (e) { grainPattern = null; }
  }

  /* set up the virtual-stage transform on the single canvas */
  function resetView() {
    D.bind(vctx, W, H);
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.fillStyle = '#000';
    vctx.fillRect(0, 0, view.width, view.height);
    vctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    vctx.translate(offX, offY);
    vctx.scale(U, U);
    vctx.translate(W / 2, H / 2);   /* origin at the centre of the virtual stage */
    vctx.globalAlpha = 1;
    vctx.globalCompositeOperation = 'source-over';
    vctx.setLineDash([]);
    vctx.lineDashOffset = 0;
    vctx.shadowBlur = 0;
    vctx.filter = 'none';
  }

  /* ==========================================================================
     UP-SYNCED PARTICLE EVENTS
     Deterministic slots: every 16 s the pool recycles, and each slot fires on
     a real MIDI onset. Pure function of t, so scrub-safe.
     ======================================================================== */
  var SLOTS = 220, SLOT_SPAN = 16;
  var slots = new Array(SLOTS);
  for (var i = 0; i < SLOTS; i++) {
    var win = i * SLOT_SPAN;
    var ons = EM.onsetsBetween(win, win + SLOT_SPAN);
    slots[i] = {
      t0: win,
      ons: ons,
      /* one particle per onset, capped */
      parts: ons.slice(0, 26).map(function (o, k) {
        var h1 = hash(i * 977 + k * 31), h2 = hash(i * 3391 + k * 71), h3 = hash(i * 5527 + k * 13);
        return { dt: o[0] / 1000 - win, ang: h1 * Math.PI * 2, sp: 90 + h2 * 340,
                 size: 2 + h3 * 7, life: 0.55 + h1 * 0.95, kind: h3 > 0.72 ? 1 : 0,
                 lo: o[1], hi: o[2] };
      })
    };
  }

  function drawEvents(w, pal, time) {
    var si = Math.floor(time / SLOT_SPAN);
    var s = slots[((si % SLOTS) + SLOTS) % SLOTS];
    if (!s || s.t0 !== si * SLOT_SPAN) return;
    for (var i = 0; i < s.parts.length; i++) {
      var pt = s.parts[i];
      var dt = time - s.t0 - pt.dt;
      if (dt < 0 || dt > pt.life) continue;
      var q = dt / pt.life;
      var rad = 40 + EM.E.outQuart(q) * pt.sp * (1 + w.heat * 0.7);
      var x = Math.cos(pt.ang) * rad, y = Math.sin(pt.ang) * rad * 0.82;
      var al = (1 - q) * 0.55;
      if (pt.kind) {
        /* note-shaped: a short burst ring, brightness from MIDI velocity */
        vctx.lineWidth = 1.6 / U * U;
        vctx.strokeStyle = rgba(w.pal.hot, al * 0.9);
        vctx.beginPath(); vctx.arc(0, 0, rad, pt.ang - 0.22, pt.ang + 0.22); vctx.stroke();
      }
      vctx.fillStyle = rgba(pal.accent, al);
      vctx.beginPath(); vctx.arc(x, y, pt.size, 0, EM.TAU); vctx.fill();
      if (!reduce && pt.kind) {
        vctx.strokeStyle = rgba(pal.accent, al * 0.5);
        vctx.beginPath(); vctx.moveTo(x, y);
        vctx.lineTo(Math.cos(pt.ang) * 280, Math.sin(pt.ang) * 280 * 0.82); vctx.stroke();
      }
    }
  }

  /* the note itself, as a pitch bar floating in the frame */
  function drawPitchBar(w, pal, time, side) {
    var ons = EM.onsetsBetween(time - 1.05, time + 0.02);
    var bx = (side < 0 ? -W * 0.468 : W * 0.436);
    vctx.lineWidth = 1;
    vctx.strokeStyle = rgba(pal.grid, 0.35);
    vctx.beginPath(); vctx.moveTo(bx - 6, -H * 0.30); vctx.lineTo(bx - 6, H * 0.30); vctx.stroke();
    for (var i = 0; i < ons.length; i++) {
      var dt = time - ons[i][0] / 1000;
      var q = EM.clamp(dt / 1.05, 0, 1);
      var y = H * 0.30 - (ons[i][1] - 45) / 40 * H * 0.60;
      var al = Math.pow(1 - q, 1.6) * 0.75;
      vctx.fillStyle = rgba(pal.accent, al);
      vctx.fillRect(bx - 12, y - 1.4, 14 + (ons[i][2] - ons[i][1]) * 1.1, 2.8);
      /* octave tick */
      if (ons[i][1] % 12 === 0) {
        vctx.fillStyle = rgba(pal.hot, al * 0.9);
        vctx.fillRect(bx - 18, y - 1, 6, 2);
      }
    }
  }

  /* ==========================================================================
     MAIN FRAME
     Every frame is a pure function of t = audio.currentTime + syncOffset.
     Nothing else is remembered between frames, which is what makes pausing,
     resuming and seeking incapable of desynchronising the picture.
     ======================================================================== */
  function tick(nowMs) {
    pending = 0;
    try {
      renderFrame(nowMs);
      lastFrameError = '';
    } catch (err) {
      /* never let one bad frame end the film */
      frameErrors++;
      var msg = (err && err.message) ? err.message : String(err);
      if (msg !== lastFrameError) {
        lastFrameError = msg;
        console.error('[world.execute(me);] frame error:', err);
      }
      if (frameErrors === 3) {
        fatal = 'A RENDER ERROR OCCURRED\n\n' + msg
          + '\n\npress D for the debug overlay, or reload the page';
        showBoot(fatal);
      }
    }
    /* the loop is driven by rAF while playing and by the heartbeat otherwise,
       but it must ALWAYS be re-armed so a failure is never silent */
    if (running) requestFrame();
  }
  var lastFrameError = '';

  function renderFrame(nowMs) {
    /* audio.currentTime is the film's only clock — EXCEPT when the browser
       could not open the file at all, in which case a page-timer clock of the
       same nominal length takes over so the animation (and every control) is
       still watchable. Whether the fallback is in use is shown on screen. */
    var useFallback = !audioOK && started;
    var dt = lastWall ? Math.min((nowMs - lastWall) / 1000, 0.2) : 0;
    if (useFallback) {
      /* inherit wherever the audio element had got to before it failed, so a
         late failure does not snap the picture back to the start */
      var at = audio.currentTime;
      if (isFinite(at) && at > fallbackClock) fallbackClock = at;
      if (running) fallbackClock += dt;
      if (fallbackClock >= DUR - 0.002) { fallbackClock = DUR; running = false; ended = true; paintPlay(); }
      rawT = fallbackClock;
      if (audio.currentTime !== 0) { try { audio.currentTime = 0; } catch (e) {} }
    } else {
      rawT = audio.currentTime || 0;
      if (useVideo && video.videoWidth && video.duration > 0.2) {
        var want = rawT % video.duration;
        if (Math.abs(video.currentTime - want) > 0.35) video.currentTime = want;
      }
    }
    t = rawT + syncOffset;
    if (t < 0) t = 0;
    frames++;
    if (lastWall) {
      var d = (nowMs - lastWall) / 1000;
      if (d > 0 && d < 1) { fpsAcc += (1 / d - fpsAcc) * 0.06; fps = fpsAcc; }
    }
    lastWall = nowMs;
    noAudio = useFallback || (!audioOK && fatal !== '');

    /* ---- world ---------------------------------------------------------- */
    var w = EM.World.at(t);
    w.time = t;
    w.pal = EM.World.palette(w);
    w.U = U;

    resetView();
    EM.WorldLayer.draw(w, w.pal, t, 0);
    drawEvents(w, w.pal, t);
    if (t > 29 && t < 133) drawPitchBar(w, w.pal, t, -1);

    /* ---- plate ---------------------------------------------------------- */
    var cue = EM.Lyrics.at(t);
    if (cue.i !== lastQ) { lastQ = cue.i; refreshLyricText(cue); }
    EM.drawScene(cue.scene, w, t, cue);
    drawTicker(w, t);
    drawSyncBadge(w);

    /* ---- compositor: bloom + chroma + slice glitch --------------------- */
    composite(w, t);

    /* ---- debug overlay -------------------------------------------------- */
    drawHud(w, t, cue);
    updateReadouts(w, cue);
    refreshBar();
  }

  /* --------------------------------------------------------------------------
     COMPOSITOR. Real bloom (downsample -> blur -> additive) plus a chroma
     split and slice displacement that only appear when the world is under
     strain. All of it is a function of the same clock, so a seek to the middle
     of the climax looks exactly the way it did when played through.
     ------------------------------------------------------------------------ */
  function composite(w, t) {
    var c = vctx;
    var bloom = w.glow;
    if (bloom > 0.02) {
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0, 0, fx.width, fx.height);
      fctx.filter = 'blur(' + (3 + bloom * 7).toFixed(1) + 'px) brightness(' + (1.0 + bloom * 0.5).toFixed(2) + ')';
      fctx.drawImage(view, 0, 0, fx.width, fx.height);
      fctx.filter = 'none';
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(bloom * 0.40 * (reduce ? 0.5 : 1), 0, 0.5);
      c.imageSmoothingEnabled = true;
      c.drawImage(fx, 0, 0, view.width, view.height);
      c.restore();
    }

    /* chroma split during the execution storm and the argument */
    var chroma = clamp((w.heat - 0.35) * 1.5, 0, 1) * clamp((w.shatter + w.chaos * 0.5), 0, 1);
    if (chroma > 0.03 && !reduce) {
      var off = (1.5 + chroma * 7) * DPR * (0.6 + 0.4 * Math.sin(t * 30));
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = chroma * 0.28;
      c.drawImage(view, -off, 0);
      c.drawImage(view, off, 0);
      c.restore();
    }

    /* slice displacement, gated hard so it stays an accent, never a texture */
    var glitch = 0;
    if (w.heat > 0.55) glitch = clamp((w.heat - 0.55) * 1.4, 0, 1) * 0.75;
    if (w.topo === 'tangle' && w.chaos > 0.55) glitch = Math.max(glitch, (w.chaos - 0.55) * 0.9);
    if (glitch > 0.05 && !reduce) {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      var n = Math.round(3 + glitch * 10);
      for (var i = 0; i < n; i++) {
        var r1 = hash((i * 977 + Math.floor(t * 11) * 131) | 0);
        var sy = Math.floor(r1 * view.height);
        var sh = Math.max(2, Math.floor((0.004 + r1 * 0.035) * glitch * view.height));
        var dx = (hash((i * 313 + Math.floor(t * 11) * 71) | 0) - 0.5) * glitch * 70 * DPR;
        c.drawImage(view, 0, sy, view.width, sh, dx, sy, view.width, sh);
      }
      c.restore();
    }

    /* ---- film grain -----------------------------------------------------
       A fixed deterministic dither, tiled and panned slowly. It keeps the
       large near-black areas from banding and gives the whole thing the
       texture of something played back rather than rendered. */
    if (!reduce && grainPattern) {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'overlay';
      c.globalAlpha = 0.055 + w.heat * 0.02;
      var gx = -Math.floor((t * 37) % GRAIN) * DPR;
      var gy = -Math.floor((t * 61) % GRAIN) * DPR;
      c.fillStyle = grainPattern;
      c.translate(gx, gy);
      c.fillRect(-gx - GRAIN, -gy - GRAIN, view.width + GRAIN * 2, view.height + GRAIN * 2);
      c.restore();
    }

    /* ---- in / out fades -------------------------------------------------
       The film opens out of black and closes into it, so the first lyric
       lands as an event and the last frame is allowed to be an ending. */
    var fade = 1;
    if (t < FADE_IN) fade = Math.min(fade, Math.max(0, t / FADE_IN));
    if (t > DUR - FADE_OUT) fade = Math.min(fade, Math.max(0, (DUR - t) / FADE_OUT));
    if (fade < 0.999) {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = 'rgba(0,0,0,' + (1 - fade).toFixed(4) + ')';
      c.fillRect(0, 0, view.width, view.height);
      c.restore();
    }
  }

  /* a tileable monochrome noise pattern, built once */
  var GRAIN = 128, grainPattern = null, grainTile = null;
  (function buildGrain() {
    try {
      var g = document.createElement('canvas');
      g.width = GRAIN; g.height = GRAIN;
      var gc = g.getContext('2d');
      var img = gc.createImageData(GRAIN, GRAIN);
      for (var i = 0; i < GRAIN * GRAIN; i++) {
        var v = 118 + Math.round((hash(i * 2654435761) - 0.5) * 74);
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      gc.putImageData(img, 0, 0);
      grainTile = g;
      grainPattern = vctx.createPattern(g, 'repeat');
    } catch (e) { grainPattern = null; grainTile = null; }
  })();

  /* --------------------------------------------------------------------------
     TICKER: the running status strip that lives along the bottom of the frame
     ------------------------------------------------------------------------ */
  function drawTicker(w, time) {
    var y = H * 0.462;
    var pal = w.pal;
    vctx.lineWidth = 1;
    vctx.strokeStyle = rgba(pal.grid, 0.35);
    vctx.beginPath(); vctx.moveTo(-W * 0.47, y - 12); vctx.lineTo(W * 0.47, y - 12); vctx.stroke();
    vctx.font = (13) + 'px ' + D.MONO;
    vctx.fillStyle = rgba(pal.accent, 0.55 + 0.25 * EM.onsetPulse(time, 0.3));
    vctx.textAlign = 'left'; vctx.textBaseline = 'alphabetic';
    vctx.fillText('t=' + EM.fmtTime(time) + '  off=' + (syncOffset >= 0 ? '+' : '') + (syncOffset * 1000).toFixed(0) + 'ms'
      + '  rate=' + (useVideo ? video.playbackRate : audio.playbackRate).toFixed(2) + 'x'
      + '  ' + fps.toFixed(0) + 'fps', -W * 0.468, y);
    vctx.textAlign = 'right';
    vctx.fillStyle = rgba(pal.grid, 0.6);
    vctx.fillText('state=' + (ended ? 'END' : running ? 'RUN' : 'HOLD')
      + '   topo=' + w.topo + '   heat=' + w.heat.toFixed(2) + '   love=' + w.love.toFixed(2), W * 0.468, y);
    /* an unmissable marker when the film is running without its soundtrack */
    if (noAudio) {
      var la = 0.55 + 0.45 * Math.sin(time * 3);
      vctx.fillStyle = rgba(w.pal.hot, 0.9 * la);
      vctx.fillRect(-W * 0.12, -H * 0.478, W * 0.24, 26);
      vctx.font = '15px ' + D.MONO;
      vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
      vctx.fillStyle = '#0a0304';
      vctx.fillText('NO AUDIO — press D for details', 0, -H * 0.478 + 14);
      vctx.textBaseline = 'alphabetic';
    }
  }

  /* --------------------------------------------------------------------------
     SYNC BADGE: a live readout of engine-vs-audio drift. Visible with the
     debug overlay; this is the instrument used to verify the sync claim.
     ------------------------------------------------------------------------ */
  function drawSyncBadge(w) {
    if (!dbgOn) return;
    var drift = (audio.currentTime - rawT) * 1000;
    vctx.font = '13px ' + D.MONO;
    vctx.textAlign = 'right'; vctx.textBaseline = 'alphabetic';
    vctx.fillStyle = rgba(w.pal.hot, 0.8);
    vctx.fillText('audio.currentTime = ' + audio.currentTime.toFixed(4) + 's   Δframe=' + drift.toFixed(3) + 'ms', W * 0.468, -H * 0.452);
  }

  /* --------------------------------------------------------------------------
     DEBUG OVERLAY (drawn on the same canvas so it inherits the letterbox)
     ------------------------------------------------------------------------ */
  var toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('on'); }, 2400);
  }

  function drawHud(w, time, cue) {
    var pal = w.pal;
    if (dbgOn) {
      vctx.save();
      vctx.font = '12px ' + D.MONO;
      vctx.fillStyle = rgba(pal.accent, 0.75);
      vctx.textAlign = 'left'; vctx.textBaseline = 'top';
      var stat = [
        'cue #' + cue.i + '/' + EM.Lyrics.count + '  "' + cue.text.slice(0, 42) + '"',
        'scene ' + cue.scene + '   repeat ' + cue.repeat + '   dur ' + cue.dur.toFixed(3) + 's',
        'win ' + cue.t.toFixed(3) + ' → ' + cue.end.toFixed(3) + '   p=' + EM.sceneProgress(cue.scene, time, cue).toFixed(3),
        'struct ' + w.struct.toFixed(3) + ' chaos ' + w.chaos.toFixed(3) + ' warm ' + w.warm.toFixed(3) + ' rot ' + w.rot.toFixed(3),
        'shatter ' + w.shatter.toFixed(3) + ' glow ' + w.glow.toFixed(3) + ' density ' + w.density.toFixed(3),
        'scenes registered: ' + EM.SceneOrder.length + '   onsets: ' + EM.ONSETS.length,
        'audioOK=' + audioOK + '  started=' + started + '  running=' + running + '  fallback=' + (!audioOK && started),
        'audio: paused=' + audio.paused + ' t=' + audio.currentTime.toFixed(3)
          + ' dur=' + audio.duration + ' net=' + audio.networkState + ' rdy=' + audio.readyState
          + ' err=' + (audio.error ? audio.error.code : 'none'),
        'src: ' + (audio.currentSrc || audio.getAttribute('src') || '(none)')
      ];
      for (var i = 0; i < stat.length; i++) vctx.fillText(stat[i], -W * 0.468, -H * 0.455 + i * 17);
      vctx.restore();

      /* the startup log, drawn on the canvas so no console is needed */
      vctx.save();
      vctx.font = '11px ' + D.MONO;
      vctx.textAlign = 'left'; vctx.textBaseline = 'top';
      var y = H * 0.10, shown = bootLog.slice(-16);
      vctx.fillStyle = 'rgba(2,4,6,0.72)';
      vctx.fillRect(-W * 0.468, y - 6, W * 0.52, shown.length * 14 + 14);
      for (i = 0; i < shown.length; i++) {
        vctx.fillStyle = shown[i].fatal ? rgba(pal.hot, 0.95) : rgba(pal.accent, 0.62);
        vctx.fillText('[' + shown[i].t + 'ms] ' + shown[i].m, -W * 0.462, y + i * 14);
      }
      vctx.restore();
    }
  }

  /* --------------------------------------------------------------------------
     DOM readouts
     ------------------------------------------------------------------------ */
  var lastBarT = -1;
  function refreshBar() {
    var m = audio;
    var d = DUR || 1;
    var p = clamp((t) / d, 0, 1);
    if (Math.abs(t - lastBarT) < 0.016) return;
    lastBarT = t;
    el.barFill.style.width = (p * 100).toFixed(3) + '%';
    el.barHead.style.left = (p * 100).toFixed(3) + '%';
    el.tcur.textContent = EM.fmtTime(t);
    el.tcur.title = t.toFixed(3) + 's';
    try {
      if (m.buffered && m.buffered.length) {
        var end = m.buffered.end(m.buffered.length - 1);
        el.barBuf.style.width = clamp(end / d, 0, 1) * 100 + '%';
      }
    } catch (e) { /* non-seekable stream: no buffer bar */ }
  }

  var lastLyricI = -1;
  function refreshLyricText(cue) {
    if (cue.i === lastLyricI) return;
    lastLyricI = cue.i;
    el.lyric.textContent = cue.text;
    var nx = EM.Lyrics.cues[cue.i + 1];
    el.lyricNext.textContent = nx ? nx.text : '—';
    el.lyricMeta.textContent = 'line ' + (cue.i + 1) + ' / ' + EM.Lyrics.count
      + '   ' + EM.fmtTime(cue.t) + ' → ' + EM.fmtTime(cue.end)
      + '   (' + cue.dur.toFixed(2) + 's)';
    /* retrigger the typing animation */
    el.lyric.classList.remove('typing');
    void el.lyric.offsetWidth;
    el.lyric.style.setProperty('--dur', cue.dur.toFixed(3) + 's');
    el.lyric.classList.add('typing');
  }

  var lastState = '';
  function updateReadouts(w, cue) {
    var s = ended ? 'END' : running ? 'PLAYING' : (rawT > 0 ? 'PAUSED' : 'READY');
    if (s !== lastState) { el.state.textContent = s; el.state.dataset.s = s; lastState = s; }
    el.clock.textContent = EM.fmtTime(t);
  }

  /* ==========================================================================
     LYRICS IN THE HUD: the lyric is rendered *on the canvas* as well, so the
     film is complete in fullscreen with the controls hidden.
     ======================================================================== */
  /* (kept in the DOM panel: crisper, selectable, and does not fight the plates) */

  /* ==========================================================================
     CONTROLS
     ======================================================================== */
  function paintPlay() { el.play.classList.toggle('is-playing', running); el.play.setAttribute('aria-label', running ? 'Pause' : 'Play'); }

  el.play.addEventListener('click', toggle);
  el.replay.addEventListener('click', function () { seek(0); if (!running) play(); toast('replay'); });
  el.full.addEventListener('click', function () { toggleFull(); });
  el.vol.addEventListener('input', function () { audio.volume = parseFloat(el.vol.value); video.volume = audio.volume; });
  el.offReset.addEventListener('click', function () { setOffset(0); });
  el.off.addEventListener('input', function () { setOffset(parseFloat(el.off.value) / 1000); });

  function setOffset(sec) {
    syncOffset = clamp(sec, -2, 2);
    el.off.value = String(Math.round(syncOffset * 1000));
    el.offVal.textContent = (syncOffset >= 0 ? '+' : '') + (syncOffset * 1000).toFixed(0) + ' ms';
    lastQ = -1; lastBarT = -1;
    requestFrame();
  }

  function toggle() { running ? pause() : play(); }
  function play() {
    started = true; ended = false;
    el.shell.classList.add('begun');
    if (!audioOK) {
      /* no track: drive the picture with the fallback clock */
      running = true; paintPlay(); requestFrame();
      return;
    }
    var p = (useVideo && video.videoWidth) ? video.play() : audio.play();
    if (p && p.catch) p.catch(function () {
      /* browsers may refuse to start audio without a direct gesture; the
         picture must keep moving regardless */
      running = true; paintPlay(); requestFrame();
      toast('tap the picture to start the audio');
    });
    requestFrame();
  }
  function pause() {
    try { audio.pause(); } catch (e) {}
    if (useVideo) video.pause();
    running = false; paintPlay();
    el.shell.classList.add('begun');
    requestFrame();
  }
  function seek(sec) {
    sec = clamp(sec, 0, DUR || EM.AUDIO_END);
    fallbackClock = sec;
    try { audio.currentTime = sec; if (useVideo) video.currentTime = sec; } catch (e) {}
    lastQ = -1; lastBarT = -1; ended = false;
    requestFrame();
  }

  /* ---- scrubbing ---------------------------------------------------------- */
  var scrubbing = false;
  function posFromEvent(e) {
    var r = el.bar.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return clamp(x / r.width, 0, 1) * (DUR || EM.AUDIO_END);
  }
  el.bar.addEventListener('pointerdown', function (e) {
    scrubbing = true; el.bar.classList.add('scrubbing');
    el.bar.setPointerCapture && el.bar.setPointerCapture(e.pointerId);
    seek(posFromEvent(e));
  });
  el.bar.addEventListener('pointermove', function (e) {
    var p = posFromEvent(e);
    var pct = (p / (DUR || EM.AUDIO_END)) * 100;
    el.bar.style.setProperty('--hover', pct.toFixed(2) + '%');
    if (scrubbing) seek(p);
  });
  window.addEventListener('pointerup', function () {
    if (!scrubbing) return;
    scrubbing = false; el.bar.classList.remove('scrubbing');
  });
  el.bar.addEventListener('click', function (e) { seek(posFromEvent(e)); });

  /* ---- fullscreen -------------------------------------------------------- */
  function toggleFull() {
    var d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      var r = el.shell;
      (r.requestFullscreen || r.webkitRequestFullscreen || r.msRequestFullscreen || function () {}).call(r);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen || function () {}).call(d);
    }
  }
  document.addEventListener('fullscreenchange', function () {
    document.body.classList.toggle('fs', !!document.fullscreenElement);
    el.full.classList.toggle('on', !!document.fullscreenElement);
    setTimeout(resize, 60);
  });

  /* ---- keyboard ---------------------------------------------------------- */
  var dbgOn = false;
  window.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' && e.key !== ' ') return;
    switch (e.key) {
      case ' ': e.preventDefault(); toggle(); break;
      case 'ArrowLeft': e.preventDefault(); seek(t - (e.shiftKey ? 1 : 5)); break;
      case 'ArrowRight': e.preventDefault(); seek(t + (e.shiftKey ? 1 : 5)); break;
      case 'ArrowUp': e.preventDefault(); el.vol.value = String(clamp(parseFloat(el.vol.value) + 0.05, 0, 1)); audio.volume = parseFloat(el.vol.value); break;
      case 'ArrowDown': e.preventDefault(); el.vol.value = String(clamp(parseFloat(el.vol.value) - 0.05, 0, 1)); audio.volume = parseFloat(el.vol.value); break;
      case 'Home': seek(0); break;
      case 'End': seek((DUR || EM.AUDIO_END) - 0.05); break;
      case 'r': case 'R': seek(0); play(); break;
      case 'f': case 'F': toggleFull(); break;
      case 'd': case 'D': dbgOn = !dbgOn; el.dbg.classList.toggle('on', dbgOn); requestFrame(); break;
      case 'h': case 'H': document.body.classList.toggle('hide-ui'); setTimeout(resize, 60); break;
      /* millisecond sync trim */
      case ',': setOffset(syncOffset - (e.shiftKey ? 0.001 : 0.01)); break;
      case '.': setOffset(syncOffset + (e.shiftKey ? 0.001 : 0.01)); break;
      case '/': setOffset(0); break;
    }
  });

  /* ---- progress markers: one tick per lyric cue --------------------------- */
  (function buildMarks() {
    var f = document.createDocumentFragment();
    var total = DUR || EM.AUDIO_END;
    for (var i = 0; i < EM.Lyrics.count; i++) {
      var c = EM.Lyrics.cues[i];
      var d = document.createElement('i');
      d.style.left = (c.t / total * 100).toFixed(3) + '%';
      /* instrumental windows get a taller, dimmer tick */
      if (/^\(/.test(c.text)) d.className = 'inst';
      if (c.t < 1) continue;
      f.appendChild(d);
    }
    el.marks.appendChild(f);
  })();

  /* ---- first interaction: the browser needs a gesture to start audio ------ */
  el.shell.addEventListener('pointerdown', function once(e) {
    if (e.target.closest && e.target.closest('.ctrl')) return;
    if (!started) { started = true; play(); }
    el.shell.removeEventListener('pointerdown', once);
  });
  /* ---- expose the test surface used by the offline verifier -------------- */
  EM.__test = {
    ready: function () { return EM.SceneOrder.length > 0 && EM.Lyrics.count > 0; },
    cueCount: function () { return EM.Lyrics.count; },
    sceneCount: function () { return EM.SceneOrder.length; },
    missing: function () {
      var miss = [];
      for (var i = 0; i < EM.Lyrics.count; i++) {
        if (!EM.SceneReg[EM.Lyrics.cues[i].scene]) miss.push(EM.Lyrics.cues[i].scene);
      }
      return miss;
    },
    unused: function () {
      var used = {}, i;
      for (i = 0; i < EM.Lyrics.count; i++) used[EM.Lyrics.cues[i].scene] = 1;
      return EM.SceneOrder.filter(function (s) { return !used[s]; });
    },
    duration: function () { return EM.AUDIO_END; },
    mediaDuration: function () { return audio.duration; },
    syncSource: function () { return 'audio.currentTime'; },
    lastCueEnd: function () { return EM.Lyrics.cues[EM.Lyrics.count - 1].t; },
    /* render the film at an arbitrary time WITHOUT touching the audio element,
       so an automated verifier can walk the whole timeline deterministically.
       `plain` omits the live diagnostic ticker, whose fps / playback-rate
       readout is inherently frame-dependent and would defeat the comparison. */
    renderAt: function (sec, plain) {
      rawT = sec; t = sec; lastQ = -1;
      var w = EM.World.at(t); w.time = t; w.pal = EM.World.palette(w); w.U = U;
      resetView();
      EM.WorldLayer.draw(w, w.pal, t, 0);
      drawEvents(w, w.pal, t);
      if (t > 29 && t < 133) drawPitchBar(w, w.pal, t, -1);
      var cue = EM.Lyrics.at(t);
      EM.drawScene(cue.scene, w, t, cue);
      if (!plain) drawTicker(w, t);
      composite(w, t);
      return { cue: cue.i, scene: cue.scene, text: cue.text, p: EM.sceneProgress(cue.scene, t, cue) };
    },
    seekAndRender: function (sec) { seek(sec); return EM.__test.renderAt(sec); },
    state: function () {
      return {
        t: t, rawT: rawT, offset: syncOffset, running: running, started: started,
        ended: ended, cue: EM.Lyrics.at(t).i, scene: EM.Lyrics.at(t).scene,
        world: EM.World.at(t), w: view.width, h: view.height, dpr: DPR,
        fps: fps, frames: frames, video: useVideo,
        audioOK: audioOK, fallback: (!audioOK && started),
        audioTime: audio.currentTime, audioPaused: audio.paused
      };
    },
    setOffset: setOffset,
    play: play, pause: pause, seek: seek, toggleFull: toggleFull
  };

  /* ---- go ---------------------------------------------------------------- */
  note('engine starting (11 modules loaded)');
  resize();
  paintPlay();
  el.ttot.textContent = EM.fmtTime(EM.AUDIO_END);
  refreshLyricText(EM.Lyrics.at(0));
  note('first frame queued  ·  ' + EM.Lyrics.count + ' cues  ·  '
    + EM.SceneOrder.length + ' plates  ·  ' + EM.ONSETS.length + ' onsets');
  requestFrame();
  window.addEventListener('load', resize);
})(window.EM);
