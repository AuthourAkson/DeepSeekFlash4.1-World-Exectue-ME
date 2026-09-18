/* ============================================================================
 * _tools/gauge-check.js — 验证 gender-gauge.html（单文件仪表盘）
 * ----------------------------------------------------------------------------
 *   node _tools/gauge-check.js            # 状态表 + 7 张关键帧截图
 *   node _tools/gauge-check.js --no-shot
 *
 * 做法：把 _tools/gauge-probe.js 注入 gender-gauge.html 的副本，用真 Chrome
 * 打开，逐时刻调用 setLyricTime(ms) 再把 SVG 属性读回来 —— 验证的是
 * "指针真的转到那个角度了"，不是"我以为它会转"。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const B = String.fromCharCode(92);
const NL = String.fromCharCode(10);
const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'gender-gauge.html');
const PROBE = path.join(__dirname, 'gauge-probe.js');
const TMP = path.join(ROOT, '_gauge-probe.html');
const SHOTS = path.join(ROOT, '_tools', 'shots');
const NO_SHOT = process.argv.indexOf('--no-shot') >= 0;

function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:' + B + 'Program Files' + B + 'Google' + B + 'Chrome' + B + 'Application' + B + 'chrome.exe',
    'C:' + B + 'Program Files' + B + 'Google' + B + 'Chrome' + B + 'Application' + B + 'new_chrome.exe',
    'C:' + B + 'Program Files (x86)' + B + 'Google' + B + 'Chrome' + B + 'Application' + B + 'chrome.exe',
    'C:' + B + 'Program Files (x86)' + B + 'Microsoft' + B + 'Edge' + B + 'Application' + B + 'msedge.exe'];
  for (const p of c) {
    if (!p || !fs.existsSync(p)) continue;
    const v = spawnSync(p, ['--version'], { encoding: 'utf8', timeout: 20000 });
    if (v.status === 0) return p;   // 正在更新中的 chrome.exe 会以 ICU 错误退出，自动换 new_chrome.exe
  }
  return null;
}
const chrome = findChrome();
if (!chrome) { console.log('找不到 Chrome/Edge，跳过'); process.exit(0); }

const base = ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--window-size=1600,900'];
const url = () => 'file:///' + TMP.split(B).join('/');
const html = fs.readFileSync(PAGE, 'utf8');
const probe = fs.readFileSync(PROBE, 'utf8');

function make(body, id) {
  const pre = '<pre id="' + id + '" style="position:fixed;left:0;top:0;z-index:99;color:#0f0;background:#000;font:12px monospace;padding:4px">running</pre>';
  return html.replace('</body>', pre + '<' + 'script>' + body + '<' + '/script>' + NL + '</body>');
}

let fails = 0;
const say = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fails++; };

/* ---------------------------------------------------------- 状态探测 */
fs.writeFileSync(TMP, make(probe, 'probeout'), 'utf8');
const r = spawnSync(chrome, base.concat(['--virtual-time-budget=8000', '--dump-dom', url()]), { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 120000 });
const m = /<pre id="probeout"[^>]*>([\s\S]*?)<\/pre>/.exec(r.stdout || '');
if (!m || m[1].indexOf('PROBE_OK') < 0) {
  say(false, '探针没有返回结果：' + ((m && m[1]) || '').slice(0, 200));
} else {
  const rows = m[1].split(NL).slice(1).filter(Boolean);
  console.log('════ gender-gauge.html 逐时刻状态（真浏览器读回 SVG 属性） ════');
  rows.forEach(l => console.log('  ' + l.split(String.fromCharCode(9)).join('   ')));
  console.log('════════════════════════════════════════════════════════════');
  const nums = (l, k) => { const mm = new RegExp(k + '=([-0-9.]+)').exec(l || ''); return mm ? parseFloat(mm[1]) : NaN; };
  const at = t => rows.filter(l => l.indexOf(t.toFixed(3)) === 0)[0] || '';
  say(nums(at(88.70), 'badge') > 0.25, '阶段 1（88.7s）：Configuration 弹窗可见（' + nums(at(88.70), 'badge') + '）');
  say(nums(at(88.70), 'title') > 0.25, '阶段 1：SWITCH MY GENDER 标题可见（' + nums(at(88.70), 'title') + '）');
  say(Math.abs(nums(at(88.70), 'symL') - 410) < 90, '阶段 1：左侧符号在起点（x=' + nums(at(88.70), 'symL') + '）');
  say(nums(at(90.30), 'badge') < 0.8 && nums(at(90.30), 'badge') > 0.4, '两符号结合时 Configuration 正在逐渐消失（90.3s ' + nums(at(90.30), 'badge') + '）');
  say(nums(at(90.80), 'badge') < 0.05 && nums(at(90.80), 'title') < 0.05, '结合完成时 Configuration 和 SWITCH MY GENDER 一起消失（90.8s）');
  say(nums(at(90.30), 'symL') > 500 && nums(at(90.30), 'symL') < 900, '两符号正在往中间靠（90.3s x=' + nums(at(90.30), 'symL') + '，起点 410）');
  say(nums(at(90.30), 'leftF') === 1 && nums(at(90.30), 'rightM') === 1, '左边是女性符号、右边是男性符号（分开）');
  say(nums(at(90.30), 'symL') > 500 && nums(at(90.30), 'symL') < 900, '两符号正在向中心靠（90.3s x=' + nums(at(90.30), 'symL') + '）');
  say(nums(at(91.20), 'symL') === 800, '合并完成（91.2s x=800，合并符号就位）');
  say(nums(at(92.30), 'ripple0') > 0.05, 'Do whatever：同心圆开始泛起（92.3s ripple0=' + nums(at(92.30), 'ripple0') + '）');
  say(nums(at(92.60), 'needleRot') < 30, '指针上弦从 0° 开始（92.6s ' + nums(at(92.60), 'needleRot') + '°）');
  say(Math.abs(nums(at(94.20), 'needleRot') - 225) < 15, 'AM（94.2s）：指针转到 9 点方向（' + nums(at(94.20), 'needleRot') + '°）');
  say(Math.abs(nums(at(95.10), 'needleRot') - 45) < 15, 'PM（95.1s）：指针转完到 3 点方向（' + nums(at(95.10), 'needleRot') + '°）');
  say(Math.abs(nums(at(94.80), 'needleRot') - 84) < 30, 'AM→PM 之间：指针正扫过 12 点方向（94.8s ' + nums(at(94.80), 'needleRot') + '°）');
  say(nums(at(97.90), 'imgF') > 0.3, '歌词 To S（97.9s）：FromS.png 显示（opacity ' + nums(at(97.90), 'imgF') + '）');
  say(nums(at(98.40), 'imgF') > 0.1 && nums(at(98.40), 'imgM') > 0.1, '渐变中（98.4s）：FromS ' + nums(at(98.40), 'imgF') + ' → ToM ' + nums(at(98.40), 'imgM') + '）');
  say(nums(at(98.90), 'imgM') > 0.5 && nums(at(98.90), 'imgF') < 0.15, '歌词 M（98.9s）：ToM.png 已接管（' + nums(at(98.90), 'imgM') + '）');
}

