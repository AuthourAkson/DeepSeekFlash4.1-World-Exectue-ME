/* ============================================================================
 * _tools/run-all.js — 9 项检查，一条命令跑完
 * ----------------------------------------------------------------------------
 *   node _tools/run-all.js            # 跑全部
 *   node _tools/run-all.js 3          # 只跑第 3 项
 *
 * 这些检查回答的是 PROMPT.md 里第 4 / 10 条那种"可自动验证"的硬要求：
 * 覆盖率、终点对齐、跳转后恢复、无缺资源、无控制台错误。
 * 判据一律是"真的画出来了"，不是"注册过了"。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./harness');

const ROOT = H.ROOT;
let PASS = 0, FAIL = 0, SKIP = 0;
const results = [];

function head(n, title) { console.log('\n────────────────────────────────────────────────────────────'); console.log('  ' + n + '. ' + title); }
function ok(msg) { PASS++; console.log('  ✓ ' + msg); }
function bad(msg) { FAIL++; console.log('  ✗ ' + msg); }
function info(msg) { console.log('    · ' + msg); }
function assert(cond, msg, detail) { if (cond) ok(msg); else bad(msg + (detail ? '  →  ' + detail : '')); }

const ONLY = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
function want(n) { return !ONLY || ONLY === n; }

/* ============================================================ 1. 语法与注册 */

function check1() {
  head(1, '语法 / 加载 / 画板注册表');
  const files = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'));
  let syntaxOk = true;
  for (const f of files) {
    try { new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f }); }
    catch (e) { syntaxOk = false; bad('语法错误 ' + f + '：' + e.message); }
  }
  if (syntaxOk) ok(files.length + ' 个 src/*.js 全部通过语法解析');

  const win = H.boot();
  const WX = win.WX;
  assert(WX && WX.CUES && WX.CUES.length === 131, '时间轴 131 条 cue', WX && WX.CUES && WX.CUES.length);
  assert(WX.S.count() === 131, '注册画板 131 块', WX.S.count());
  const missing = WX.CUES.filter(c => !WX.S.get(c.scene));
  assert(missing.length === 0, '每条 cue 都有已注册的画板', missing.map(m => m.text).join(' / '));
  const ids = WX.S.ORDER.join(',');
  assert(new Set(WX.S.ORDER).size === WX.S.ORDER.length, '画板 id 无重复');
  const extra = Object.keys(WX.S.SCENES).filter(id => WX.S.ORDER.indexOf(id) < 0);
  assert(extra.length === 0, '没有登记在案却用不上的孤儿画板', extra.join(','));
  return win;
}

/* ==================================================== 2. 歌词 / 时间轴一致性 */

function check2(win) {
  head(2, '内嵌歌词 ↔ 原始 LRC ↔ 成片时间轴 逐条一致');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = /<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
  assert(!!m, 'index.html 里内嵌了 <script id="lrc-source">');
  const embedded = H.__lrc = m ? m[1] : '';
  const raw = fs.readFileSync(path.join(ROOT, 'original', 'world.execute(me)-timeline.lrc'), 'utf8');
  const norm = s => s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  assert(norm(embedded) === norm(raw), '内嵌歌词与 original/*.lrc 逐字节一致');

  const WX = win.WX;
  const parse = txt => {
    const out = [];
    for (const line of String(txt).split(/\r?\n/)) {
      const g = /^\[(\d+):(\d+\.\d+)\](.*)$/.exec(line.trim());
      if (g) out.push({ t: parseInt(g[1], 10) * 60 + parseFloat(g[2]), text: g[3] });
    }
    return out;
  };
  const lrc = parse(embedded);
  assert(lrc.length === 131, 'LRC 解析出 131 条 cue', lrc.length);
  let mismatch = 0, worst = 0, worstAt = '';
  for (let i = 0; i < Math.min(lrc.length, WX.CUES.length); i++) {
    const dt = Math.abs(lrc[i].t - WX.CUES[i].t);
    if (dt > 0.0011 || lrc[i].text !== WX.CUES[i].text) { mismatch++; if (dt > worst) { worst = dt; worstAt = lrc[i].text; } }
  }
  assert(mismatch === 0, '131 条时间戳与文本逐条一致（容差 1 ms）', mismatch + ' 处不一致，最大 ' + (worst * 1000).toFixed(1) + ' ms @' + worstAt);
  const w = WX.EM;
  assert(Math.abs(WX.CUES[130].t - w.AUDIO_END) < 0.002, '最后一条 cue 落在音频真实时长 ' + w.AUDIO_END + ' s 上');
  return WX;
}

