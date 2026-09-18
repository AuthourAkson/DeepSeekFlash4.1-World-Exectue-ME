/* ============================================================================
 * _tools/read-image.js — 把一张图"读"成字符画（亮度 / 边缘 / 二值）
 * ----------------------------------------------------------------------------
 *   node _tools/read-image.js image/Switch-my-gender.png [--cols=120]
 *   node _tools/read-image.js x.png --crop=0.3,0.2,0.7,0.8 --mode=edge
 *   node _tools/read-image.js x.png --mode=bin --thr=96
 *
 * 我不长眼睛（当前模型不接受图像输入），参考图只能这样读：
 *   lum   亮度字符画 —— 构图、明暗、留白
 *   edge  Sobel 边缘 —— 线条、形状、字
 *   bin   二值图      —— 细线和刻度（阈值以下全黑）
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { decodePng } = require('./_png.js');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.log('用法：node _tools/read-image.js <图片> [--cols=120] [--crop=x0,y0,x1,y1] [--mode=lum|edge|bin] [--thr=96] [--invert]'); process.exit(1); }
const num = (k, d) => { const m = new RegExp('--' + k + '=([-0-9.]+)').exec(args.join(' ')); return m ? parseFloat(m[1]) : d; };
const MODE = (/--mode=(\w+)/.exec(args.join(' ')) || [, 'lum'])[1];
const COLS = num('cols', 120);
const THR = num('thr', 96);
const INVERT = args.indexOf('--invert') >= 0;
const cropArg = (/--crop=([-0-9.,]+)/.exec(args.join(' ')) || [, null])[1];
const CROP = cropArg ? cropArg.split(',').map(Number) : [0, 0, 1, 1];

const img = decodePng(fs.readFileSync(file));
const { w: W0, h: H0, px } = img;
const x0 = Math.floor(CROP[0] * W0), y0 = Math.floor(CROP[1] * H0);
const x1 = Math.max(x0 + 2, Math.floor(CROP[2] * W0)), y1 = Math.max(y0 + 2, Math.floor(CROP[3] * H0));
const w = x1 - x0, h = y1 - y0;
const lum = new Float32Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = ((y + y0) * W0 + (x + x0)) * 3;
  lum[y * w + x] = (px[i] + px[i + 1] + px[i + 2]) / 3;
}
const rows = Math.max(6, Math.round(COLS * h / w * 0.5));
const RAMP = ' .:-=+*#%@';
const grid = new Float64Array(COLS * rows);
for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
  const ax = Math.floor(c * w / COLS), bx = Math.max(ax + 1, Math.floor((c + 1) * w / COLS));
  const ay = Math.floor(r * h / rows), by = Math.max(ay + 1, Math.floor((r + 1) * h / rows));
  let s = 0, n = 0;
  for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) {
    let v = lum[y * w + x];
    if (MODE === 'edge') {
      const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
      const gx = lum[y * w + xp] - lum[y * w + xm], gy = lum[yp * w + x] - lum[ym * w + x];
      v = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 2.4);
    } else if (MODE === 'bin') {
      v = (lum[y * w + x] > THR) !== INVERT ? 255 : 0;
    }
    s += v; n++;
  }
  grid[r * COLS + c] = n ? s / n : 0;
}
let lo = 0, hi = 255;
if (MODE === 'lum') {
  const sorted = Array.from(grid).sort((a, b) => a - b);
  lo = sorted[Math.floor(sorted.length * 0.02)]; hi = sorted[Math.floor(sorted.length * 0.98)];
  if (hi - lo < 4) { lo = 0; hi = 255; }
}
const out = [];
for (let r = 0; r < rows; r++) {
  let line = '';
  for (let c = 0; c < COLS; c++) {
    let u = (grid[r * COLS + c] - lo) / Math.max(1, hi - lo);
    u = Math.pow(Math.max(0, Math.min(1, u)), MODE === 'edge' ? 0.6 : 0.8);
    line += RAMP[Math.min(9, Math.floor(u * 9.99))];
  }
  out.push(line);
}
console.log(file + '  ' + W0 + '×' + H0 + '  crop=' + [x0, y0, x1, y1].join(',') + '  ' + MODE.toUpperCase() +
  '  ' + COLS + '×' + rows + (MODE === 'bin' ? '  thr=' + THR : ''));
console.log(out.join('\n'));
