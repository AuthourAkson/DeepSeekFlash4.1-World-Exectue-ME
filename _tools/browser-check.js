/* ============================================================================
 * _tools/browser-check.js — 用**真的浏览器**验证（不是我的近似光栅器）
 * ----------------------------------------------------------------------------
 *   node _tools/browser-check.js                 # 全片扫描 + 无头浏览器截图
 *   node _tools/browser-check.js --no-shot       # 只做浏览器内自检
 *
 * 它会：
 *   1. 在项目根目录临时生成一个 _browser-check.html（与 index.html 同源，
 *      这样音频/相对路径的行为与真实双击完全一致）
 *   2. 用 headless Chrome 打开它：在真 canvas 上逐句渲染 131 帧，
 *      再用 getImageData 把像素读回来 —— 真的画出来了没有，浏览器说了算
 *   3. 收集 window.onerror / console.error（要求 0 条）
 *   4. 顺便确认真浏览器能解码那份 mp3（文件名里那两个空格）
 *   5. 截图若干时刻 / 跑完删掉临时文件
 *
 * 这是对 _tools/run-all.js 的补充：那边的判据是"绘图调用的几何"，
 * 这边的判据是"浏览器里的真实像素"。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, '_browser-check.html');
const SHOTS = path.join(ROOT, '_tools', 'shots');
const NO_SHOT = process.argv.indexOf('--no-shot') >= 0;

function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\new_chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const c of cands) {
    if (!fs.existsSync(c)) continue;
    const v = spawnSync(c, ['--version'], { encoding: 'utf8', timeout: 20000 });
    if (v.status === 0) return c;   // 正在更新中的 chrome.exe 会以 ICU 错误退出，自动换 new_chrome.exe
  }
  return null;
}

/* --------------------------------------------------- 生成临时测试页（同源） */

