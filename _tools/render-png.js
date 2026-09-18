/* ============================================================================
 * _tools/render-png.js — 把某一时刻的画面导出成 PNG
 * ----------------------------------------------------------------------------
 *   node _tools/render-png.js 82          → _tools/shots/frame-082.png
 *   node _tools/render-png.js 82 130 180  → 一次导出多帧
 *
 * 用的是本仓库自己的软件光栅器（_tools/harness.js），不装任何依赖。
 * 它有几个**已知近似**，看 PNG 的时候请记住：
 *   · 文字不做字形光栅化，落成实心块（所以字是方块，别以为作品坏了）
 *   · 渐变按扫描线中点取样
 *   · clip() 用包围盒近似
 * 想看到真正的画面，用 _tools/browser-check.js 让 headless Chrome 截一张
 * 真·canvas 的图 —— 那个才是作品的实际输出。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./harness');

const args = process.argv.slice(2).map(Number).filter(v => isFinite(v));
const times = args.length ? args : [82];
const outDir = path.join(H.ROOT, '_tools', 'shots');
fs.mkdirSync(outDir, { recursive: true });

const win = H.boot({ quiet: true });   // 只关心画面，不用听音频加载失败的告警
const WX = win.WX;
const ctx = win._els.stage.getContext();
const R = H.makeRenderer(WX, ctx);

for (const t of times) {
  const f = R.frame(t, true);
  const r = H.raster(f.ops);
  const name = 'frame-' + t.toFixed(2).padStart(6, '0') + '.png';
  const file = path.join(outDir, name);
  const bytes = H.writePng(file, r);
  const cue = WX.CUES[f.idx];
  const w = f.w;
  console.log('t=' + t.toFixed(2).padStart(7) + ' s   cue#' + String(f.idx + 1).padStart(3) + ' ' + cue.scene +
    '   "' + cue.text + '"   primitives=' + f.ops.length + '   lit=' + (100 * H.litFraction(r)).toFixed(1) + '%' +
    '\n             section=' + WX.WORLD.section(t) + '  struct=' + w.struct.toFixed(2) + ' chaos=' + w.chaos.toFixed(2) +
    ' warm=' + w.warm.toFixed(2) + ' heat=' + w.heat.toFixed(2) + ' rot=' + w.rot.toFixed(2) + ' love=' + w.love.toFixed(2) + ' topo=' + w.topoName +
    '\n             → ' + path.relative(H.ROOT, file) + ' (' + (bytes / 1024).toFixed(0) + ' KB, ' + H.RW + '×' + H.RH + ', 文字近似为方块)');
}