/* ============================================== 3. 每一块画板都真的画出了东西 */

function check3(win) {
  head(3, '131 块画板：块块真的画出了像素（不是"注册过了"）');
  const WX = win.WX, ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  const minPrim = 1e9, rows = [];
  let empty = 0, thrown = 0;
  const sigs = new Map();
  const N = WX.CUES.length;
  for (let i = 0; i < N; i++) {
    const c = WX.CUES[i];
    const T1 = (i + 1 < N) ? WX.CUES[i + 1].t : WX.EM.AUDIO_END;
    // 一句里取 3 个点：开头附近、正中间、结尾附近（长句多取几个）
    const span = Math.max(0.02, T1 - c.t);
    const ts = [c.t + span * 0.18, c.t + span * 0.5, c.t + span * 0.82];
    if (span > 4) ts.push(c.t + span * 0.32, c.t + span * 0.66);
    if (i === N - 1) ts[0] = ts[1] = ts[2] = WX.EM.AUDIO_END;
    let prims = 0, inkCells = 0, errBefore = WX.S.stats.errors;
    for (let ti = 0; ti < ts.length; ti++) {
      const f = R.frame(ts[ti], true);
      prims += f.sceneOps.length;
      const r = H.raster(f.sceneOps);
      let cells = 0;
      for (let k = 0; k < r.cover.length; k++) if (r.cover[k] > 0) cells++;
      inkCells = Math.max(inkCells, cells);
      if (ti === 0) {                          // 同一句只取一次指纹（末句三个采样点同刻）
        const sig = H.signature(f.sceneOps);
        if (!sigs.has(sig)) sigs.set(sig, []);
        sigs.get(sig).push(i + 1);
      }
      if (WX.S.stats.errors > errBefore) { thrown++; errBefore = WX.S.stats.errors; }
    }
    if (i === N - 1) { /* 终点帧 */ }
    if (prims === 0) empty++;
    if (inkCells < 60) rows.push({ i: i + 1, text: c.text, prims: prims, cells: inkCells });
    results.push({ i: i + 1, scene: c.scene, prims: prims, cells: inkCells });
  }
  assert(thrown === 0, '131 块画板播放时没有任何异常抛出', thrown + ' 块抛异常');
  assert(empty === 0, '131 块画板都产出了图元调用', empty + ' 块一个图元都没有');
  assert(rows.length === 0, '每块画板在 320×180 光栅网格上都有 ≥60 个格子被真正涂到',
    rows.length + ' 块像素过少：' + rows.slice(0, 6).map(r => '#' + r.i + '(' + r.text + ':' + r.cells + '格)').join(', '));

  const dup = [...sigs.entries()].filter(([k, v]) => v.length > 1);
  assert(dup.length === 0, '131 块画板的绘图指纹互不相同（重复歌词也真的不一样）',
    dup.length ? '有 ' + dup.length + ' 组指纹重复：' + dup.slice(0, 4).map(([k, v]) => v.join('=')).join(' , ') : '');

  const cells = results.map(r => r.cells).sort((a, b) => a - b);
  info('画板像素量：最少 ' + cells[0] + ' 格，中位 ' + cells[cells.length >> 1] + ' 格，最多 ' + cells[cells.length - 1] + ' 格');
  info('画板图元量：最少 ' + Math.min(...results.map(r => r.prims)) + '，平均 ' + Math.round(results.reduce((a, b) => a + b.prims, 0) / results.length));
  return results;
}

/* ======================================================== 4. 文字可读性下限 */