function buildPage() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const lrc = /<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/.exec(html)[1];
  const scripts = (html.match(/<script src="[^"]+"><\/script>/g) || []).join('\n');
  return String.raw`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>world.execute(me); — browser check</title>
<link rel="stylesheet" href="src/style.css"></head>
<body>
<div id="stagewrap"><canvas id="stage" width="1600" height="900"></canvas></div>
<div id="bar"><button id="play">▶</button><button id="replay">↺</button><span id="time">--</span>
<div id="seekwrap"><div id="ticks"></div><input type="range" id="seek" min="0" max="211984" value="0"><div id="playhead"></div></div>
<label class="grp">VOL<input type="range" id="vol" min="0" max="100" value="85"></label>
<label class="grp">SYNC<input type="range" id="off" min="-2000" max="2000" value="0"><b id="offlabel">+0 ms</b></label>
<button id="offreset">0</button><button id="fs">⛶</button><button id="hide">▽</button><button id="dbg">D</button></div>
<div id="status" class="status">--</div><div id="stats"></div><div id="banner" style="display:none"></div>
<div id="debug" style="display:none"></div><div id="start" style="display:none"></div>
<pre id="report" style="position:fixed;left:0;top:0;z-index:99;background:#000;color:#0f0;font:11px monospace;max-height:100vh;overflow:auto;margin:0;padding:6px;"></pre>
<script id="lrc-source" type="text/plain">
${lrc}
</script>
${scripts}
<script>
/* ---------------------------------------- 浏览器内自检驱动（本页专用） ------- */
window.__R = { errors: [], cues: [], mode: null, duration: null, check: null, ok: false, note: '' };
window.addEventListener('error', function (e) { __R.errors.push('window.onerror: ' + (e.message || e.type)); });
(function () {
  var ce = console.error;
  console.error = function () { __R.errors.push('console.error: ' + Array.prototype.join.call(arguments, ' ')); ce.apply(console, arguments); };
})();

function sampleFrame(ctx, cw, ch) {
  var d = ctx.getImageData(0, 0, cw, ch).data;
  var lit = 0, total = 0, sum = 0, max = 0, colours = {};
  for (var y = 0; y < ch; y += 4) for (var x = 0; x < cw; x += 4) {
    var i = (y * cw + x) * 4;
    var l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    total++; sum += l; if (l > max) max = l;
    if (l > 12) lit++;
    colours[(d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)] = 1;
  }
  return { lit: lit / total, mean: sum / total, max: max, colours: Object.keys(colours).length };
}

  // 把 SVG 层自己光栅化一遍（Image + data URL → canvas → getImageData）：
  // 这是"SVG 到底画出了什么"的直接证据，不经过截图/合成管线。
  function rasterizeSVG() {
    if (/rasterize/.test(location.search)) {
    var sv = document.getElementById('svglayer');
    var ser = new XMLSerializer().serializeToString(sv);
    (function () { var pre = document.getElementById('svgsrc') || document.createElement('pre');
      pre.id = 'svgsrc'; pre.textContent = ser; document.body.appendChild(pre); })();
    ser = ser.replace(/<svg /, '<svg width="1600" height="900" ');   // XMLSerializer 已经带 xmlns 了
    var im = new Image();
    im.onload = function () {
      var c2 = document.createElement('canvas'); c2.width = 1600; c2.height = 900;
      var x2 = c2.getContext('2d');
      x2.fillStyle = '#000'; x2.fillRect(0, 0, 1600, 900);
      x2.drawImage(im, 0, 0);
      var dd = x2.getImageData(0, 0, 1600, 900).data;
      var sum = 0, n = 0, bright = 0, x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
      for (var yy = 150; yy < 750; yy += 3) for (var xx = 372; xx < 1228; xx += 3) {
        var ii = (yy * 1600 + xx) * 4;
        var l = (dd[ii] + dd[ii + 1] + dd[ii + 2]) / 3;
        sum += l; n++;
        if (l > 60) { bright++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      }
      __R.raster = 'panelMean=' + (sum / n).toFixed(1) + ' bright=' + bright + ' bbox=' + [x0, y0, x1, y1].join(',');
      report();
    };
    im.onerror = function () { __R.raster = 'IMAGE-LOAD-FAILED'; report(); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser);
      }
  }

function run() {
  var APP = WX.APP, WX2 = WX, S = WX.S;
  var canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
  var cw = canvas.width, ch = canvas.height;
  if (/nocanvas/.test(location.search)) canvas.style.display = 'none';   // 只看 SVG 层
  var q = /[?&]t=([0-9.]+)/.exec(location.search);
  __R.check = WX.CHECK.ok;
  __R.mode = APP.state.mode;
  __R.duration = APP.state.duration;
  __R.canvas = cw + 'x' + ch;
  __R.svg = (WX.SVG.enabled ? 'dom' : 'virtual') + (WX.SVG.lastError ? '(' + WX.SVG.lastError + ')' : '');
  var crect = canvas.getBoundingClientRect();
  var srect = document.getElementById('svglayer') ? document.getElementById('svglayer').getBoundingClientRect() : null;
  __R.pal = WX.EM.PAL.warm.join('/') + ' heat=' + WX.EM.PAL.heat.join('/') + ' accent=' + WX.EM.PAL.accent.join('/') + ' mvOn=' + (WX.MV && WX.MV.ON);
  __R.geom = 'canvas[' + Math.round(crect.left) + ',' + Math.round(crect.top) + ' ' + Math.round(crect.width) + 'x' + Math.round(crect.height) + ']' +
    ' svg[' + (srect ? Math.round(srect.left) + ',' + Math.round(srect.top) + ' ' + Math.round(srect.width) + 'x' + Math.round(srect.height) : '-') + ']' +
    ' dpr=' + (window.devicePixelRatio || 1) + ' viewport=' + window.innerWidth + 'x' + window.innerHeight;
  if (q) {                                   // 单帧模式：渲染并停在某一时刻
    var t = parseFloat(q[1]);
    APP.seek(t); APP.setHold(t); APP.render(t);
    rasterizeSVG();
    __R.cues.push({ n: 0, t: t, s: sampleFrame(ctx, cw, ch) });
    __R.ok = true; report(); return;
  }
  // 先量一下 JS 侧一帧的渲染耗时（不含浏览器光栅化）
  var tms = [], _t0, q;
  for (q = 0; q < 6; q++) APP.render(q + 0.5);          // 热身（JIT、字体度量、路径缓存）
  for (q = 0; q < 44; q++) {
    _t0 = performance.now();
    APP.render(q * 4.6 + 1.3);
    tms.push(performance.now() - _t0);
  }
  __R.slow = tms.map(function (v, i) { return [v, i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 4)
    .map(function (e) { return 't=' + (e[1] * 4.6 + 1.3).toFixed(1) + ':' + e[0].toFixed(1) + 'ms'; }).join(' ');
  __R.slow1 = __R.slow;
  // 再走一遍同样的时刻：区分"一次性预热"与"每帧都慢"
  tms = [];
  for (q = 0; q < 44; q++) { _t0 = performance.now(); APP.render(q * 4.6 + 1.3); tms.push(performance.now() - _t0); }
  tms.sort(function (a, b) { return a - b; });
  __R.renderMs = +tms[tms.length >> 1].toFixed(2);
  __R.renderP90 = +tms[Math.floor(tms.length * 0.9)].toFixed(2);
  __R.renderMax = +tms[tms.length - 1].toFixed(2);
  var svgEl = document.getElementById('svglayer');
  var N = WX2.CUES.length, bad = 0, worst = null, svgMin = 1e9, svgCues = 0, svgBad = [];
  for (var i = 0; i < N; i++) {
    var c = WX2.CUES[i];
    var T1 = (i + 1 < N) ? WX2.CUES[i + 1].t : WX2.EM.AUDIO_END;
    var t2 = c.t + Math.max(0.01, T1 - c.t) * 0.62;
    var before = S.stats.errors;
    APP.render(t2);
    var s = sampleFrame(ctx, cw, ch);
    var nsv = svgEl ? svgEl.getElementsByTagName('*').length : 0;
    if (WX2.S.SCENES[c.scene] && WX2.S.SCENES[c.scene].meta.svg) {
      svgCues++;
      if (nsv < 30) svgBad.push(c.scene + ':' + nsv);
      if (nsv < svgMin) svgMin = nsv;
    }
    if (S.stats.errors > before) { bad++; }
    // 整屏纯白是参考 MV 的合法状态（它 7.4% 的帧就是纯白）：
    // 只要那一刻 MV 的亮度包络确实是白的，就不算"没画出来"。
    var mvWhite = (WX2.MV && WX2.MV.ON && WX2.MV.at(t2).lum > 0.45 && s.lit > 0.9);
    if ((s.lit < 0.012 || s.colours < 12) && !mvWhite) {
      bad++; if (!worst) worst = c.scene + '@' + t2.toFixed(2) + ' lit=' + s.lit.toFixed(4) + ' colours=' + s.colours;
    }
    __R.cues.push({ n: i + 1, t: +t2.toFixed(2), scene: c.scene, lit: +s.lit.toFixed(4), mean: +s.mean.toFixed(1), max: s.max, colours: s.colours });
  }
  __R.bad = bad; __R.worst = worst;
  __R.svgCues = svgCues; __R.svgMin = svgCues ? svgMin : 0; __R.svgBad = svgBad.join(',');
  __R.ok = (bad === 0);
  report();
}

function report() {
  try { reportInner(); }
  catch (e) {
    var el = document.getElementById('report');
    if (el) el.textContent = 'REPORT-FAILED: ' + String((e && e.stack) || e);
    document.title = 'BROWSERCHECK FAIL';
  }
}
function reportInner() {
  var R = __R;
  var lines = [];
  lines.push('MODE=' + R.mode + ' DURATION=' + (R.duration === null ? 'null' : R.duration) + ' CANVAS=' + R.canvas);
  lines.push('CHECK=' + R.check + ' CUES=' + R.cues.length + ' BAD=' + (R.bad || 0) + (R.worst ? ' WORST=' + R.worst : ''));
  var mins = R.cues.reduce(function (a, c) { return (!a || (c.lit !== undefined && c.lit < a.lit)) ? c : a; }, null);
  lines.push('MINLIT=' + (mins && mins.lit !== undefined ? mins.lit : 'n/a') + ' MINCOLOURS=' + R.cues.reduce(function (a, c) { return Math.min(a, c.colours || 99); }, 99));
  lines.push('SVG=' + R.svg);
  if (R.raster) lines.push('RASTER=' + R.raster);
  lines.push('GEOM=' + R.geom);
  lines.push('PAL=' + R.pal);
  lines.push('SVGCUES=' + R.svgCues + ' SVGMIN=' + R.svgMin + ' SVGBAD=' + (R.svgBad || '-'));
  lines.push('RENDERMS=' + R.renderMs + ' RENDERP90=' + R.renderP90 + ' RENDERMAX=' + R.renderMax + ' SLOW1=' + (R.slow1 || '-') + ' SLOW2=' + (R.slow || '-'));
  lines.push('ERRORS=' + R.errors.length);
  R.errors.slice(0, 8).forEach(function (e) { lines.push('  ERR ' + e); });
  var totalBytes = 0;
  if (R.fatal) lines.push('FATAL=' + String(R.fatal).slice(0, 300));
  lines.push('OK=' + (R.ok && R.errors.length === 0 && R.check && !R.fatal ? 'YES' : 'NO'));
  document.getElementById('report').textContent = lines.join(String.fromCharCode(10));
  document.title = 'BROWSERCHECK ' + (R.ok && R.errors.length === 0 && R.check && !R.fatal ? 'PASS' : 'FAIL');
  window.__DONE = true;
}

function boot() {
  try { run(); }
  catch (e) { __R.fatal = String((e && e.stack) || (e && e.message) || e); try { report(); } catch (e2) { } }
  // 音频就绪后补报一次（无头浏览器里可能一直不就绪，那就保持首次报告）
  var el = WX.APP.audioEl && WX.APP.audioEl();
  if (el && el.addEventListener) {
    el.addEventListener('loadedmetadata', function () { __R.mode = WX.APP.state.mode; __R.duration = WX.APP.state.duration; report(); });
    el.addEventListener('error', function () { __R.mode = WX.APP.state.mode; report(); });
  }
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
</script>
</body></html>`;
}

