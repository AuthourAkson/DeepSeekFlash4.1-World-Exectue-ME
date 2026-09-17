/* Render the real page in headless Chrome via --screenshot and inspect pixels.
   No CDP page session needed, so this works even where the debugger is blocked. */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find(p => fs.existsSync(p));

const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/').replace(/^\/+/, '');
const outDir = path.join(__dirname, 'shots');
fs.mkdirSync(outDir, { recursive: true });

/* how many colours / non-black pixels are in a PNG (decoded with zlib only) */
function analyzePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return { err: 'not a png' };
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.slice(p + 4, p + 8).toString('latin1');
    const data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = w * ch;
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  let off = 0;
  const colours = new Set();
  let nonBlack = 0, total = 0, sum = 0, maxLum = 0;
  const hist = new Uint32Array(16);
  for (let y = 0; y < h; y++) {
    const ft = raw[off++];
    raw.copy(cur, 0, off, off + stride); off += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = cur[i];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 0xff;
    }
    cur.copy(prev);
    for (let x = 0; x < w; x += 3) {
      const r = cur[x * ch], g = cur[x * ch + 1] || 0, bl = cur[x * ch + 2] || 0;
      const lum = (r * 299 + g * 587 + bl * 114) / 1000;
      total++; sum += lum; if (lum > maxLum) maxLum = lum;
      if (lum > 6) nonBlack++;
      hist[Math.min(15, Math.floor(lum / 16))]++;
      if (total % 37 === 0) colours.add((r >> 3) + ',' + (g >> 3) + ',' + (bl >> 3));
    }
  }
  return { w, h, bitDepth, colorType, nonBlackRatio: nonBlack / total, meanLum: sum / total, maxLum, colours: colours.size, hist: Array.from(hist) };
}

console.log('real-browser render check');
console.log('url: ' + url + '\n');

const shots = [
  ['load-5s', 5000],
  ['load-20s', 20000]
];
let bad = 0;
for (const [name, delay] of shots) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edme-shot-'));
  const png = path.join(outDir, name + '.png');
  try { fs.unlinkSync(png); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--allow-file-access-from-files',
    '--autoplay-policy=no-user-gesture-required',
    '--user-data-dir=' + profile,
    '--window-size=1280,760',
    '--virtual-time-budget=' + delay,
    '--screenshot=' + png,
    url
  ];
  const t0 = Date.now();
  const r = spawnSync(CHROME, args, { stdio: 'ignore', timeout: 120000 });
  const took = Date.now() - t0;
  if (!fs.existsSync(png)) { console.log('  FAIL ' + name + ': no screenshot produced (exit ' + r.status + ', ' + took + 'ms)'); bad++; }
  else {
    const a = analyzePNG(png);
    const kb = (fs.statSync(png).size / 1024).toFixed(1);
    console.log('  ' + name + '.png  ' + a.w + 'x' + a.h + '  ' + kb + ' kB  ' + took + 'ms');
    console.log('     non-black ' + (a.nonBlackRatio * 100).toFixed(1) + '%   mean luminance ' + a.meanLum.toFixed(1)
      + '   max ' + a.maxLum.toFixed(0) + '   sampled colours ' + a.colours);
    if (a.nonBlackRatio < 0.05) { console.log('     FAIL: the frame is essentially empty — the film did not draw'); bad++; }
    else console.log('     ok: the page rendered a populated frame in a real browser');
  }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

console.log('\n' + (bad ? 'BROWSER RENDER: ' + bad + ' problem(s)' : 'BROWSER RENDER: all green'));
process.exit(bad ? 1 : 0);