function check4(win) {
  head(4, '文字可读性下限（全片正文对比度 ≥ 4.5:1）');
  const WX = win.WX, ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  let min = 1e9, minText = '', samples = 0, low = [];
  const ratios = [];
  for (let t = 0; t < WX.EM.AUDIO_END; t += 0.75) {
    const f = R.frame(t, true);
    for (const tx of f.stats.texts) {
      samples++; ratios.push(tx.ratio);
      if (tx.ratio < min) { min = tx.ratio; minText = tx.s; }
      if (tx.ratio < 4.5) low.push({ ratio: tx.ratio, s: tx.s, t: t });
    }
  }
  assert(samples > 2000, '采样到足够多的文字绘制（' + samples + ' 处）');
  ratios.sort((a, b) => a - b);
  info('对比度分布：最低 ' + min.toFixed(2) + ':1 · p10 ' + ratios[Math.floor(ratios.length * 0.1)].toFixed(2) +
    ':1 · 中位 ' + ratios[ratios.length >> 1].toFixed(2) + ':1 · p90 ' + ratios[Math.floor(ratios.length * 0.9)].toFixed(2) + ':1');
  assert(low.length === 0, '所有被绘制的文字对比度都 ≥ 4.5:1，最低 ' + min.toFixed(2) + ':1（"' + minText.trim().slice(0, 22) + '"）',
    low.length + ' 处低于下限，例如 ' + JSON.stringify(low.slice(0, 3)));
  return min;
}

/* ============================================================ 5. 运行时自检 */

function check5(win) {
  head(5, '运行时自检（页面里真的会跑的那份代码）');
  const C = win.WX.CHECK;
  C.run();
  assert(C.ok === true, 'WX.CHECK.run() 通过：内嵌 LRC 与成片时间轴逐条一致');
  info('lrc ' + C.lrcCount + ' 条 / 时间轴 ' + C.cueCount + ' 条 / 不一致 ' + C.mismatches.length + ' 处 / 终点对齐 ' + C.audioEndOk);
  return C;
}

/* ============================================================ 6. 终点对齐 */

function check6(win) {
  head(6, '动画终点 = 音频时长，且时间轴连续覆盖全片');
  const WX = win.WX, E = WX.EM.AUDIO_END;
  const last = WX.CUES[WX.CUES.length - 1];
  assert(Math.abs(last.t - E) < 0.002, '最后一条 cue 的时间 = ' + E + ' s', last.t);
  let mono = true, cover = 0;
  for (let i = 0; i < WX.CUES.length; i++) {
    if (i && WX.CUES[i].t <= WX.CUES[i - 1].t) mono = false;
    const T1 = (i + 1 < WX.CUES.length) ? WX.CUES[i + 1].t : E;
    cover += Math.max(0, T1 - WX.CUES[i].t);
  }
  assert(mono, '131 条 cue 时间严格递增');
  assert(Math.abs(cover - E) < 0.01, '时间轴无缝覆盖 0 → ' + E + ' s（' + cover.toFixed(3) + ' s）');
  const ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  const fin = R.frame(E, true);
  const r = H.raster(fin.sceneOps);
  let cells = 0; for (let i = 0; i < r.cover.length; i++) if (r.cover[i] > 0) cells++;
  assert(fin.idx === 130 && cells > 60, '在 t = 音频终点处，第 131 块画板仍然画出完整画面（' + cells + ' 格）');
  const real = 8115 * 1152 / 44100;                 // 帧头实测：真实容器时长 211.98367 s
  const nearly = R.frame(real, true);
  let nc = 0; const rr2 = H.raster(nearly.sceneOps); for (let i = 0; i < rr2.cover.length; i++) if (rr2.cover[i] > 0) nc++;
  assert(nearly.idx === 130 && nc > 60, '真实容器时长 ' + real.toFixed(5) + ' s 处已经点亮"结束帧"（' + nc + ' 格）');
  return { cells: cells };
}

/* ======================================================= 7. 跳转后画面一致 */

