/* ============================================================================
 * _tools/video-probe.js — 把一段视频"读"成我能用的东西
 * ----------------------------------------------------------------------------
 *   node _tools/video-probe.js <视频> [--cols=110] [--cuts=0.32] [--max=20]
 *
 * 我不长眼睛（当前模型不能看图像），但我可以把视频拆成数字与字符画：
 *   · ffprobe   读时长 / 分辨率 / 帧率 / 编码 / 音轨
 *   · ffmpeg    做镜头切换检测（scene 分数），给出每个剪辑点的时刻
 *   · ffmpeg    在每个剪辑点抽一帧（缩到 160×90）
 *   · 逐帧统计  平均亮度、主色、运动量，并把帧转成终端字符画
 * 于是"节奏、构图、明暗、剪辑结构"这些**可量化**的东西我能读到，
 * 细节审美我读不到 —— 这一点必须先说清楚，免得你以为我真看过。
 *
 * 输出（全部落在 _tools/video/ 下）：
 *   report.txt   完整报告（剪辑表 + 每帧统计 + 字符画）
 *   cut-XX.png   每个剪辑点的抽取帧
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { decodePng } = require('./_png.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.log('用法：node _tools/video-probe.js <视频文件> [--cols=110] [--cuts=0.32] [--max=20]'); process.exit(1); }
const num = (k, d) => { const m = new RegExp('--' + k + '=(\\S+)').exec(args.join(' ')); return m ? parseFloat(m[1]) : d; };
const COLS = num('cols', 110), CUT = num('cuts', 0.32), MAX = num('max', 20);

const OUT = path.join(ROOT, '_tools', 'video');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
function say(s) { log.push(s); console.log(s); }
function run(bin, a) { return execFileSync(bin, a, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }); }

/* ------------------------------------------------------------ 元信息 */