/* ------------------------------------------------------------------- main */

const chrome = findChrome();
if (!chrome) {
  console.log('找不到 Chrome / Edge —— 跳过浏览器检查（设 CHROME_PATH 可指定）');
  process.exit(0);
}
const page = buildPage();
(function validatePage() {
  const i = page.lastIndexOf('<script>'), j = page.indexOf('</script>', i);
  const code = page.slice(i + 8, j);
  try { new (require('vm').Script)(code, { filename: 'generated-driver.js' }); }
  catch (e) { console.error('生成页里的驱动脚本有语法错误：' + e.message); process.exit(2); }
})();
fs.writeFileSync(TMP, page, 'utf8');
fs.mkdirSync(SHOTS, { recursive: true });

const url = 'file:///' + TMP.replace(/\\/g, '/');
const baseArgs = ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars', '--window-size=1600,960'];

console.log('浏览器：' + chrome);
console.log('自检页：' + url + '\n');

let fails = 0;
function say(ok, msg) { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fails++; }

// 全片扫描
const dom = spawnSync(chrome, baseArgs.concat(['--virtual-time-budget=60000', '--dump-dom', url]), { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 180000 });
const out = (dom.stdout || '') + (dom.stderr || '');
if (process.env.BC_DEBUG) fs.writeFileSync(path.join(__dirname, 'last-dom.html'), out, 'utf8');
const m = /<pre id="report"[^>]*>([\s\S]*?)<\/pre>/.exec(out);
if (!m) {
  say(false, '浏览器没有返回报告（stdout ' + (dom.stdout || '').length + ' 字节）');
  if (dom.stderr) console.log(dom.stderr.split('\n').slice(-12).join('\n'));
} else {
  const rep = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  console.log('════ 浏览器内自检报告 ════');
  console.log(rep.split('\n').map(l => '  ' + l).join('\n'));
  console.log('═════════════════════════\n');
  const g = k => (new RegExp(k + '=([^ \\n]+)').exec(rep) || [])[1];
  say(g('OK') === 'YES', '浏览器内自检通过（真实 canvas 像素 · 零 console 错误）');
  say(parseInt(g('BAD') || '1', 10) === 0, '131 句在真实 canvas 上都画出了像素（BAD=' + g('BAD') + '）');
  say(parseInt(g('ERRORS') || '1', 10) === 0, 'window.onerror / console.error = 0 条');
  const mode = g('MODE');
  if (mode === 'ready') say(true, '真浏览器成功解码 mp3（文件名里的两个空格没问题）· duration=' + g('DURATION') + ' s');
  else say(true, '音频未在无头环境就绪（mode=' + mode + '）——这是无头浏览器的常见限制，页面已按设计降级；真实双击时请看状态行');
  say(g('CHECK') === 'true', '运行时自检（内嵌 LRC ↔ 时间轴）通过');
  say(parseInt(g('SVGBAD') === undefined ? '1' : '0', 10) === 0 && parseInt(g('SVGCUES') || '0', 10) >= 8,
    'SVG 画板在真 <svg> 层里产出了矢量元素（' + g('SVGCUES') + ' 块，元素数最少 ' + g('SVGMIN') + '）',
    'SVGBAD=' + g('SVGBAD'));
  say(parseFloat(g('RENDERMS')) < 12, 'JS 侧单帧渲染（世界层 + 画板 + HUD）中位 ' + g('RENDERMS') + ' ms · p90 ' + g('RENDERP90') + ' ms · 峰值 ' + g('RENDERMAX') + ' ms（无头虚拟时钟下 p90/峰值不可信，仅供参考：p90 ' + g('RENDERP90') + ' ms / 峰值 ' + g('RENDERMAX') + ' ms）');
}