function check7(win) {
  head(7, '任意跳转后画面正确恢复（渲染是 t 的纯函数）');
  const WX = win.WX, ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  const probes = [0.5, 7.4, 33.9, 60.1, 88.6, 110.9, 133.0, 148.7, 160.3, 175.5, 193.5, 205.9, 211.98];
  let bad = 0, worst = null;
  const direct = probes.map(t => H.signature(R.frame(t, true).ops));
  // 顺序播放：把 0→211.98 走一遍，再回头取同样的 t
  for (let t = 0; t <= 211.98; t += 1.7) R.frame(t, true);
  probes.forEach((t, i) => {
    const back = H.signature(R.frame(t, true).ops);
    if (back !== direct[i]) { bad++; worst = t; }
  });
  assert(bad === 0, '顺序播放后回头取同一时刻，逐调用完全一致（' + probes.length + ' 个探测点）', '不一致：' + worst);
  // 另开一个全新的运行台，独立渲染一遍，结果必须逐字节相同
  const win2 = H.boot();
  const ctx2 = win2._els.stage.getContext(), R2 = H.makeRenderer(win2.WX, ctx2);
  let bad2 = 0;
  probes.forEach((t, i) => { if (H.signature(R2.frame(t, true).ops) !== direct[i]) bad2++; });
  assert(bad2 === 0, '另一份全新实例渲染同一时刻，结果逐调用一致', bad2 + ' 处不同');
  // 往后跳 / 往回跳 / 随机跳，都必须落在同一个指纹上
  const jumps = [190, 3, 150, 45.5, 120.2, 200.4, 0.0, 211.9];
  let bad3 = 0;
  const ref = {}; probes.forEach((t, i) => ref[t] = direct[i]);
  for (const t of jumps) { R.frame(t, true); }
  probes.forEach((t, i) => { if (H.signature(R.frame(t, true).ops) !== direct[i]) bad3++; });
  assert(bad3 === 0, '打乱顺序乱跳之后，画面依旧逐调用一致', bad3 + ' 处不同');
  return probes.length;
}

/* ================================================== 8. 音频缺失时的降级行为 */

