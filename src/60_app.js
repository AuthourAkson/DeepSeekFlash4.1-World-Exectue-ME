/* ============================================================================
 * 60_app.js — 引擎
 * ----------------------------------------------------------------------------
 * 单一时间源：t = audio.currentTime + syncOffset
 * 渲染循环只做一件事：把 t 交给"纯函数"的画面。不累计时间、不数帧、
 * 不保存跨帧可变状态。所以暂停、继续、拖动进度、跳转之后，画面必然与声音一致
 * （往回拖也不会花屏，因为第 40 秒永远画成第 40 秒）。
 *
 * 三条纪律（都是踩过的坑）：
 *   · <audio> 上绝不写 crossorigin —— file:// 下必然 MEDIA_ERR_SRC_NOT_SUPPORTED
 *   · rAF 循环无条件重新排程，异常绝不能让整个会话停止绘制
 *   · 音频缺失也要能播（虚拟时钟降级），并且把"真实请求的文件名"打出来
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D, S = WX.S, WL = WX.WL, WORLD = WX.WORLD;
  var W = WX.W, H = WX.H;

  var APP = WX.APP = {};

  /* 原始文件名里有**两个**极易被吃掉的空格：
     "Mili - world.execute (me) ;.mp3"  —— 依次尝试常见拼写，首选与 original/ 一致 */
  var CLIP_CANDIDATES = [
    'Mili - world.execute (me) ;.mp3',
    'Mili - world.execute(me) ;.mp3',
    'Mili - world.execute (me);.mp3',
    'original/Mili - world.execute (me) ;.mp3',
    'original/Mili - world.execute(me) ;.mp3'
  ];
  APP.CLIP_CANDIDATES = CLIP_CANDIDATES;

  var canvas, ctx, audio = null, pendingFrame = 0;

  var st = {
    mode: 'loading',        // loading | ready | silent
    clipIndex: -1,
    clipName: '',
    attempts: [],
    duration: EM.AUDIO_END,
    playing: false,
    offset: 0,              // 秒（毫秒级，界面上以 ms 显示）
    volume: 0.85,
    virtualStart: 0,        // 降级时钟
    virtualBase: 0,
    tailAt: null,           // 音频结束后把最后几十毫秒走完（见 clock()）
    tailFrom: 0,
    hold: null,             // 调试/截图时钟，见 APP.setHold
    cueIndex: 0,
    t: 0,
    fps: 0,
    frames: 0,
    fpsT: 0,
    reduced: false,
    hud: true,
    debug: false,
    started: false,
    errors: []
  };
  APP.state = st;

  /* ------------------------------------------------------------------ 画布 */

  var B = { full: null, small: null, tiny: null, tint: null };

  function mkCanvas() {
    var c = document.createElement('canvas');
    return c;
  }

  APP.fit = function () {
    var wrap = document.getElementById('stagewrap');
    var vw = wrap && wrap.clientWidth ? wrap.clientWidth : global.innerWidth;
    var vh = wrap && wrap.clientHeight ? wrap.clientHeight : Math.max(200, global.innerHeight - 58);
    var s = Math.min(vw / W, vh / H);
    var cw = Math.max(320, Math.round(W * s)), ch = Math.max(180, Math.round(H * s));
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    var pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw; canvas.height = ph;
      B.full.width = pw; B.full.height = ph;
      B.small.width = Math.max(2, pw >> 2); B.small.height = Math.max(2, ph >> 2);
      B.tiny.width = Math.max(2, pw >> 4); B.tiny.height = Math.max(2, ph >> 4);
      B.tint.width = pw; B.tint.height = ph;
    }
    D.bind(ctx);
    D.setBase(pw / W, ph / H, 0, 0);
    if (WX.SVG && WX.SVG.attach) WX.SVG.attach(document.getElementById('stagewrap'));
  };

  /* ---------------------------------------------------------------- 音频 */

  function loadClip(i) {
    st.clipIndex = i;
    if (i >= CLIP_CANDIDATES.length) {
      st.mode = 'silent';
      st.virtualStart = performance.now() / 1000;
      st.virtualBase = 0;
      showBanner('NO AUDIO —— 没有找到音频文件。<br>已依次请求（请核对<b>文件名里的空格</b>）：<br>' +
        st.attempts.map(function (a) { return '<code>' + a + '</code>'; }).join('<br>') +
        '<br>把 <code>original/Mili - world.execute (me) ;.mp3</code> 复制到 <code>index.html</code> 同级目录即可。' +
        '<br><span class="dim">（现在用虚拟时钟继续播放画面：动画不依赖音频，但正确性与卡点需要它。）</span>');
      return;
    }
    var name = CLIP_CANDIDATES[i];
    st.clipName = name;
    st.attempts.push(name);
    setStatus('loading', '加载 ' + name + ' …');
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = st.volume;
    // 注意：绝不设置 audio.crossOrigin —— file:// 下页面是 opaque origin，
    // 一旦要求 CORS，浏览器会直接判 MEDIA_ERR_SRC_NOT_SUPPORTED。
    audio.addEventListener('error', function () {
      var e = audio.error;
      console.warn('[audio] 加载失败：' + name + ' （code ' + (e ? e.code : '?') + '）');
      loadClip(i + 1);
    });
    audio.addEventListener('loadedmetadata', function () {
      st.duration = isFinite(audio.duration) && audio.duration > 1 ? audio.duration : EM.AUDIO_END;
      st.mode = 'ready';
      setStatus('ok', '音频就绪 · ' + st.duration.toFixed(3) + ' s · ' + name);
      console.log('[audio] 就绪：' + name + ' · duration=' + audio.duration.toFixed(3) + ' s（帧头实测 ' + EM.AUDIO_END + ' s）');
      if (Math.abs(audio.duration - EM.AUDIO_END) > 0.6) {
        console.warn('[audio] 容器报告的时长与帧头实测值不一致：' + audio.duration + ' vs ' + EM.AUDIO_END);
      }
    });
    audio.addEventListener('ended', function () {
      /* 浏览器报的时长会比帧头实测短一点：mp3 的编码器延迟/填充会被容器裁掉。
         Chrome 对这份文件报 211.9067 s，而 8,115 帧 × 1,152 ÷ 44,100 = 211.98367 s，
         差 77 ms。不让最后这 77 ms 也走完，最后那条"结束帧"就永远点不亮。
         所以音频结束后，时钟继续把尾巴以真实速度走完。 */
      st.tailFrom = isFinite(audio.duration) && audio.duration > 1 ? audio.duration : EM.AUDIO_END;
      st.tailAt = performance.now() / 1000;
      st.playing = false;
      syncPlayButton();
    });
    audio.src = name;
    audio.load();
  }

  APP.toggle = function () {
    start();
    if (st.playing) {
      pause();
    } else {
      play();
    }
  };
  function play() {
    st.started = true;
    if (st.mode === 'ready' && audio) {
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function (e) {
        console.warn('[audio] play() 被拒绝：', e && e.name);
        st.mode = 'silent';
        st.virtualStart = performance.now() / 1000;
        st.virtualBase = audio.currentTime || 0;
      });
    } else if (st.mode === 'silent') {
      st.virtualStart = performance.now() / 1000;
      st.virtualBase = st.virtualBase || 0;
    }
    st.playing = true;
    hideStart();
    syncPlayButton();
  }
  function pause() {
    st.playing = false;
    if (st.mode === 'ready' && audio) audio.pause();
    else if (st.mode === 'silent') st.virtualBase = st.t;
    syncPlayButton();
  }
  APP.play = play; APP.pause = pause;
  /** 供调试/无头自检观察真实音频元素（只读，别拿它当第二个时钟）。 */
  APP.audioEl = function () { return audio; };
  /** 调试 / 无头截图用：把渲染时钟钉在某一时刻（传 null 解除）。
   *  这不是"第二个时间源" —— 它只在调试时替换 clock() 的返回值，正常播放绝不使用。 */
  APP.setHold = function (t) { st.hold = (t === null || t === undefined) ? null : EM.clamp(t, 0, EM.AUDIO_END); };
  APP.getHold = function () { return st.hold; };

  APP.seek = function (sec, keepPlaying) {
    st.tailAt = null; st.tailFrom = 0;              // 一旦跳转，尾巴就作废
    sec = EM.clamp(sec, 0, st.duration);
    if (st.mode === 'ready' && audio) audio.currentTime = sec;
    st.virtualBase = sec;
    st.virtualStart = performance.now() / 1000;
    st.t = sec;
  };
  APP.replay = function () {
    APP.seek(0);
    play();
  };
  APP.setVolume = function (v) {
    st.volume = EM.clamp(v, 0, 1);
    if (audio) audio.volume = st.volume;
    var el = document.getElementById('vol');
    if (el) el.value = String(Math.round(st.volume * 100));
  };
  APP.setOffset = function (ms) {
    st.offset = EM.clamp(ms, -2000, 2000) / 1000;   // 只加在时钟上，绝不写回 audio.currentTime
    var el = document.getElementById('off');
    if (el) el.value = String(Math.round(ms));
    var lb = document.getElementById('offlabel');
    if (lb) lb.textContent = (ms > 0 ? '+' : '') + Math.round(ms) + ' ms';
  };

  function clock() {
    var t, now = performance.now() / 1000;
    if (st.hold !== null && st.hold !== undefined) return st.hold;   // 调试/截图：把时钟钉住
    if (st.tailAt !== undefined && st.tailAt !== null) {
      t = st.tailFrom + (now - st.tailAt);        // 见 'ended' 里的说明：走完那 77 ms 的尾巴
    } else if (st.mode === 'ready' && audio) {
      t = audio.currentTime;
    } else {
      t = st.virtualBase + (st.playing ? (now - st.virtualStart) : 0);
    }
    return EM.clamp(t + st.offset, 0, EM.AUDIO_END);
  }
  APP.clock = clock;

  /* -------------------------------------------------------------- 合成器 */

  /** MV 模式不再每帧做整屏灰度（软件渲染下要 40 ms），
   *  改成**调色板级**的一次性灰度：整个片子的颜色在源头就变灰，零额外开销。 */
  function grade() { }
  APP.grade = grade;

  /** 降采样泛光 + 色度分离 + 切片错位。只在世界"过载"时出现。 */
  /* 「内嵌维度」区域比例：旧版是合成器被舞台矩阵二次缩放后的产物
     （手机 ≈0.61、桌面 ≈0.83），这里固定成一个刻意的比例，双端一致。
     s111「If I can have you back」不启用这一层，保持干净。 */
  var DIM_INSET = 0.66;

  function composite(t, w, idx) {
    var hot = w.hot;
    if (hot < 0.30) return;
    var i, n, CW = canvas.width, CH = canvas.height;
    // 合成器全程在**设备像素空间**工作：先清掉画布上的舞台缩放矩阵。
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 除 s111 外：合成器叠进一个内嵌的缩小帧，形成"画面里的另一维"。
    var scene = (WX.CUES && WX.CUES[idx]) ? WX.CUES[idx].scene : '';
    var inset = scene !== 's111';
    var k = inset ? DIM_INSET : 1;
    var ix = 0, iy = 0, iw = CW, ih = CH;
    if (inset) { iw = CW * k; ih = CH * k; ix = (CW - iw) / 2; iy = (CH - ih) / 2; }
    // 泛光：直接从主画布降采样两次（不做整屏拷贝，软件渲染下这一条很关键）
    var bs = B.small.getContext('2d'), ts = B.tiny.getContext('2d');
    bs.clearRect(0, 0, B.small.width, B.small.height);
    bs.globalCompositeOperation = 'source-over';
    bs.drawImage(canvas, 0, 0, B.small.width, B.small.height);
    ts.clearRect(0, 0, B.tiny.width, B.tiny.height);
    ts.drawImage(B.small, 0, 0, B.tiny.width, B.tiny.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10 + 0.22 * hot;
    ctx.drawImage(B.small, ix, iy, iw, ih);
    ctx.globalAlpha = 0.08 + 0.16 * hot;
    ctx.drawImage(B.tiny, ix, iy, iw, ih);
    ctx.restore();
    // 色度分离与切片错位要读回整屏，代价高：只在世界"过载"时出现。
    // MV 模式不做色度分离 —— 参考 MV 是纯灰的，红蓝错位是我自己的效果，不是它的。
    if (hot < 0.62 || w.mvOn) return;
    B.full.getContext('2d').drawImage(canvas, 0, 0);
    var sep = (2 + 12 * hot) * (CW / 1600) * k;
    if (sep > 1.2) {
      var tn = B.tint.getContext('2d');
      tn.globalCompositeOperation = 'source-over';
      tn.clearRect(0, 0, B.tint.width, B.tint.height);
      tn.drawImage(B.full, 0, 0);
      tn.globalCompositeOperation = 'multiply';
      tn.fillStyle = 'rgb(255,40,60)';
      tn.fillRect(0, 0, B.tint.width, B.tint.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(B.tint, ix + sep, iy, iw, ih);
      tn.globalCompositeOperation = 'source-over';
      tn.clearRect(0, 0, B.tint.width, B.tint.height);
      tn.drawImage(B.full, 0, 0);
      tn.globalCompositeOperation = 'multiply';
      tn.fillStyle = 'rgb(40,120,255)';
      tn.fillRect(0, 0, B.tint.width, B.tint.height);
      ctx.drawImage(B.tint, ix - sep, iy, iw, ih);
      ctx.restore();
    }
    // prefers-reduced-motion 只关掉"切片错位"这种动得厉害的效果；
    // 泛光与色散保留，否则同一帧在开了减少动态的设备上会明显偏暗。
    if (st.reduced) return;
    // 切片错位（同样限制在内嵌帧里）
    n = Math.round(EM.clamp((hot - 0.72) * 16, 0, 8));
    for (i = 0; i < n; i++) {
      var band = EM.h(i, 31, (t * 12) | 0);
      var yIn = iy + band * (ih - 24 * k);
      var hhIn = (6 + EM.h(i, 32, (t * 12) | 0) * 40 * (CH / 900)) * k;
      var dx = (EM.h(i, 33, (t * 12) | 0) - 0.5) * 60 * (CW / 1600) * hot * k;
      ctx.drawImage(B.full, 0, (yIn - iy) / k, CW, hhIn / k, ix + dx, yIn, iw, hhIn);
    }
    if (inset) {                                    // 内嵌维度的细边
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 + 0.22 * hot;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ix, iy, iw, ih);
      ctx.restore();
    }
  }
  APP.composite = composite;

  /* ------------------------------------------------------------------ 渲染 */

  /** 把 t 时刻整个画面重画一遍（世界层 → 画板 → HUD → 合成器）。 */
  APP.render = function (t) {
    var w = WORLD.at(t);
    D.begin();
    D.setBg(w.bg);
    WL.under(t, w);
    var idx = S.render(t);
    WL.over(t, w, 'CUE ' + (idx + 1) + '/' + WX.CUES.length + '  ' + WX.CUES[idx].scene + '  ·  ' + WORLD.section(t));
    composite(t, w, idx);
    return idx;
  };

  /* --------------------------------------------------------------- 文本 UI */

  var UI = {};
  function $(id) { return document.getElementById(id); }

  function setStatus(kind, msg) {
    var el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status ' + kind;
  }
  function showBanner(html) {
    var el = $('banner');
    if (!el) return;
    el.innerHTML = html;
    el.style.display = 'block';
  }
  APP.showBanner = showBanner;
  function hideStart() {
    var el = $('start');
    if (el) el.style.display = 'none';
  }
  function syncPlayButton() {
    var b = $('play');
    if (b) b.textContent = st.playing ? '❚❚' : '▶';
  }
  APP.syncPlayButton = syncPlayButton;

  function updateUI(t) {
    var s = $('seek');
    if (s && document.activeElement !== s) s.value = String(Math.round(t * 1000));
    var tl = $('time');
    if (tl) tl.textContent = mmss(t) + ' / ' + mmss(st.duration);
    var px = $('playhead');
    if (px) px.style.left = (100 * t / st.duration) + '%';
  }
  function mmss(t) {
    var m = Math.floor(t / 60), s = t - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }
  APP.mmss = mmss;

  function updateDebug() {
    var el = $('debug');
    if (!el || !st.debug) return;
    var t = st.t, w = WORLD.at(t), c = WX.CUES[st.cueIndex];
    el.innerHTML =
      '<b>t</b> ' + t.toFixed(3) + ' s   <b>audio.currentTime</b> ' + (st.mode === 'ready' && audio ? audio.currentTime.toFixed(3) : '—') +
      '   <b>offset</b> ' + (st.offset * 1000).toFixed(0) + ' ms<br>' +
      '<b>cue</b> ' + (st.cueIndex + 1) + '/' + WX.CUES.length + '  <b>scene</b> ' + c.scene + '  <b>section</b> ' + WORLD.section(t) + '<br>' +
      '<b>text</b> ' + (c.text || '∅') + '<br>' +
      '<b>struct</b> ' + w.struct.toFixed(2) + '  <b>chaos</b> ' + w.chaos.toFixed(2) + '  <b>warm</b> ' + w.warm.toFixed(2) +
      '  <b>heat</b> ' + w.heat.toFixed(2) + '  <b>rot</b> ' + w.rot.toFixed(2) + '  <b>love</b> ' + w.love.toFixed(2) +
      '  <b>topo</b> ' + w.topoName + '<br>' +
      '<b>primitives</b> ' + D.S.calls + '   <b>fps</b> ' + st.fps.toFixed(1) + '   <b>scenes drawn</b> ' + S.stats.drawn +
      '   <b>errors</b> ' + S.stats.errors + '   <b>empty</b> ' + S.stats.empty + '<br>' +
      '<b>self-check</b> ' + (WX.CHECK && WX.CHECK.ok ? 'PASS' : 'FAIL') + '  (lrc ' + (WX.CHECK ? WX.CHECK.lrcCount : '?') +
      ' / timeline ' + (WX.CHECK ? WX.CHECK.cueCount : '?') + ' / mismatches ' + (WX.CHECK ? WX.CHECK.mismatches.length : '?') + ')<br>' +
      '<b>mv</b> ' + (w.mvOn ? 'ON' : 'off') + '  lum=' + (w.mv ? w.mv.lum.toFixed(2) : '-') +
      '  sd=' + (w.mv ? w.mv.sd.toFixed(2) : '-') + '  sinceCut=' + (w.mv ? w.mv.sinceCut.toFixed(2) : '-') + ' s<br>' +
      '<b>audio</b> ' + st.mode + '  ' + (st.clipName || '—') + '<br>' +
      '<b>errors</b> ' + (st.errors.length ? st.errors.slice(-3).join('<br>') : 'none');
  }

  function noteError(msg) {
    st.errors.push(msg);
    if (st.errors.length > 40) st.errors.shift();
    console.error(msg);
  }
  APP.noteError = noteError;

  /* ------------------------------------------------------------ 主循环 */

  function tick() {
    try {
      var t = clock();
      st.t = t;
      st.cueIndex = APP.render(t);
      updateUI(t);
      var now = performance.now() / 1000;
      st.frames++;
      if (now - st.fpsT > 0.5 || st.frames >= 30 || st.frames === 1) {   // 第一帧就写一次，别等 0.5 秒
        st.fps = st.frames / Math.max(0.001, now - st.fpsT);
        st.frames = 0; st.fpsT = now;
        updateDebug();
        var stt = $('stats');
        if (stt) stt.textContent = st.fps.toFixed(0) + ' fps · ' + D.S.calls + ' primitives · ' + S.stats.errors + ' scene errors';
      }
    } catch (e) {
      noteError('[render] ' + (e && e.stack ? e.stack.split('\n')[0] : e));
      try { st.playing = false; } catch (e2) { }
    }
    requestFrame();            // 无条件重新排程：一次异常绝不让整个会话停止绘制
  }

  function requestFrame() {
    if (pendingFrame) return;
    pendingFrame = global.requestAnimationFrame(function () { pendingFrame = 0; tick(); });
  }

  /* ------------------------------------------------------------- 交互绑定 */

  function start() {
    if (st.started) return;
    st.started = true;
    hideStart();
  }
  APP.start = start;

  var KEYS = {};
  function bindKeys() {
    global.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === ' ' || k === 'Spacebar') { e.preventDefault(); APP.toggle(); return; }
      var big = e.shiftKey;
      if (k === 'ArrowRight') { e.preventDefault(); APP.seek((audio ? (st.mode === 'ready' ? audio.currentTime : st.t) : st.t) + (big ? 1 : 5)); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); APP.seek((audio ? (st.mode === 'ready' ? audio.currentTime : st.t) : st.t) - (big ? 1 : 5)); return; }
      if (k === ',') { APP.setOffset(st.offset * 1000 - (big ? 1 : 10)); return; }
      if (k === '.') { APP.setOffset(st.offset * 1000 + (big ? 1 : 10)); return; }
      if (k === '/') { APP.setOffset(0); return; }
      if (k === 'r' || k === 'R') { APP.replay(); return; }
      if (k === 'f' || k === 'F') { APP.fullscreen(); return; }
      if (k === 'h' || k === 'H') { APP.toggleHud(); return; }
      if (k === 'd' || k === 'D') { APP.toggleDebug(); return; }
      if (k === 'm' || k === 'M') { APP.toggleMV(); return; }
      if (k === 'ArrowUp') { e.preventDefault(); APP.setVolume(st.volume + 0.05); return; }
      if (k === 'ArrowDown') { e.preventDefault(); APP.setVolume(st.volume - 0.05); return; }
      KEYS[k] = true;
    });
  }

  APP.fullscreen = function () {
    var el = document.documentElement;
    if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen(); }
    else if (document.exitFullscreen) document.exitFullscreen();
  };
  APP.toggleHud = function () {
    st.hud = !st.hud;
    var b = $('bar');
    if (b) b.style.opacity = st.hud ? '1' : '0';
    if (b) b.style.pointerEvents = st.hud ? 'auto' : 'none';
    var s = $('status');
    if (s) s.style.opacity = st.hud ? '1' : '0';
  };
  /** 在"参考 MV 的视觉语言"和"我自己的彩色版本"之间切换。 */
  APP.toggleMV = function () {
    if (!WX.MV) return;
    WX.MV.setMode(!WX.MV.ON);
    if (WX.SVG && WX.SVG.applyFilter) WX.SVG.applyFilter();
    var b = $('mv');
    if (b) { b.textContent = WX.MV.ON ? 'MV' : 'FX'; b.className = WX.MV.ON ? 'on' : ''; }
    setStatus('ok', WX.MV.ON ? 'MV 模式：按参考 MV 的纯灰 + 闪白 + 硬切' : '作者模式：冷蓝 / 体温 / 报警红的原创配色');
  };

  APP.toggleDebug = function () {
    st.debug = !st.debug;
    var el = $('debug');
    if (el) el.style.display = st.debug ? 'block' : 'none';
    updateDebug();
  };

  function bindUI() {
    var p = $('play'); if (p) p.addEventListener('click', function () { APP.toggle(); });
    var r = $('replay'); if (r) r.addEventListener('click', function () { APP.replay(); });
    var f = $('fs'); if (f) f.addEventListener('click', function () { APP.fullscreen(); });
    var h = $('hide'); if (h) h.addEventListener('click', function () { APP.toggleHud(); });
    var g = $('dbg'); if (g) g.addEventListener('click', function () { APP.toggleDebug(); });
    var mv = $('mv'); if (mv) {
      mv.textContent = (WX.MV && WX.MV.ON) ? 'MV' : 'FX';
      mv.className = (WX.MV && WX.MV.ON) ? 'on' : '';
      mv.addEventListener('click', function () { APP.toggleMV(); });
    }
    var s = $('seek');
    if (s) {
      s.min = '0'; s.max = String(Math.round(EM.AUDIO_END * 1000)); s.step = '10';
      s.addEventListener('input', function () {
        var sec = parseFloat(s.value) / 1000;
        var was = st.playing;
        APP.seek(sec);
        if (was && st.mode === 'ready' && audio) { audio.play(); }
      });
    }
    var v = $('vol'); if (v) v.addEventListener('input', function () { APP.setVolume(parseFloat(v.value) / 100); });
    var o = $('off'); if (o) o.addEventListener('input', function () { APP.setOffset(parseFloat(o.value)); });
    var orz = $('offreset'); if (orz) orz.addEventListener('click', function () { APP.setOffset(0); });
    canvas.addEventListener('mousedown', function () { start(); if (!st.playing) play(); });
    var s0 = $('start');                      // 开始遮罩盖在 canvas 上：它自己也得能接住点击
    if (s0) s0.addEventListener('click', function () { start(); play(); });
    var ticks = $('ticks');
    if (ticks) {                                     // 131 条歌词刻度
      var frag = document.createDocumentFragment();
      for (var i = 0; i < WX.CUES.length; i++) {
        var d = document.createElement('i');
        d.style.left = (100 * WX.CUES[i].t / EM.AUDIO_END) + '%';
        var txt = WX.CUES[i].text || '';
        d.className = (txt.length > 2 && txt === txt.toUpperCase()) ? 'tick major' : 'tick';
        d.title = (i + 1) + '. ' + WX.CUES[i].t.toFixed(3) + '  ' + txt;
        frag.appendChild(d);
      }
      ticks.appendChild(frag);
    }
  }

  /* ------------------------------------------------------------------ 启动 */

  APP.init = function () {
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d', { alpha: false });
    B.full = mkCanvas(); B.small = mkCanvas(); B.tiny = mkCanvas(); B.tint = mkCanvas();
    st.reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (WX.MV && WX.MV.setMode) WX.MV.setMode(WX.MV.ON);   // 上电就按 MV 的灰阶调色板来
    APP.fit();
    global.addEventListener('resize', APP.fit);
    WX.CHECK.run();
    bindUI();
    bindKeys();
    syncPlayButton();
    APP.setVolume(st.volume);
    APP.setOffset(0);
    loadClip(0);
    // 首帧就先画一张（即使音频还没就绪），避免黑屏无反应
    st.t = 0;
    APP.render(0);
    requestFrame();
    st.fpsT = performance.now() / 1000;
    global.addEventListener('error', function (ev) {
      noteError('[window.onerror] ' + (ev.message || ev.type));
    });
    // 调试叠层在 ?debug=1 时直接打开
    if (/(\?|&)debug=1/.test(global.location.search)) APP.toggleDebug();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', APP.init);
  } else {
    APP.init();
  }

})(typeof window !== 'undefined' ? window : globalThis);
