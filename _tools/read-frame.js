/* ============================================================================
 * _tools/read-frame.js — 把 MV 的某几帧"读"出来
 * ----------------------------------------------------------------------------
 *   node _tools/read-frame.js <视频> 12.5,29.7,69.3 [--offset=0.15] [--cols=150]
 *
 * 参数里的时间是**歌曲时间**（自动按 offset 换算成视频时间）。
 * 对每一帧输出三样东西：
 *   LUM   亮度字符画（看构图、明暗、留白）
 *   EDGE  Sobel 边缘字符画（看线条、形状、字）
 *   STAT  亮度/对比/主色/画面重心
 * 我看不了图像，但"读"这些足够判断：是黑是白、有没有人形、有大字还是小字、
 * 中心构图还是满幅构图、是不是闪白。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { decodePng } = require('./_png.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const timeArg = args.find(a => /^[0-9.,]+$/.test(a));
if (!file || !timeArg) { console.log('用法：node _tools/read-frame.js <视频> 12.5,29.7 [--offset=0.15] [--cols=150]'); process.exit(1); }
const num = (k, d) => { const m = new RegExp('--' + k + '=(\\S+)').exec(args.join(' ')); return m ? parseFloat(m[1]) : d; };
const OFFSET = num('offset', 0.15), COLS = num('cols', 150);
const MODE = (/--mode=(\w+)/.exec(args.join(' ')) || [, 'both'])[1];
const times = timeArg.split(',').map(Number).filter(v => isFinite(v));
const OUT = path.join(ROOT, '_tools', 'video');
fs.mkdirSync(OUT, { recursive: true });

const W = COLS, H = Math.max(8, Math.round(COLS * 9 / 16 * 0.5));
const RAMP = ' .:-=+*#%@';
const EDGE = ' .:-=+*#%@';

const log = [];
function say(s) { log.push(s); console.log(s); }

times.forEach((songT, idx) => {
  const vt = songT + OFFSET;
  const f = path.join(OUT, 'read-' + String(idx).padStart(2, '0') + '-song' + songT.toFixed(1) + '.png');
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, vt)), '-i', file,
      '-frames:v', '1', '-vf', 'scale=' + (W * 2) + ':' + (H * 2 * 2), '-y', f], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { say('抽帧失败 song=' + songT + ' s → ' + (e.stderr || e.message)); return; }
  if (!fs.existsSync(f)) { say('抽帧失败 song=' + songT); return; }
  const img = decodePng(fs.readFileSync(f));
  const { w, h, px } = img;
  const lum = new Float32Array(w * h);
  let sum = 0, mn = 255, mx = 0, cx = 0, cy = 0, tot = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
    lum[y * w + x] = l; sum += l;
    if (l < mn) mn = l; if (l > mx) mx = l;
    if (l > 24) { cx += x * l; cy += y * l; tot += l; }
  }
  const mean = sum / (w * h);
  // 主色
  const tally = new Map();
  for (let i = 0; i < px.length; i += 3) {
    if (px[i] + px[i + 1] + px[i + 2] < 30) continue;
    const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  const pal = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => {
    const v = e[0], r = ((v >> 8) & 15) * 17, g = ((v >> 4) & 15) * 17, b = (v & 15) * 17;
    return '#' + [r, g, b].map(q => q.toString(16).padStart(2, '0')).join('') + '×' + Math.round(100 * e[1] / (w * h)) + '%';
  }).join(' ');
  const sat = saturation(px, w, h);

  say('');
  say('════ song ' + songT.toFixed(2) + ' s（视频 ' + vt.toFixed(2) + ' s）  ' + path.basename(f) + ' ════');
  say('STAT 亮度 ' + mean.toFixed(1) + '/255  最暗 ' + mn.toFixed(0) + ' 最亮 ' + mx.toFixed(0) +
    '  饱和度 ' + sat.toFixed(3) + '  重心 x=' + (tot ? (100 * cx / tot / w).toFixed(0) : '-') + '% y=' + (tot ? (100 * cy / tot / h).toFixed(0) : '-') + '%');
  say('     主色 ' + (pal || '（几乎全黑）'));
  if (MODE !== 'edge') { say('LUM ─────────────────────────────────────────'); say(asciiOf(lum, w, h, false)); }
  if (MODE !== 'lum') { say('EDGE ────────────────────────────────────────'); say(asciiOf(lum, w, h, true)); }
});

fs.writeFileSync(path.join(OUT, 'read-frames.txt'), log.join('\n') + '\n', 'utf8');
say('');
say('（字符画也写进了 _tools/video/read-frames.txt）');

function asciiOf(lum, w, h, edge) {
  const grid = new Float64Array(W * H);
  let vmin = 1e9, vmax = -1e9;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let s = 0, n = 0;
    for (let y = Math.floor(r * h / H); y < Math.min(h, Math.max(Math.floor(r * h / H) + 1, Math.floor((r + 1) * h / H))); y++)
      for (let x = Math.floor(c * w / W); x < Math.min(w, Math.max(Math.floor(c * w / W) + 1, Math.floor((c + 1) * w / W))); x++) {
        let v;
        if (edge) {
          const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
          const gx = lum[y * w + xp] - lum[y * w + xm];
          const gy = lum[yp * w + x] - lum[ym * w + x];
          v = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 2.2);
        } else v = lum[y * w + x];
        s += v; n++;
      }
    grid[r * W + c] = n ? s / n : 0;
    if (grid[r * W + c] < vmin) vmin = grid[r * W + c];
    if (grid[r * W + c] > vmax) vmax = grid[r * W + c];
  }
  const out = [];
  for (let r = 0; r < H; r++) {
    let line = '';
    for (let c = 0; c < W; c++) {
      let u = (grid[r * W + c] - vmin) / Math.max(1, vmax - vmin);
      u = Math.pow(Math.max(0, Math.min(1, u)), edge ? 0.6 : 0.85);
      line += (edge ? EDGE : RAMP)[Math.min(9, Math.floor(u * 9.99))];
    }
    out.push(line);
  }
  return out.join(String.fromCharCode(10));
}

function saturation(px, w, h) {
  let s = 0, n = 0;
  for (let i = 0; i < px.length; i += 3) {
    const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
    if (mx < 24) continue;
    s += (mx - mn) / mx; n++;
  }
  return n ? s / n : 0;
}