function check8(win) {
  head(8, '资源与降级：文件名、crossorigin、无声也能播');
  const src = fs.readdirSync(path.join(ROOT, 'src')).map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const all = src + '\n' + html;
  const stripComments = function (c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); };
  assert(!/<audio[^>]*crossorigin/i.test(html) && !/crossOrigin\s*=/.test(stripComments(src)), '<audio> 上没有 crossorigin（file:// 下会必然加载失败）；本检查只看去掉注释后的真实代码');
  assert(!/\bfetch\s*\(|XMLHttpRequest|import\s*\(/.test(src), '运行时不 fetch / XHR / 动态 import（双击即可跑）');
  assert(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script id="lrc-source"[\s\S]*?<\/script>/g, '')), '页面没有任何外链资源（不联网）');
  assert(!/<script[^>]+type=["']module/.test(html), '没有用 ES module（file:// 下会被 CORS 拦掉）');

  const cands = win.WX.APP.CLIP_CANDIDATES;
  assert(cands[0] === 'Mili - world.execute (me) ;.mp3', '首选文件名与 original/ 里的完全一致（两个空格都在）', cands[0]);
  const exists = fs.existsSync(path.join(ROOT, cands[0]));
  assert(exists, '首选音频文件确实躺在 index.html 同级目录：' + cands[0]);
  info('候选顺序：' + cands.join('  →  '));

  // 用"必定失败"的 Audio 跑一遍，页面必须降级到虚拟时钟，并且把真实请求过的名字打出来
  const st = win.WX.APP.state;
  assert(st.mode === 'silent', '音频缺失时降级为虚拟时钟（mode=' + st.mode + '）');
  assert(st.attempts.length === cands.length, '失败时逐个尝试了 ' + cands.length + ' 个候选名并记录下来');
  const banner = win._els.banner.innerHTML || '';
  assert(/NO AUDIO/.test(banner) && banner.indexOf(cands[0]) >= 0, '错误横幅打印了**实际请求过的完整文件名**');
  const ctx = win._els.stage.getContext(), R = H.makeRenderer(win.WX, ctx);
  const f = R.frame(42, true);
  assert(f.ops.length > 300, '没有音频也照样画：42 s 处 ' + f.ops.length + ' 个图元');
  return st;
}

/* ========================================================== 9. 性能与构图 */

function check9(win) {
  head(9, '性能与构图：图元预算 / 渲染耗时 / 内容不越界 / 无 NaN');
  const WX = win.WX, ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  let maxPrim = 0, maxMs = 0, maxT = 0, nan = 0, nanColour = 0, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  let cx0 = 1e9, cy0 = 1e9, cx1 = -1e9, cy1 = -1e9, small = 0, fullyOut = 0, mostlyOut = 0;
  const smallByCue = {};
  const offFull = [], offMost = [];
  let litMin = 1, litMax = 0;
  for (let t = 0; t < WX.EM.AUDIO_END; t += 0.9) {
    const t0 = process.hrtime.bigint();
    const f = R.frame(t, true);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > maxMs) { maxMs = ms; maxT = t; }
    if (f.ops.length > maxPrim) maxPrim = f.ops.length;
    for (const op of f.ops) {
      if (op.kind === 'image' || !op.polys) continue;   // 照片占位/图元跳过
      for (const poly of op.polys) for (const p of poly) {
        if (!isFinite(p[0]) || !isFinite(p[1])) nan++;
        if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
      }
    }
    // "核心内容"= 单个体量不大（< 舞台三分之一）的图元。大块背景/光晕/圆环
    // 允许有意地溢出画面，但每一句真正要读的东西不能跑到舞台外面去。
    for (const op of f.ops) {
      const c = typeof op.colour === 'string' ? op.colour : '';
      if (/NaN|undefined|null/.test(c) || !isFinite(op.alpha) || (op.lw !== undefined && !isFinite(op.lw))) nanColour++;
    }
    const cueKey = WX.CUES[f.idx].scene;
    smallByCue[cueKey] = smallByCue[cueKey] || { small: 0, out: 0 };
    for (const op of f.ops) {
      if (op.kind === 'image' || !op.polys) continue;   // 照片占位/图元跳过
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const poly of op.polys) for (const p of poly) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      }
      if (x1 - x0 > 520 || y1 - y0 > 420) continue;      // 背景/光晕/大圆环允许溢出
      small++; smallByCue[cueKey].small++;
      const wOp = Math.max(0.01, x1 - x0), hOp = Math.max(0.01, y1 - y0);
      const ix = Math.max(0, Math.min(x1, 1600) - Math.max(x0, 0));
      const iy = Math.max(0, Math.min(y1, 900) - Math.max(y0, 0));
      // 退化尺寸（水平/垂直线、点）按"坐标是否落在舞台内"判断，不能拿面积去除
      const inside = (x1 >= 0 && x0 <= 1600 && y1 >= 0 && y0 <= 900);
      if (!inside) {
        fullyOut++; smallByCue[cueKey].out++;
        if (offFull.length < 6) offFull.push(cueKey + ' ' + op.kind + ' @' + [x0, y0, x1, y1].map(v => v.toFixed(0)).join(','));
      }
      else if (wOp > 6 && hOp > 6 && (ix * iy) / (wOp * hOp) < 0.15) { mostlyOut++; if (offMost.length < 6) offMost.push(op.kind + ' @' + [x0, y0, x1, y1].map(v => v.toFixed(0)).join(',')); }
      if (x0 < cx0) cx0 = x0; if (x1 > cx1) cx1 = x1;
      if (y0 < cy0) cy0 = y0; if (y1 > cy1) cy1 = y1;
    }
  }
  const r = H.raster(R.frame(120, true).ops);
  assert(nan === 0, '全片没有任何 NaN / Infinity 坐标', nan + ' 个');
  assert(nanColour === 0, '全片没有任何 NaN / undefined 颜色或透明度（浏览器会静默沿用上一个颜色，最难发现的一类错）', nanColour + ' 个图元');
  assert(maxPrim < 3000, '单帧图元数在预算内（峰值 ' + maxPrim + '）');
  info('CPU 渲染一帧（不含真光栅化）：平均 < ' + maxMs.toFixed(1) + ' ms，峰值 ' + maxMs.toFixed(1) + ' ms @ ' + maxT.toFixed(1) + ' s');
  assert(maxMs < 25, 'JS 侧单帧渲染耗时 < 25 ms（峰值 ' + maxMs.toFixed(1) + ' ms）');
  // 允许"有意飞出画面"的碎片/字符雨（它们本来就该消失），但不允许哪一块画板
  // 整体画在画外 —— 那才是看不见的错误。
  const worst = Object.keys(smallByCue).map(k => ({ k: k, n: smallByCue[k].out, s: smallByCue[k].small }))
    .filter(o => o.n > 0).sort((a, b) => (b.n / b.s) - (a.n / a.s));
  const worstRatio = worst.length ? worst[0].n / worst[0].s : 0;
  assert(fullyOut / small < 0.001 && worstRatio < 0.06,
    '极少数小图元故意飞出画面（' + fullyOut + '/' + small + ' = ' + (100 * fullyOut / small).toFixed(3) + '%，最多的一块画板 ' +
    (worst.length ? worst[0].k + ' ' + (100 * worstRatio).toFixed(1) + '%' : '—') + '）',
    offFull.join(' / '));
  assert(mostlyOut / Math.max(1, small) < 0.02, '只有极少数图元大部分在画外（' + mostlyOut + '/' + small + ' = ' + (100 * mostlyOut / Math.max(1, small)).toFixed(2) + '%）', offMost.join(' / '));
  assert((maxx - minx) > 1100 && (maxy - miny) > 560,
    '画面撑满舞台（全局 bbox ' + [minx, miny, maxx, maxy].map(v => v.toFixed(0)).join(',') + '，溢出的是背景/光晕/大圆环）');
  assert(cx1 - cx0 > 900 && cy1 - cy0 > 400, '核心构图既不满溢也不缩成一团（跨度 ' + (cx1 - cx0).toFixed(0) + '×' + (cy1 - cy0).toFixed(0) + '）');
  let litTot = 0, n = 0;
  for (let t = 20; t < 200; t += 15) { const rr = H.raster(R.frame(t, true).ops); litTot += H.litFraction(rr); n++; }
  const avgLit = litTot / n;
  assert(avgLit > 0.05 && avgLit < 0.92, '画面亮度合适：平均点亮 ' + (avgLit * 100).toFixed(1) + '% 的格子（既不空屏也不糊成一片）');
  return { maxPrim, maxMs, avgLit };
}