let meta = {};
try {
  const j = JSON.parse(run('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file]));
  const v = (j.streams || []).find(s => s.codec_type === 'video') || {};
  const a = (j.streams || []).find(s => s.codec_type === 'audio') || {};
  meta = {
    duration: parseFloat((j.format || {}).duration || v.duration || 0),
    size: [v.width, v.height].filter(Boolean).join('x'),
    fps: v.r_frame_rate ? (function (r) { const p = r.split('/').map(Number); return p[1] ? p[0] / p[1] : 0; })(v.r_frame_rate) : 0,
    vcodec: v.codec_name || '-', acodec: a.codec_name || '-',
    abitrate: a.bit_rate ? Math.round(a.bit_rate / 1000) + ' kbps' : '-',
    nframes: v.nb_frames || '?'
  };
} catch (e) { console.error('ffprobe 失败：' + e.message); process.exit(2); }

say('视频：' + path.basename(file));
say('时长 ' + meta.duration.toFixed(3) + ' s · ' + meta.size + ' · ' + meta.fps.toFixed(3) + ' fps · ' + meta.nframes + ' 帧');
say('视频流 ' + meta.vcodec + ' · 音频流 ' + meta.acodec + ' ' + meta.abitrate);

/* ------------------------------------------------------- 镜头切换检测 */

let cuts = [];
{
  /* select 滤镜已经把低于阈值的帧滤掉了，所以 showinfo 里出现的每一个
     pts_time 就是一个剪辑点（不同 ffmpeg 构建未必打印 lavfi.scene_score，
     但被选中的帧一定打印）。 */
  const r = require('child_process').spawnSync('ffmpeg',
    ['-hide_banner', '-i', file, '-vf', "select='gt(scene," + CUT + ")',showinfo", '-an', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  const txt = (r.stderr || '') + (r.stdout || '');
  const re = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
  let m;
  while ((m = re.exec(txt))) {
    const t = parseFloat(m[1]);
    const sc = /scene_score=([0-9.]+)/.exec(txt.slice(m.index, m.index + 400));
    cuts.push({ t: t, s: sc ? parseFloat(sc[1]) : CUT });
  }
}
cuts = cuts.filter(c => isFinite(c.t)).sort((a, b) => a.t - b.t);
say('');
say('镜头切换（scene > ' + CUT + '）：' + cuts.length + ' 个剪辑点');
if (cuts.length) {
  const gaps = cuts.map((c, i) => c.t - (i ? cuts[i - 1].t : 0));
  const per = median(gaps);
  say('  平均镜头长度 ' + per.toFixed(2) + ' s（最短 ' + Math.min.apply(null, gaps).toFixed(2) +
    ' · 最长 ' + Math.max.apply(null, gaps).toFixed(2) + '）');
  say('  前 30 秒的剪辑点：' + cuts.filter(c => c.t < 30).map(c => c.t.toFixed(2)).join('  '));
  // 节奏：每 15 秒里有几个剪辑点
  const bins = {};
  cuts.forEach(c => { const b = Math.floor(c.t / 15) * 15; bins[b] = (bins[b] || 0) + 1; });
  say('  每 15 秒剪辑数：' + Object.keys(bins).sort((a, b) => a - b).map(k => k + 's:' + bins[k]).join('  '));
}

/* ------------------------------------------------------------ 抽帧 */

const times = [];
const step = meta.duration / (MAX + 1);
for (let i = 1; i <= MAX; i++) times.push(step * i);
cuts.slice(0, MAX).forEach(c => { if (!times.some(t => Math.abs(t - c.t) < 0.35)) times.push(c.t + 0.25); });
times.sort((a, b) => a - b);
const picked = times.filter(t => t < meta.duration - 0.05).slice(0, MAX + 8);

say('');
say('抽 ' + picked.length + ' 帧（_tools/video/cut-XX.png，缩到 160×90 便于读）');
say('');

const stats = [];
picked.forEach((t, i) => {
  const name = 'cut-' + String(i).padStart(2, '0') + '.png';
  const f = path.join(OUT, name);
  try {
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=160:90', '-y', f]);
  } catch (e) { say('  抽帧失败 t=' + t.toFixed(2)); return; }
  if (!fs.existsSync(f)) return;
  const img = decodePng(fs.readFileSync(f));
  const s = shot(img);
  s.t = t; s.file = name; s.png = img;
  stats.push(s);
  say('t=' + t.toFixed(2).padStart(7) + ' s  ' + name +
    '   亮度 ' + s.mean.toFixed(0).padStart(3) + '/255  对比 ' + s.contrast.toFixed(0).padStart(3) +
    '  主色 ' + s.palette.slice(0, 3).join(' ') + '  变化度 ' + (100 * s.change).toFixed(1) + '%');
});

/* ------------------------------------------------- 运动量 / 剪辑后亮度 */

for (let i = 1; i < stats.length; i++) {
  const a = stats[i - 1].png, b = stats[i].png;
  if (a.w !== b.w) continue;
  let d = 0, n = 0;
  for (let k = 0; k < a.px.length; k += 3) { d += Math.abs(a.px[k] - b.px[k]) + Math.abs(a.px[k + 1] - b.px[k + 1]) + Math.abs(a.px[k + 2] - b.px[k + 2]); n++; }
  stats[i].diffPrev = d / n / 3;
}

say('');
say('════════ 逐帧字符画 ════════');
stats.forEach(s => {
  say('');
  say('--- t=' + s.t.toFixed(2) + 's  ' + s.file + '  亮度 ' + s.mean.toFixed(0) + '  主色 ' + s.palette.slice(0, 4).join(' ') + ' ---');
  say(ascii(s.png, COLS));
});

fs.writeFileSync(path.join(OUT, 'report.txt'), log.join('\n') + '\n', 'utf8');
say('');
say('报告：' + path.relative(ROOT, path.join(OUT, 'report.txt')));
say('说明：字符画能读出构图/明暗/剪辑节奏；审美细节我读不到 —— 要精确复刻请再给我关键帧截图。');

/* ------------------------------------------------------------- 小工具 */

function median(a) { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1] || 0; }

function shot(img) {
  const { w, h, px } = img;
  let sum = 0, n = 0, mn = 255, mx = 0;
  const tally = new Map();
  const lab = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    const l = (px[i] + px[i + 1] + px[i + 2]) / 3;
    sum += l; n++;
    if (l < mn) mn = l; if (l > mx) mx = l;
    lab.push((px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4));
  }
  for (const v of lab) tally.set(v, (tally.get(v) || 0) + 1);
  const palette = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => {
    const v = e[0], r = ((v >> 8) & 15) * 17, g = ((v >> 4) & 15) * 17, b = (v & 15) * 17;
    return '#' + [r, g, b].map(q => q.toString(16).padStart(2, '0')).join('') + '×' + Math.round(100 * e[1] / lab.length) + '%';
  });
  return { mean: sum / n, contrast: mx - mn, palette: palette, change: 0 };
}

function ascii(img, cols) {
  const { w, h, px } = img;
  const rows = Math.max(6, Math.round(cols * h / w * 0.5));
  const grid = new Float64Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let s = 0, n = 0;
    const ax = Math.floor(c * w / cols), bx = Math.max(ax + 1, Math.floor((c + 1) * w / cols));
    const ay = Math.floor(r * h / rows), by = Math.max(ay + 1, Math.floor((r + 1) * h / rows));
    for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) { const i = (y * w + x) * 3; s += (px[i] + px[i + 1] + px[i + 2]) / 3; n++; }
    grid[r * cols + c] = n ? s / n : 0;
  }
  const sorted = Array.from(grid).sort((a, b) => a - b);
  let lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)];
  if (hi - lo < 4) { lo = 0; hi = 255; }
  const RAMP = ' .:-=+*#%@';
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      let u = Math.pow(Math.max(0, Math.min(1, (grid[r * cols + c] - lo) / (hi - lo))), 0.8);
      line += RAMP[Math.min(9, Math.floor(u * 9.99))];
    }
    out.push(line);
  }
  return out.join(String.fromCharCode(10));
}
