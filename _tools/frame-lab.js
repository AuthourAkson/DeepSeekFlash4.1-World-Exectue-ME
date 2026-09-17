/* ============================================================================
   frame-lab.js — the polishing workbench.

   Renders every cue of the film through the real draw code, rasterises it, and
   measures the things that decide whether a frame reads:

     lit        fraction of the stage carrying ink
     meanLum    average luminance (0..255)
     p99        the brightest 1% — is there a highlight to look at
     contrast   p99 - median, i.e. how far the subject stands off its ground
     spread     std-dev of luminance — flat frames look dead
     cx, cy     centre of visual mass, in stage units (-800..800, -450..450)
     edges      ink touching the outer 6% border (composition bleeding away)
     polarity   is the frame dark-on-dark, light-on-dark, or a hot frame

   Anything that comes out low-contrast, dead-centre-heavy, off-balance or
   edge-hugging gets listed by score so the worst offenders can be fixed first.
   ==========================================================================*/
const fs = require('fs'), path = require('path');
const { createEnv } = require('./stub-env');
const { createRaster } = require('./raster');

const SW = 400, SH = 225;          /* analysis resolution: fast, plenty */
const W = 1600, H = 900;

function statsOf(r) {
  const png = r.toPNG();
  const zlib = require('zlib');
  const buf = Buffer.from(png);
  let p = 8, idat = [], w = 0, h = 0;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const t = buf.slice(p + 4, p + 8).toString('latin1');
    const d = buf.slice(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 3, prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let off = 0;
  const lum = new Float64Array(w * h);
  let sum = 0, lit = 0, sx = 0, sy = 0, sw = 0;
  let edgeInk = 0, edgeTot = 0;
  const bx = w * 0.06, by = h * 0.06;

  for (let y = 0; y < h; y++) {
    const ft = raw[off++];
    raw.copy(cur, 0, off, off + stride); off += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? cur[i - 3] : 0, b = prev[i], c = i >= 3 ? prev[i - 3] : 0;
      let v = cur[i];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    cur.copy(prev);
    for (let x = 0; x < w; x++) {
      const R = cur[x * 3], G = cur[x * 3 + 1], B = cur[x * 3 + 2];
      const L = (R * 299 + G * 587 + B * 114) / 1000;
      lum[y * w + x] = L;
      sum += L;
      const isEdge = x < bx || y < by || x >= w - bx || y >= h - by;
      if (isEdge) { edgeTot++; if (L > 44) edgeInk++; }
      if (L > 26) {
        lit++;
        const wgt = L - 26;
        sx += x * wgt; sy += y * wgt; sw += wgt;
      }
    }
  }
  const n = w * h;
  const sorted = Float64Array.from(lum).sort();
  const median = sorted[Math.floor(n * 0.5)];
  const p90 = sorted[Math.floor(n * 0.90)];
  const p99 = sorted[Math.floor(n * 0.99)];
  let varSum = 0;
  for (let i = 0; i < n; i++) { const d = lum[i] - sum / n; varSum += d * d; }

  return {
    lit: lit / n,
    meanLum: sum / n,
    median: median,
    p90: p90,
    p99: p99,
    contrast: p99 - median,
    spread: Math.sqrt(varSum / n),
    cx: sw ? (sx / sw / w - 0.5) * W : 0,
    cy: sw ? (sy / sw / h - 0.5) * H : 0,
    edge: edgeTot ? edgeInk / edgeTot : 0
  };
}

/* render one time through the real code, at reduced resolution */
function analyse(t) {
  const env = createEnv({ quiet: true });
  const EM = env.EM, D = EM.D;
  const r = createRaster(SW, SH, 2);
  const kx = SW / W, ky = SH / H;

  r.setTransform(1, 0, 0, 1, 0, 0);
  r.fillStyle = '#000'; r.fillRect(0, 0, SW, SH);
  r.setTransform(kx, 0, 0, ky, 0, 0);
  r.translate(W / 2, H / 2);
  D.bind(r, W, H);
  EM.WorldLayer.frame(W, H, 1, 0, 0);

  const w = EM.World.at(t);
  w.time = t; w.pal = EM.World.palette(w); w.U = 1;
  EM.WorldLayer.draw(w, w.pal, t, 0);
  const cue = EM.Lyrics.at(t);
  EM.drawScene(cue.scene, w, t, cue);

  /* count the ink the PLATE alone contributes, to catch plates that draw
     nothing while the world underneath still fills the frame */
  env.opLog.length = 0;
  EM.drawScene(cue.scene, w, t, cue);
  const plateCalls = env.opLog.length;
  const platePrims = env.opLog.filter(l =>
    /^(moveTo|lineTo|fillRect|strokeRect|rect|fillText|strokeText|arc|ellipse|quadraticCurveTo|bezierCurveTo)\(/.test(l)).length;

  return { stats: statsOf(r), cue: cue, plateCalls: plateCalls, platePrims: platePrims };
}

/* ------------------------------------------------------------------------ */
const MODE = process.argv[2] || 'sweep';

if (MODE === 'one') {
  const t = parseFloat(process.argv[3] || '0');
  const a = analyse(t);
  console.log('t=' + t.toFixed(2) + 's  cue#' + a.cue.i + '  ' + a.cue.scene + '  "' + a.cue.text + '"');
  console.log(JSON.stringify(a.stats, null, 1));
  console.log('plate primitives: ' + a.platePrims + '   plate draw calls: ' + a.plateCalls);
} else {
  const out = [];
  const env0 = createEnv({ quiet: true });
  const cues = env0.EM.Lyrics.cues;

  /* sample three points inside every cue: the entrance, the body and the exit */
  const samples = [];
  for (const c of cues) {
    samples.push({ cue: c, at: c.t + c.dur * 0.18, phase: 'in' });
    samples.push({ cue: c, at: c.t + c.dur * 0.55, phase: 'mid' });
    samples.push({ cue: c, at: c.t + c.dur * 0.88, phase: 'out' });
  }

  process.stdout.write('analysing ' + samples.length + ' frames ');
  let i = 0;
  for (const s of samples) {
    const a = analyse(s.at);
    out.push({ t: s.at, phase: s.phase, cue: s.cue.i, scene: s.cue.scene, text: s.cue.text,
               platePrims: a.platePrims, ...a.stats });
    if (++i % 40 === 0) process.stdout.write('.');
  }
  console.log(' done');

  fs.writeFileSync(path.join(__dirname, 'frame-stats.json'), JSON.stringify(out, null, 1));

  const avg = k => out.reduce((s, r) => s + r[k], 0) / out.length;
  console.log('\n=== overall ===');
  console.log('frames            : ' + out.length);
  console.log('lit fraction      : ' + avg('lit').toFixed(3));
  console.log('mean luminance    : ' + avg('meanLum').toFixed(1));
  console.log('median luminance  : ' + avg('median').toFixed(1));
  console.log('p99 luminance     : ' + avg('p99').toFixed(1));
  console.log('contrast (p99-med): ' + avg('contrast').toFixed(1));
  console.log('spread (std-dev)  : ' + avg('spread').toFixed(1));
  console.log('edge ink          : ' + avg('edge').toFixed(3));
  console.log('centre of mass    : x ' + avg('cx').toFixed(0) + '  y ' + avg('cy').toFixed(0));

  const rank = (name, filter, score) => {
    const bad = out.filter(filter).sort((a, b) => score(b) - score(a)).slice(0, 14);
    if (!bad.length) return;
    console.log('\n--- ' + name + ' (' + out.filter(filter).length + ' frames) ---');
    for (const r of bad) {
      console.log('  ' + r.t.toFixed(2).padStart(7) + 's ' + r.phase.padEnd(4) + ' #'
        + String(r.cue).padStart(3) + ' ' + r.scene.padEnd(17)
        + ' lit=' + r.lit.toFixed(2) + ' p99=' + r.p99.toFixed(0)
        + ' con=' + r.contrast.toFixed(0) + ' spr=' + r.spread.toFixed(0)
        + ' edge=' + r.edge.toFixed(2) + '  "' + r.text.slice(0, 26) + '"');
    }
  };

  rank('LOW CONTRAST (subject barely stands off the ground)', r => r.contrast < 42, r => -r.contrast);
  rank('DARK / FLAT (nothing to look at)', r => r.p99 < 60, r => -r.p99);
  rank('EMPTY (very little ink)', r => r.lit < 0.10, r => -r.lit);
  rank('SATURATED (nearly everything lit)', r => r.lit > 0.88, r => r.lit);
  rank('EDGE-HEAVY (composition running off the frame)', r => r.edge > 0.30, r => r.edge);
  rank('OFF-CENTRE (visual mass far from the middle)', r => Math.hypot(r.cx, r.cy) > 230, r => Math.hypot(r.cx, r.cy));
  rank('PLATE DRAWS ALMOST NOTHING', r => r.platePrims < 15, r => -r.platePrims);
}
