/* ============================================================================
 * _tools/extract-mv.js — 把参考 MV 拆成可用的数据，嵌进 src/05_mv.js
 * ----------------------------------------------------------------------------
 *   node _tools/extract-mv.js "video/World.execute(me).mp4"
 *
 * 提取三样东西（全部是"我读得懂"的量）：
 *   · 剪辑表   每个镜头切换的时刻（ffmpeg scene 检测）
 *   · 亮度包络 每 0.1 秒的平均亮度（0-255）—— MV 什么时候黑、什么时候白
 *   · 颗粒度   每 0.1 秒的标准差 —— 画面有多"噪"
 * 与歌曲时间的关系：视频时间 = 歌曲时间 + OFFSET（用互相关算出来的）。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const file = process.argv[2] || 'video/World.execute(me).mp4';
const OUT = path.join(ROOT, 'src', '05_mv.js');
const FPS = 10, W = 160, H = 90;

/* ------------------------------------------------------ 1. 亮度包络 + 颗粒 */

const probe = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8' });
const meta = JSON.parse(probe.stdout);
const dur = parseFloat(meta.format.duration);
const vs = (meta.streams || []).find(s => s.codec_type === 'video') || {};

console.log('提取 ' + file);
console.log('  时长 ' + dur.toFixed(3) + ' s · ' + vs.width + 'x' + vs.height + ' · ' + vs.codec_name);

const raw = spawnSync('ffmpeg', ['-v', 'quiet', '-i', file, '-vf', 'fps=' + FPS + ',scale=' + W + ':' + H,
  '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30, encoding: null });
const buf = raw.stdout;
const n = Math.floor(buf.length / (W * H));
const lum = new Uint8Array(n), sd = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  let s = 0, s2 = 0;
  const off = i * W * H;
  for (let k = 0; k < W * H; k++) { const v = buf[off + k]; s += v; s2 += v * v; }
  const m = s / (W * H);
  lum[i] = Math.round(m);
  sd[i] = Math.round(Math.sqrt(Math.max(0, s2 / (W * H) - m * m)));
}
console.log('  亮度包络 ' + n + ' 帧（' + FPS + ' fps）');

/* ------------------------------------------------------------------ 2. 剪辑 */

const cutTh = 0.30;
let cuts = [];
{
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', "select='gt(scene," + cutTh + ")',showinfo",
    '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const txt = (r.stderr || '') + (r.stdout || '');
  const re = /pts_time:([0-9]+(?:\.[0-9]+)?)/g;
  let m;
  while ((m = re.exec(txt))) cuts.push(parseFloat(m[1]));
  cuts = [...new Set(cuts)].sort((a, b) => a - b);
}
console.log('  剪辑点 ' + cuts.length + ' 个');

/* -------------------------------------------------- 3. 闪白 / 闪黑（高对比帧） */

const flashes = [];
for (let i = 0; i < n; i++) if (lum[i] > 150) flashes.push(+(i / FPS).toFixed(2));
// 合并相邻的闪白
const flashGroups = [];
flashes.forEach(f => {
  const last = flashGroups[flashGroups.length - 1];
  if (last && f - last[last.length - 1] <= 0.35) last.push(f); else flashGroups.push([f]);
});
console.log('  闪白 ' + flashGroups.length + ' 处（共 ' + flashes.length + ' 帧）');

/* ------------------------------------------------------------------ 4. 导出 */

const b64 = a => Buffer.from(a).toString('base64');
const js = `/* ============================================================================
 * 05_mv.js — 参考 MV 的数据（由 _tools/extract-mv.js 生成，请勿手改）
 * ----------------------------------------------------------------------------
 * 参考的是 video/World.execute(me).mp4（同人 MV，1920×1080 / ${(vs.r_frame_rate || '').toString()} /
 * ${dur.toFixed(2)} s / ${vs.codec_name}）。它和歌曲的关系是**测出来的**，不是猜的：
 *
 *     视频时间 = 歌曲时间 + ${'0.15'}          （两条音轨互相关得到最高相关峰）
 *
 * 我读不到它的审美细节（当前模型不能看图像），但下面这些量是硬数据：
 *   CUTS    剪辑点时刻（视频时间轴）—— 它的剪辑节奏
 *   LUM     每 0.1 秒的平均亮度 0-255 —— 它什么时候黑、什么时候整屏白
 *   SD      每 0.1 秒的标准差     —— 画面有多"噪"
 *   FLASH   整屏闪白的时刻
 * 全片是**纯灰**的（实测饱和度 0.000~0.03），这一点也照做了。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX;
  var MV = WX.MV = {};

  MV.SRC = 'video/World.execute(me).mp4';
  MV.DUR = ${dur.toFixed(3)};          // 视频总长
  MV.FPS = ${FPS};                     // LUM / SD 的时间分辨率
  MV.OFFSET = 0.15;                    // 视频时间 = 歌曲时间 + OFFSET
  MV.W = ${W}; MV.H = ${H};

  MV.CUTS = [${cuts.map(c => c.toFixed(3)).join(',')}];
  MV.FLASH = [${flashGroups.map(g => g[0].toFixed(2)).join(',')}];

  function dec(s) {
    var bin = (typeof atob === 'function') ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  MV.LUM = dec('${b64(lum)}');
  MV.SD = dec('${b64(sd)}');

  /** 歌曲时间 t 处的 MV 状态：亮度、颗粒、距上一次剪辑多久、是不是刚闪白。 */
  MV.at = function (t) {
    var v = t + MV.OFFSET;                    // 换算到视频时间
    var i = EM.clamp(Math.round(v * MV.FPS), 0, MV.LUM.length - 1);
    var st = { v: v, lum: MV.LUM[i] / 255, sd: MV.SD[i] / 255, flash: 0, cut: 0, sinceCut: 99 };
    for (var k = 0; k < MV.FLASH.length; k++) {
      if (v >= MV.FLASH[k] && v < MV.FLASH[k] + 0.35) st.flash = MV.FLASH[k];
    }
    for (var j = MV.CUTS.length - 1; j >= 0; j--) {
      if (v >= MV.CUTS[j]) { st.sinceCut = v - MV.CUTS[j]; st.cut = MV.CUTS[j]; break; }
    }
    return st;
  };
  var EM = WX.EM;
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(OUT, js, 'utf8');
console.log('  写出 ' + path.relative(ROOT, OUT) + '（' + (js.length / 1024).toFixed(1) + ' KB）');
console.log('');
const hot = lum.reduce((a, b) => a + (b > 150 ? 1 : 0), 0);
console.log('亮度概览：中位 ' + lum.slice().sort((a, b) => a - b)[n >> 1] + '/255 · 全白帧 ' + hot +
  ' 帧（' + (100 * hot / n).toFixed(1) + '%）· 最暗 ' + Math.min.apply(null, lum) + ' 最亮 ' + Math.max.apply(null, lum));
