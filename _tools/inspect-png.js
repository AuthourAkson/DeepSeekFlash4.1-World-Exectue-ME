/* ============================================================================
 * _tools/inspect-png.js — 把一张 PNG 变成终端里的 ASCII 预览 + 统计
 * ----------------------------------------------------------------------------
 *   node _tools/inspect-png.js _tools/shots/browser-0032.9-dimension.png
 *   node _tools/inspect-png.js a.png b.png            # 对比两张（换句是否真的不同）
 *
 * 为什么要这个工具：headless Chrome 截出来的才是作品**真实**的画布输出，
 * 但在没有图形界面的环境里不能靠肉眼看图。把它转成字符画，
 * 至少能确认构图、明暗、留白和"是不是一帧全黑"。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('不是 PNG');
  let i = 8, ihdr = null, idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.slice(i + 8, i + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], colour: data[9] };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (!ihdr || (ihdr.colour !== 2 && ihdr.colour !== 6) || ihdr.depth !== 8)
    throw new Error('只支持 8bit RGB/RGBA PNG（色型 ' + (ihdr && ihdr.colour) + '）');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, bpp = ihdr.colour === 6 ? 4 : 3, stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[p + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? px[(y - 1) * stride + x - bpp] : 0;
      let v;
      if (ft === 0) v = cur;
      else if (ft === 1) v = cur + a;
      else if (ft === 2) v = cur + b;
      else if (ft === 3) v = cur + ((a + b) >> 1);
      else { // Paeth
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = cur + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c));
      }
      px[y * stride + x] = v & 255;
    }
    p += stride;
  }
  if (bpp === 4) {
    const rgb = Buffer.alloc(h * w * 3);
    for (let i = 0, n = w * h; i < n; i++) {
      const a = px[i * 4 + 3] / 255;
      rgb[i * 3] = px[i * 4] * a; rgb[i * 3 + 1] = px[i * 4 + 1] * a; rgb[i * 3 + 2] = px[i * 4 + 2] * a;
    }
    return { w, h, px: rgb };
  }
  return { w, h, px };
}

const RAMP = ' .:-=+*#%@';

function stats(img) {
  const { w, h, px } = img;
  let sum = 0, max = 0, nonBlack = 0, hist = new Array(16).fill(0);
  const colours = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    const l = (px[i] + px[i + 1] + px[i + 2]) / 3;
    sum += l; if (l > max) max = l;
    if (l > 8) nonBlack++;
    hist[Math.min(15, Math.floor(l / 16))]++;
    if ((x + y) % 7 === 0) colours.add((px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4));
  }
  const tally = new Map();
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * 3;
    if (px[i] + px[i + 1] + px[i + 2] < 30) continue;
    const lab = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    tally.set(lab, (tally.get(lab) || 0) + 1);
  }
  const palette = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(function (e) {
    const lab = e[0], r = ((lab >> 8) & 15) * 17, g = ((lab >> 4) & 15) * 17, b = (lab & 15) * 17;
    return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('') + '×' + e[1];
  }).join('  ');
  return { w, h, mean: sum / (w * h), max, nonBlack: nonBlack / (w * h), colours: colours.size, hist, palette };
}

function ascii(img, cols, auto) {
  const { w, h, px } = img;
  const rows = Math.max(8, Math.round(cols * h / w * 0.5));
  const cw = w / cols, chh = h / rows;
  const grid = new Float64Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let s = 0, n = 0;
    for (let y = Math.floor(r * chh); y < Math.min(h, (r + 1) * chh); y++)
      for (let x = Math.floor(c * cw); x < Math.min(w, (c + 1) * cw); x++) {
        const i = (y * w + x) * 3; s += (px[i] + px[i + 1] + px[i + 2]) / 3; n++;
      }
    grid[r * cols + c] = n ? s / n : 0;
  }
  // 自动对比度：把 2%~98% 分位拉伸到 0..1 并做 gamma，暗画面才看得出来结构
  let lo = 0, hi = 255;
  if (auto !== false) {
    const sorted = Array.from(grid).sort((a, b) => a - b);
    lo = sorted[Math.floor(sorted.length * 0.02)];
    hi = sorted[Math.floor(sorted.length * 0.98)];
    if (hi - lo < 4) { lo = 0; hi = 255; }
  }
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      let u = (grid[r * cols + c] - lo) / (hi - lo);
      u = Math.pow(Math.max(0, Math.min(1, u)), 0.75);
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(u * (RAMP.length - 1) + 0.5))];
    }
    out.push(line);
  }
  return out.join(String.fromCharCode(10));
}

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const colsArg = /--cols=(\d+)/.exec(process.argv.join(' '));
const cols = colsArg ? parseInt(colsArg[1], 10) : 108;
if (!files.length) { console.log('用法：node _tools/inspect-png.js <a.png> [b.png] [--cols=108]'); process.exit(1); }

const imgs = files.map(f => ({ f, img: decodePng(fs.readFileSync(f)) }));
imgs.forEach(({ f, img }) => {
  const s = stats(img);
  console.log('\n=== ' + path.basename(f) + '  ' + s.w + '×' + s.h + ' ===');
  console.log('平均亮度 ' + s.mean.toFixed(1) + '/255   峰值 ' + s.max + '   非黑像素 ' + (100 * s.nonBlack).toFixed(1) + '%   取样色数 ' + s.colours);
  console.log(ascii(img, cols));
  console.log('主色：' + s.palette);
});
if (imgs.length === 2) {
  const [a, b] = imgs;
  if (a.img.w !== b.img.w || a.img.h !== b.img.h) { console.log('\n尺寸不同，无法逐像素比较'); process.exit(0); }
  let diff = 0, n = 0;
  for (let i = 0; i < a.img.px.length; i += 3) { n++; if (Math.abs(a.img.px[i] - b.img.px[i]) + Math.abs(a.img.px[i + 1] - b.img.px[i + 1]) + Math.abs(a.img.px[i + 2] - b.img.px[i + 2]) > 24) diff++; }
  console.log('\n两张图不同像素比例：' + (100 * diff / n).toFixed(2) + '%' + (diff / n > 0.02 ? '  → 明显是两句不同的画面' : '  → 差别很小，检查一下是不是渲染没生效'));
}
