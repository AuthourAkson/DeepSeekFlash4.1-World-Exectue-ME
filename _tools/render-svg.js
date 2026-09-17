/* ============================================================================
   render-svg.js — turn the recorded canvas call stream into a real SVG.

   The stub canvas records every drawing call with its arguments, so the exact
   frame the film would draw can be reconstructed as vector graphics and
   looked at. This is how composition and alignment get checked without a
   browser screenshot.
   ==========================================================================*/
const fs = require('fs'), path = require('path');
const { createEnv } = require('./stub-env');

const W = 1600, H = 900;
const outDir = path.join(__dirname, 'preview');
fs.mkdirSync(outDir, { recursive: true });

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function n(v) { return (Math.round(v * 100) / 100); }

/* a tiny matrix: [a,b,c,d,e,f] like canvas setTransform */
function mul(m, k) {
  return [
    m[0] * k[0] + m[2] * k[1], m[1] * k[0] + m[3] * k[1],
    m[0] * k[2] + m[2] * k[3], m[1] * k[2] + m[3] * k[3],
    m[0] * k[4] + m[2] * k[5] + m[4], m[1] * k[4] + m[3] * k[5] + m[5]
  ];
}

function makeRenderer() {
  const out = [];
  const stack = [];
  let m = [1, 0, 0, 1, 0, 0];
  let st = {
    fillStyle: 'none', strokeStyle: 'none', lineWidth: 1, font: '14px monospace',
    textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1, dash: [],
    gco: 'source-over', shadowBlur: 0
  };
  let path = [];

  const mat = () => `matrix(${m.map(v => n(v)).join(' ')})`;
  /* fill/stroke paint: gradients become flat approximations, declared first */
  const fills = [];
  const paint = v => {
    if (v === undefined || v === null) return 'none';
    if (typeof v !== 'string') return 'url(#g' + (fills.push(v) - 1) + ')';
    if (/^rgba?\(/.test(v)) {
      const p = v.match(/[\d.]+/g);
      if (p && p.length === 4 && parseFloat(p[3]) < 1) {
        return 'rgba(' + (+p[0] | 0) + ',' + (+p[1] | 0) + ',' + (+p[2] | 0) + ',' + p[3] + ')';
      }
    }
    return v;
  };

  const flushPath = () => {
    if (!path.length) return;
    const d = path.join(' ');
    const strokeAttr = (st.strokeStyle !== 'none' && st.lineWidth > 0)
      ? ` stroke="${paint(st.strokeStyle)}" stroke-width="${n(st.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"`
      + (st.dash.length ? ` stroke-dasharray="${st.dash.map(n).join(' ')}"` : '')
      : '';
    const fillAttr = (st.fillStyle !== 'none') ? ` fill="${paint(st.fillStyle)}"` : ' fill="none"';
    const a = st.globalAlpha < 1 ? ` opacity="${n(st.globalAlpha)}"` : '';
    out.push(`<path transform="${mat()}" d="${d}"${fillAttr}${strokeAttr}${a}/>`);
    path = [];
  };

  const api = {
    setTransform: (a, b, c, d2, e, f) => { m = [a, b, c, d2, e, f]; },
    resetTransform: () => { m = [1, 0, 0, 1, 0, 0]; },
    translate: (x, y) => { m = mul(m, [1, 0, 0, 1, x, y]); },
    scale: (x, y) => { m = mul(m, [x, 0, 0, y, 0, 0]); },
    rotate: (r) => { m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]); },
    save: () => { stack.push({ m: m.slice(), st: Object.assign({}, st) }); },
    restore: () => { const s = stack.pop(); if (s) { m = s.m; st = s.st; } },
    beginPath: () => { flushPath(); path = []; },
    closePath: () => { flushPath(); },
    moveTo: (x, y) => path.push(`M${n(x)} ${n(y)}`),
    lineTo: (x, y) => path.push(`L${n(x)} ${n(y)}`),
    quadraticCurveTo: (a, b, c, d2) => path.push(`Q${n(a)} ${n(b)} ${n(c)} ${n(d2)}`),
    bezierCurveTo: (a, b, c, d2, e, f) => path.push(`C${n(a)} ${n(b)} ${n(c)} ${n(d2)} ${n(e)} ${n(f)}`),
    arc: (x, y, r, a0, a1, ccw) => {
      r = Math.max(0, r);
      const sweep = a1 - a0;
      const large = Math.abs(sweep) > Math.PI ? 1 : 0;
      const p0 = [x + Math.cos(a0) * r, y + Math.sin(a0) * r];
      const p1 = [x + Math.cos(a1) * r, y + Math.sin(a1) * r];
      path.push((path.length ? 'L' : 'M') + `${n(p0[0])} ${n(p0[1])}`);
      path.push(`A${n(r)} ${n(r)} 0 ${large} ${ccw ? 0 : 1} ${n(p1[0])} ${n(p1[1])}`);
    },
    ellipse: (x, y, rx, ry, rot, a0, a1, ccw) => {
      rx = Math.max(0.01, rx); ry = Math.max(0.01, ry);
      const c = Math.cos(rot), s = Math.sin(rot);
      const pt = a => {
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        return [x + ex * c - ey * s, y + ex * s + ey * c];
      };
      const p0 = pt(a0), p1 = pt(a1);
      const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
      path.push((path.length ? 'L' : 'M') + `${n(p0[0])} ${n(p0[1])}`);
      path.push(`A${n(rx)} ${n(ry)} ${n(rot * 180 / Math.PI)} ${large} ${ccw ? 0 : 1} ${n(p1[0])} ${n(p1[1])}`);
    },
    rect: (x, y, w, h) => { path.push(`M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`); },
    fill: () => { flushPath(1); },
    stroke: () => { flushPath(0); },
    fillRect: (x, y, w, h) => {
      const a = st.globalAlpha < 1 ? ` opacity="${n(st.globalAlpha)}"` : '';
      out.push(`<path transform="${mat()}" d="M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z" fill="${paint(st.fillStyle)}"${a}/>`);
    },
    strokeRect: (x, y, w, h) => {
      out.push(`<path transform="${mat()}" d="M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z" fill="none" stroke="${paint(st.strokeStyle)}" stroke-width="${n(st.lineWidth)}"/>`);
    },
    clearRect: () => {},
    clip: () => { flushPath(); },
    fillText: (t, x, y) => {
      if (t === '' || t === undefined) return;
      const px = parseFloat((st.font.match(/(\d+(\.\d+)?)px/) || [0, 14])[1]) || 14;
      const fam = /serif|sans/i.test(st.font) ? 'sans-serif' : 'monospace';
      const weight = /bold|[6-9]00/.test(st.font) ? 'bold' : 'normal';
      const anchor = st.textAlign === 'center' ? 'middle' : st.textAlign === 'right' ? 'end' : 'start';
      const base = st.textBaseline === 'middle' ? 'central'
        : st.textBaseline === 'top' ? 'hanging'
        : st.textBaseline === 'bottom' ? 'text-after-edge' : 'alphabetic';
      const a = st.globalAlpha < 1 ? ` opacity="${n(st.globalAlpha)}"` : '';
      out.push(`<text transform="${mat()}" x="${n(x)}" y="${n(y)}" fill="${paint(st.fillStyle)}"`
        + ` font-size="${n(px)}" font-family="${fam}" font-weight="${weight}"`
        + ` text-anchor="${anchor}" dominant-baseline="${base}"${a}>${esc(t)}</text>`);
    },
    strokeText: (t, x, y) => {
      const px = parseFloat((st.font.match(/(\d+(\.\d+)?)px/) || [0, 14])[1]) || 14;
      out.push(`<text transform="${mat()}" x="${n(x)}" y="${n(y)}" fill="none" stroke="${paint(st.strokeStyle)}"`
        + ` stroke-width="${n(st.lineWidth)}" font-size="${n(px)}" font-family="monospace" font-weight="bold"`
        + ` text-anchor="middle">${esc(t)}</text>`);
    },
    measureText: (t) => ({ width: String(t).length * 8.4 + 1.2 }),
    setLineDash: (a) => { st.dash = a || []; },
    getLineDash: () => st.dash,
    createLinearGradient: () => ({ addColorStop() {}, _t: 'linear' }),
    createRadialGradient: () => ({ addColorStop() {}, _t: 'radial' }),
    createPattern: () => null,
    drawImage: () => {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    putImageData: () => {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    isPointInPath: () => false,
    _finish() { flushPath(); return out.join('\n'); }
  };
  Object.keys(st).forEach(k => {
    Object.defineProperty(api, k, {
      get: () => st[k],
      set: v => {
        if (k === 'globalAlpha' && v > 1) v = 1;
        st[k] = v;
      },
      enumerable: true, configurable: true
    });
  });
  return api;
}

/* --------------------------------------------------------------------------
   Render a frame to SVG, with an optional alignment overlay
   ------------------------------------------------------------------------ */
function frameToSVG(t, opts) {
  opts = opts || {};
  const env = createEnv({ quiet: true });
  const EM = env.EM;
  const rec = makeRenderer();

  /* swap the stub's recording context for the SVG one */
  env.els.view.getContext = () => rec;

  /* install the SVG ctx into the app by hand: D.bind + transform */
  const T = EM.__test;
  T.renderAt(t, true);          /* this rebuilds the frame through the real code */
  return null;                  /* replaced below */
}

/* The stub's D.bind keeps its own ctx, so instead of swapping after the fact we
   patch the module's binding by driving it through EM.D.bind with our renderer. */
function renderFrame(t, opts) {
  opts = opts || {};
  const env = createEnv({ quiet: true });
  const EM = env.EM, D = EM.D;

  /* a canvas-like object whose getContext returns the SVG recorder */
  const rec = makeRenderer();

  /* Re-create the exact transform resetView() would apply, then draw. */
  const W2 = 1600, H2 = 900, U = 1;
  const CW = 1600, CH = 900;
  rec.setTransform(1, 0, 0, 1, 0, 0);
  rec.fillStyle = '#000';
  rec.fillRect(0, 0, CW, CH);
  rec.setTransform(1, 0, 0, 1, 0, 0);
  rec.translate(0, 0);
  rec.scale(U, U);
  rec.translate(W2 / 2, H2 / 2);

  D.bind(rec, W2, H2);
  EM.WorldLayer.frame(W2, H2, U, 0, 0);

  const w = EM.World.at(t);
  w.time = t; w.pal = EM.World.palette(w); w.U = U;
  EM.WorldLayer.draw(w, w.pal, t, 0);

  const cue = EM.Lyrics.at(t);
  EM.drawScene(cue.scene, w, t, cue);
  rec._finish();

  /* stage frame the drawing happened inside */
  const stage = `  <g id="stage">
    <rect x="0" y="0" width="1600" height="900" fill="none" stroke="#ff3b30" stroke-width="2"/>
    <rect x="80" y="45" width="1440" height="810" fill="none" stroke="#00c8ff" stroke-width="1" stroke-dasharray="6 6"/>
    <line x1="800" y1="0" x2="800" y2="900" stroke="#00c8ff" stroke-width="1" stroke-dasharray="4 8" opacity="0.6"/>
    <line x1="0" y1="450" x2="1600" y2="450" stroke="#00c8ff" stroke-width="1" stroke-dasharray="4 8" opacity="0.6"/>
  </g>`;

  return {
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="-800 -450 ${W} ${H}">
<title>t=${t.toFixed(3)}s  ${esc(cue.scene)}  ${esc(cue.text)}</title>
<desc>cue #${cue.i} · "${esc(cue.text)}" · scene ${esc(cue.scene)} · window ${cue.t}–${cue.end}s</desc>
${opts.overlay === false ? '' : stage}
${rec._finish()}
</svg>`,
    cue: cue, scene: cue.scene
  };
}

module.exports = { renderFrame };

if (require.main === module) {
  const times = process.argv.slice(2).filter(a => !isNaN(parseFloat(a))).map(parseFloat);
  const list = times.length ? times : [1.0, 3.2, 8.0, 14.5, 22.0, 31.5, 39.0, 46.5, 60.5, 69.5, 75.0, 82.0, 86.5, 95.0, 104.5, 113.0, 118.5, 126.0, 133.0, 148.0, 156.0, 168.0, 178.5, 190.5, 196.0, 207.0, 210.5];
  for (const t of list) {
    const r = renderFrame(t);
    const name = String(t.toFixed(2)).replace('.', '_') + 's_' + r.scene + '.svg';
    fs.writeFileSync(path.join(outDir, name), r.svg);
    const bytes = fs.statSync(path.join(outDir, name)).size;
    console.log(`${t.toFixed(2).padStart(7)}s  ${r.scene.padEnd(18)} "${r.cue.text.slice(0, 34)}"  ->  ${name}  (${(bytes / 1024).toFixed(1)} kB)`);
  }
}