/* ============================================== 10. 与参考 MV 的对齐（可量化） */

function check10(win) {
  head(10, '与参考 MV 的对齐：亮度包络 / 闪白 / 纯灰');
  const WX = win.WX, MV = WX.MV;
  assert(!!MV && MV.CUTS.length > 50, '嵌入了参考 MV 的剪辑表（' + (MV ? MV.CUTS.length : 0) + ' 个剪辑点）');
  assert(MV.LUM.length > 1000, '嵌入了 MV 的亮度包络（' + MV.LUM.length + ' 帧 @ ' + MV.FPS + ' fps）');
  assert(MV.FLASH.length > 5, '嵌入了 MV 的闪白时刻（' + MV.FLASH.length + ' 处）');

  const ctx = win._els.stage.getContext(), R = H.makeRenderer(WX, ctx);
  const N = 120, dur = WX.EM.AUDIO_END;
  const mine = [], theirs = [];
  let satSum = 0, satN = 0;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * dur / N;
    const f = R.frame(t, true);
    const r = H.raster(f.ops);
    let sum = 0, sat = 0, n = 0;
    for (let k = 0; k < r.rgb.length; k += 3) {
      const R0 = r.rgb[k], G0 = r.rgb[k + 1], B0 = r.rgb[k + 2];
      sum += (R0 + G0 + B0) / 3;
      const mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0);
      if (mx > 30) { sat += (mx - mn) / mx; n++; }
      satN++;
    }
    mine.push(sum / (r.rgb.length / 3) / 255);
    satSum += n ? sat / n : 0;
    const mv = MV.at(t);
    theirs.push(mv.lum);
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const ma = mean(mine), mb = mean(theirs);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < N; i++) { cov += (mine[i] - ma) * (theirs[i] - mb); va += (mine[i] - ma) ** 2; vb += (theirs[i] - mb) ** 2; }
  const r = cov / Math.sqrt(Math.max(1e-9, va * vb));
  info('我的画面亮度（' + N + ' 个采样点）中位 ' + (mine.slice().sort((a, b) => a - b)[N >> 1] * 255).toFixed(1) +
    '/255  ·  MV 亮度中位 ' + (theirs.slice().sort((a, b) => a - b)[N >> 1] * 255).toFixed(1) + '/255');
  assert(r > 0.25, '我的亮度包络与 MV 的亮度包络正相关（Pearson r = ' + r.toFixed(3) + '）',
    'r = ' + r.toFixed(3) + ' —— 说明"跟着 MV 变亮变暗"没有生效');

  // 闪白：MV 最亮的那些时刻，我这边也必须亮起来
  const idx = theirs.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(e => e[1]);
  const med = mine.slice().sort((a, b) => a - b)[N >> 1];
  const hit = idx.filter(i => mine[i] > med).length;
  assert(hit >= 6, 'MV 最亮的 8 个时刻里，我的画面有 ' + hit + ' 个也亮于自己的中位亮度');
  const lowIdx = theirs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).slice(0, 20).map(e => e[1]);
  info('MV 最暗的 20 个时刻，我的平均亮度 ' + (255 * mean(lowIdx.map(i => mine[i]))).toFixed(1) + '/255');

  // MV 屏幕上的原话，必须真的出现在我的画面上（内容取自 MV）
  let hitText = 0, checked = 0;
  const R2 = H.makeRenderer(WX, ctx);
  for (let i = 0; i < MV.TEXT.length; i += 3) {
    const [tt, txt] = MV.TEXT[i];
    if (tt > dur - 2) continue;
    checked++;
    // 打字机效果 + 快速连打（标题那段每 0.3 秒一条），所以在 [t, t+0.9] 里多点采样
    const line = String(txt);
    let found = false;
    for (const dt of [0.35, 0.55, 0.75, 0.95]) {
      const f = R2.frame(tt + dt, true);
      if (f.stats.texts.some(tx => {
        const s2 = String(tx.s).trim();
        if (s2.length < 5) return false;
        if (line.indexOf(s2) >= 0) return true;
        // 终端里可能同时留着前后几条，任意一条命中都算
        return MV.TEXT.some(e => e[0] <= tt + dt && tt + dt - e[0] < 6.5 && String(e[1]).indexOf(s2) >= 0);
      })) { found = true; break; }
    }
    if (found) hitText++;
    else if (process.env.MV_DEBUG) console.log('   MISS t=' + tt.toFixed(1) + ' "' + line.slice(0, 40) + '"');
  }
  assert(checked >= 6, 'MV 文本表可用（' + MV.TEXT.length + ' 条，抽检 ' + checked + ' 条）');
  assert(hitText >= checked * 0.85, 'MV 屏幕上的原话按时间出现在我的画面上（抽检 ' + checked + ' 条，命中 ' + hitText + ' 条）',
    '只命中 ' + hitText + '/' + checked);

  // 默认是我的彩色风格；按 M 切到 MV 模式后必须是纯灰
  const satStyle = satSum / N;
  assert(satStyle > 0.10, '默认保持本片自己的配色（画面平均饱和度 ' + satStyle.toFixed(3) + '）');
  MV.setMode(true);
  let satMV = 0, n2 = 0;
  for (let i = 0; i < 24; i++) {
    const t = (i + 0.5) * dur / 24;
    const f = R2.frame(t, true);
    const r = H.raster(f.ops);
    let sat = 0, n = 0;
    for (let k2 = 0; k2 < r.rgb.length; k2 += 3) {
      const R0 = r.rgb[k2], G0 = r.rgb[k2 + 1], B0 = r.rgb[k2 + 2];
      const mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0);
      if (mx > 30) { sat += (mx - mn) / mx; n++; }
    }
    satMV += n ? sat / n : 0; n2++;
  }
  MV.setMode(false);
  satMV /= n2;
  assert(satMV < 0.06, '按 M 切到 MV 模式时全片压成纯灰（平均饱和度 ' + satMV.toFixed(3) + '，参考 MV 实测 0.000~0.03）');
  return { r: r, sat: satStyle, satMV: satMV };