/* ---------------------------------------------------------- 关键帧截图 */
if (!NO_SHOT) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const shots = [[88.75, 'intro'], [90.30, 'merge'], [90.55, 'F-fill'], [91.70, 'M-fill'], [92.40, 'ripples'], [94.20, 'AM'], [95.10, 'PM']];
  for (const s of shots) {
    const f = path.join(SHOTS, 'gauge-' + String(s[0]).padStart(6, '0') + '-' + s[1] + '.png');
    const body = 'window.addEventListener("load",function(){setTimeout(function(){GAUGE.setLyricTime(' + (s[0] * 1000) + ');},250);});';
    fs.writeFileSync(TMP, make(body, 'shotmark'), 'utf8');
    spawnSync(chrome, base.concat(['--virtual-time-budget=3000', '--screenshot=' + f, url()]), { encoding: 'utf8', timeout: 120000 });
  }
  const made = fs.readdirSync(SHOTS).filter(x => x.indexOf('gauge-') === 0).length;
  say(made > 0, '关键帧截图 ' + made + ' 张 → _tools/shots/gauge-*.png（用 read-image.js 读）');
}
fs.unlinkSync(TMP);
console.log(fails ? NL + '有 ' + fails + ' 项没过' : NL + 'gender-gauge.html 检查全部通过。');
process.exit(fails ? 1 : 0);