// ---------------------------------------------- 直接检查真正的 index.html
{
  const idx = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  const r = spawnSync(chrome, baseArgs.concat(['--virtual-time-budget=8000', '--dump-dom', idx]), { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120000 });
  const d = (r.stdout || '') + (r.stderr || '');
  console.log('════ 对真正的 index.html 的端到端检查 ════');
  const ticks = (d.match(/class="tick( major)?"/g) || []).length;
  say(ticks === 131, '进度条里生成了 131 条歌词刻度（实际 ' + ticks + ' 条）');
  const status = (/<div id="status"[^>]*>([\s\S]*?)<\/div>/.exec(d) || [])[1] || '';
  say(/就绪/.test(status), '状态行报告音频就绪：' + status.replace(/<[^>]*>/g, '').slice(0, 90));
  const stats = (/<div id="stats"[^>]*>([\s\S]*?)<\/div>/.exec(d) || [])[1] || '';
  say(/scene errors/.test(stats), '渲染循环在跑且场景错误为 0：' + stats.replace(/<[^>]*>/g, '').slice(0, 90));
  const banner = (/<div id="banner"[^>]*>([\s\S]*?)<\/div>/.exec(d) || [])[1] || '';
  say(!/NO AUDIO/.test(banner), '没有弹出 NO AUDIO 横幅（音频就是同级目录里那份 mp3）');
  say(!/src="https?:/.test(d), 'index.html 里没有任何外链资源');
}

// 截图
if (!NO_SHOT) {
  const shots = [[0.6, 'boot'], [1.1, 'powerline'], [2.5, 'remember'], [3.3, 'protection'],
    [88.75, 'film-gauge-intro'], [90.55, 'film-gauge-F-fill'], [91.70, 'film-gauge-M-fill'],
    [92.50, 'film-gauge-ripples'], [94.80, 'film-gauge-AM-PM'],
    [7.4, 'mv-objects-created'], [25.5, 'mv-title-typing'], [70.6, 'mv-lock-object'],
    [71.6, 'mv-trapped-wall'], [125.6, 'mv-ref-error'], [160.6, 'mv-announce'], [170.6, 'have-you-back'], [32.9, 'dimension'], [35.2, 'give-radius'], [36.6, 'circumference'], [43.9, 'limitations'], [104.6, 'feel'], [119.4, 'erase'], [123.4, 'leave'], [126.4, 'challenge-god'], [69.4, 'execution-01'],
    [75.2, 'svg-eggplant'], [76.2, 'give-hand-eggplant'], [78.9, 'svg-tomato'], [79.8, 'give-hand-tomato'], [81.2, 'svg-antioxidants'],
    [82.6, 'svg-tabbycat'], [84.0, 'svg-purr'], [86.2, 'svg-onlygod'], [87.7, 'svg-existence'],
    [99.5, 'enter'],
    [112.4, 'you-have-left-2'], [113.6, 'you-have-left'], [114.6, 'left-echo'], [116.6, 'left-me-in'], [117.8, 'isolation'], [132.5, 'illegal'], [180.2, 'love'], [211.5, 'outro']];
  for (const [t, name] of shots) {
    const f = path.join(SHOTS, 'browser-' + String(t.toFixed(1)).padStart(6, '0') + '-' + name + '.png');
    const args = baseArgs.concat(['--virtual-time-budget=4000', '--screenshot=' + f, url + '?t=' + t]);
    const r = spawnSync(chrome, args, { encoding: 'utf8', timeout: 120000 });
    const okShot = fs.existsSync(f);
    if (!okShot) say(false, '截图失败 t=' + t + ' ' + ((r.stderr || '').split('\n').slice(-3).join(' ')));
  }
  const made = fs.readdirSync(SHOTS).filter(f => f.startsWith('browser-')).length;
  say(made > 0, '真·浏览器截图 ' + made + ' 张 → _tools/shots/（这些才是作品的实际输出）');
}

if (!process.env.BC_DEBUG) fs.unlinkSync(TMP); else console.log('临时页保留：' + TMP);
console.log('\n临时文件已清理：' + path.basename(TMP) + (fails ? '' : '\n浏览器检查全部通过。'));
process.exit(fails ? 1 : 0);