;
}

/* ------------------------------------------------------------------- main */

console.log('\n════════════════════════════════════════════════════════════');
console.log('  world.execute(me);  —— 成片自检（node _tools/run-all.js，10 项）');
console.log('  舞台 1600×900 · 光栅网格 ' + H.RW + '×' + H.RH + ' · 判据：真的画出了像素');
console.log('════════════════════════════════════════════════════════════');

const t0 = Date.now();
let win = null;
try {
  win = check1();
} catch (e) { bad('加载失败：' + e.message); }
if (win) {
  const steps = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const n of steps) {
    if (!want(n)) { SKIP++; continue; }
    try {
      if (n === 2) check2(win);
      if (n === 3) check3(win);
      if (n === 4) check4(win);
      if (n === 5) check5(win);
      if (n === 6) check6(win);
      if (n === 7) check7(win);
      if (n === 8) check8(win);
      if (n === 9) check9(win);
      if (n === 10) check10(win);
    } catch (e) {
      bad('第 ' + n + ' 项检查自身抛异常：' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
    }
  }
}
if (ONLY && ONLY === 1) { /* 只跑语法 */ }

console.log('\n────────────────────────────────────────────────────────────');
console.log('  通过 ' + PASS + ' · 失败 ' + FAIL + (SKIP ? ' · 跳过 ' + SKIP : '') + ' · 用时 ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
console.log('────────────────────────────────────────────────────────────\n');
process.exit(FAIL ? 1 : 0);
