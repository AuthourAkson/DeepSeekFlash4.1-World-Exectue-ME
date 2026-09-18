/* ============================================================================
 * _tools/build-timeline.js — 从原始 LRC 重新生成 src/20_lyrics.js
 * ----------------------------------------------------------------------------
 *   node _tools/build-timeline.js            # 校验：生成结果必须与现有文件逐字节一致
 *   node _tools/build-timeline.js --write    # 真的写回（仍然会先打印差异）
 *
 * 时间轴只有**一个**事实来源：original/world.execute(me)-timeline.lrc。
 * 这个脚本把它变成 src/20_lyrics.js 里那张 cue ↔ 画板 的映射表。
 * 手改 20_lyrics.js 不会让这个脚本"跟着改"，只会让校验失败 —— 这正是它存在的意义。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LRC = path.join(ROOT, 'original', 'world.execute(me)-timeline.lrc');
const OUT = path.join(ROOT, 'src', '20_lyrics.js');

const HEADER = [
  '/* ============================================================================',
  ' * 20_lyrics.js — 作片时间轴：131 条 cue ↔ 131 块画板',
  ' * ----------------------------------------------------------------------------',
  ' * 时间是 LRC 的**实测**时间（原始文件逐字节内嵌在 index.html 的',
  ' * <script id="lrc-source"> 里，50_lrc.js 会在运行时逐条比对这两份）。',
  ' * 没有用 130 BPM 网格去套 —— 实测与网格平均差 0.11s，那是人弹出来的。',
  ' *',
  ' * 本文件由 _tools/build-timeline.js 从 original/*.lrc 生成；',
  ' * 手改这里会被运行时自检当场抓住。',
  ' * ==========================================================================*/',
  '(function (global) {',
  "  'use strict';",
  '  var WX = global.WX;',
  '',
  '  function C(stamp, text, scene) {',
  "    var m = /^(\\d+):(\\d+\\.\\d+)$/.exec(stamp);",
  '    return { t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: text, scene: scene };',
  '  }',
  '',
  '  WX.CUES = ['
].join('\n');

const FOOTER = [
  '  ];',
  '',
  '  // 最后一条 cue 落在音频终点上：它是"结束帧"，只进不出。',
  '  WX.CUES[WX.CUES.length - 1].hold = true;',
  '  // 前奏与两段纯器乐：世界层是主角，但不能是空帧。',
  '  WX.CUES[0].hold = false;',
  '',
  '  WX.S.ORDER = WX.CUES.map(function (c) { return c.scene; });',
  "})(typeof window !== 'undefined' ? window : globalThis);",
  ''
].join('\n');

function parseLrc(text) {
  const out = [];
  for (const line of String(text).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = /^\[(\d+):(\d+\.\d+)\](.*)$/.exec(line.trim());
    if (!m) continue;
    out.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3] });
  }
  return out;
}
function stamp(sec) {
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return m + ':' + String(Math.floor(s)).padStart(2, '0') + '.' + String(Math.round((s - Math.floor(s)) * 1000)).padStart(3, '0');
}

function build() {
  const cues = parseLrc(fs.readFileSync(LRC, 'utf8'));
  const rows = cues.map((c, i) =>
    '  C("' + stamp(c.t) + '", ' + JSON.stringify(c.text) + ', "s' + String(i + 1).padStart(3, '0') + '")' + (i < cues.length - 1 ? ',' : ''));
  return { text: HEADER + '\n' + rows.join('\n') + '\n' + FOOTER, n: cues.length };
}

const built = build();
const write = process.argv.indexOf('--write') >= 0;
const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

console.log('原始 LRC：' + path.relative(ROOT, LRC));
console.log('解析出 ' + built.n + ' 条 cue');

if (existing === built.text) {
  console.log('✓ src/20_lyrics.js 与从 LRC 重新生成的结果**逐字节一致**（' + built.n + ' 条 cue）');
  if (built.n !== 131) { console.error('✗ cue 数不是 131'); process.exit(1); }
  process.exit(0);
}
if (existing === null) {
  console.log('src/20_lyrics.js 不存在。');
} else {
  console.log('✗ 不一致。逐行比较（前几处）：');
  const a = existing.split('\n'), b = built.text.split('\n');
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 8; i++) {
    if (a[i] !== b[i]) {
      console.log('  行 ' + (i + 1) + '\n    现在: ' + JSON.stringify((a[i] || '').slice(0, 120)) + '\n    应为: ' + JSON.stringify((b[i] || '').slice(0, 120)));
      shown++;
    }
  }
}
if (write) {
  fs.writeFileSync(OUT, built.text, 'utf8');
  console.log('已写回 ' + path.relative(ROOT, OUT));
  process.exit(0);
}
console.log('（加 --write 才会真的写回）');
process.exit(1);
