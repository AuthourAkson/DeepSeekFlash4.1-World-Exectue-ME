/* ============================================================================
   raster.js — a small software rasterizer for the film's canvas calls.

   Chrome cannot run in this environment, so to actually LOOK at a frame the
   drawing calls are rasterised here: polygons are scanline-filled with the
   even-odd rule at 2x and box-downsampled for antialiasing. Gradients are
   approximated by their mid colour stop, and dashes are drawn solid — enough
   to judge composition, alignment and legibility, which is the point.
   ==========================================================================*/
const zlib = require('zlib');
const fs = require('fs');

function parsePaint(v) {
  if (v === undefined || v === null || v === 'none') return null;
  if (typeof v !== 'string') return v._mid || [120, 160, 190, 1];   /* gradient */
  if (v[0] === '#') {
    let h = v.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 8) h = h.slice(0, 6);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
  }
  return [128, 128, 128, 1];
}

function mul(m, k) {
  return [
    m[0] * k[0] + m[2] * k[1], m[1] * k[0] + m[3] * k[1],
    m[0] * k[2] + m[2] * k[3], m[1] * k[2] + m[3] * k[3],
    m[0] * k[4] + m[2] * k[5] + m[4], m[1] * k[4] + m[3] * k[5] + m[5]
  ];
}

function createRaster(W, H, SS) {
  SS = SS || 2;
  const BW = W * SS, BH = H * SS;
  const buf = new Float32Array(BW * BH * 3);
  /* a gradient stand-in: the coverage-weighted mean of its colour stops */
  function makeGrad() {
    const stops = [];
    return {
      addColorStop(o, c) { const p = parsePaint(c); if (p) stops.push([o, p]); },
      get _mid() {
        if (!stops.length) return [60, 90, 110, 1];
        if (stops.length === 1) return stops[0][1];
        let r = 0, g = 0, b = 0, a = 0, wsum = 0;
        for (let i = 0; i < stops.length; i++) {
          const a0 = stops[i][0];
          const a1 = (i + 1 < stops.length) ? stops[i + 1][0] : 1;
          const w = Math.max(0.0001, a1 - a0);
          r += stops[i][1][0] * w; g += stops[i][1][1] * w; b += stops[i][1][2] * w;
          a += stops[i][1][3] * w; wsum += w;
        }
        return [r / wsum, g / wsum, b / wsum, a / wsum];
      }
    };
  }
  /* The canvas API works in CSS pixel space with the origin at the top-left,
     exactly like the real canvas. `m` is that user-space matrix; dev() folds
     in the supersample scale and the half-pixel centre offset to reach device
     (buffer) coordinates. Keeping these separate is what stops the base
     transform from being applied twice. */
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let poly = [];          /* accumulated subpaths in device (buffer) space */
  let sub = null;
  let st = {
    fillStyle: '#000', strokeStyle: '#fff', lineWidth: 1,
    globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic', font: '14px monospace',
    lineCap: 'butt', lineJoin: 'miter'
  };
  const gradStack = [];
  /* a device-space clip rectangle, as the app only ever clips to axis-aligned
     rectangles (the perspective grid); without honouring it the preview shows
     background geometry that the real canvas hides */
  let clip = [0, 0, BW, BH];
  const clipStack = [];

  function dev() {
    /* A canvas has its origin at the top-left and so does this buffer, so the
       user matrix maps straight through — only the supersample scale applies.
       (An extra half-buffer offset here shifted every preview by (W/2, H/2)
       and made perfectly correct geometry look misaligned.) */
    return [m[0] * SS, m[1] * SS, m[2] * SS, m[3] * SS, m[4] * SS, m[5] * SS];
  }
  const tx = (x, y) => {
    const d = dev();
    return [d[0] * x + d[2] * y + d[4], d[1] * x + d[3] * y + d[5]];
  };
  /* how many device pixels one user-space unit currently spans */
  const devScale = () => {
    const d = dev();
    const det = Math.abs(d[0] * d[3] - d[1] * d[2]);
    return Math.max(0.01, Math.sqrt(det) || Math.abs(d[0]) || 1);
  };

  function blend(px, py, col, alpha) {
    if (px < clip[0] || py < clip[1] || px >= clip[2] || py >= clip[3]) return;
    if (px < 0 || py < 0 || px >= BW || py >= BH) return;
    const i = (py * BW + px) * 3;
    const a = alpha * col[3];
    if (a <= 0) return;
    buf[i] += (col[0] - buf[i]) * a;
    buf[i + 1] += (col[1] - buf[i + 1]) * a;
    buf[i + 2] += (col[2] - buf[i + 2]) * a;
  }

  /* ---- scanline fill of a set of closed subpaths, even-odd --------------- */
  function fillPolys(subpaths, col, alpha) {
    let minY = 1e9, maxY = -1e9;
    const edges = [];
    for (const p of subpaths) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        if (a[1] < minY) minY = a[1];
        if (a[1] > maxY) maxY = a[1];
        if (a[1] !== b[1]) edges.push([a, b]);
        else { /* horizontal edge: still contributes to bounds */ }
      }
    }
    if (!edges.length) return;
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(BH - 1, Math.ceil(maxY));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let e = 0; e < edges.length; e++) {
        const a = edges[e][0], b = edges[e][1];
        const ya = a[1], yb = b[1];
        if ((cy >= ya && cy < yb) || (cy >= yb && cy < ya)) {
          const t = (cy - ya) / (yb - ya);
          xs.push(a[0] + (b[0] - a[0]) * t);
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(BW - 1, Math.round(xs[k + 1]) - 1);
        for (let x = xa; x <= xb; x++) blend(x, y, col, alpha);
      }
    }
  }

  function disc(cx, cy, r, col, alpha) {
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(BW - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(BH - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) blend(x, y, col, alpha);
      }
    }
  }

  /* stroke a subpath as a series of quads plus round joins */
  function strokePoly(p, col, alpha, w) {
    const hw = Math.max(0.5, w / 2);
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i], b = p[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 0.01) { disc(a[0], a[1], hw, col, alpha); continue; }
      const nx = -dy / len * hw, ny = dx / len * hw;
      fillPolys([[
        [a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
        [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]
      ]], col, alpha);
      disc(a[0], a[1], hw, col, alpha);
      disc(b[0], b[1], hw, col, alpha);
    }
  }

  function flattenQuad(p0, p1, p2, out, depth) {
    depth = depth || 0;
    if (depth > 6) { out.push(p2); return; }
    const mx = (p0[0] + 2 * p1[0] + p2[0]) / 4, my = (p0[1] + 2 * p1[1] + p2[1]) / 4;
    const dx = p2[0] - p0[0], dy = p2[1] - p0[1];
    const d = Math.abs((p1[0] - p2[0]) * dy - (p1[1] - p2[1]) * dx);
    if (d < 4) { out.push(p2); return; }
    flattenQuad(p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], [mx, my], out, depth + 1);
    flattenQuad([mx, my], [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], p2, out, depth + 1);
  }
  function flattenCubic(p0, p1, p2, p3, out, depth) {
    depth = depth || 0;
    if (depth > 7) { out.push(p3); return; }
    const dx = p3[0] - p0[0], dy = p3[1] - p0[1];
    const d1 = Math.abs((p1[0] - p3[0]) * dy - (p1[1] - p3[1]) * dx);
    const d2 = Math.abs((p2[0] - p3[0]) * dy - (p2[1] - p3[1]) * dx);
    if (d1 + d2 < 4) { out.push(p3); return; }
    const p01 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const p12 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const p23 = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2];
    const p012 = [(p01[0] + p12[0]) / 2, (p01[1] + p12[1]) / 2];
    const p123 = [(p12[0] + p23[0]) / 2, (p12[1] + p23[1]) / 2];
    const mid = [(p012[0] + p123[0]) / 2, (p012[1] + p123[1]) / 2];
    flattenCubic(p0, p01, p012, mid, out, depth + 1);
    flattenCubic(mid, p123, p23, p3, out, depth + 1);
  }

  function ellipsePts(cx, cy, rx, ry, rot, a0, a1) {
    const out = [];
    const steps = Math.max(12, Math.min(180, Math.round(Math.abs(a1 - a0) * Math.max(rx, ry) / 3)));
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      out.push(tx(cx + ex * c - ey * s, cy + ex * s + ey * c));
    }
    return out;
  }

  /* ---- the canvas API the app talks to ---------------------------------- */
  const api = {
    canvas: { width: W, height: H },
    setTransform: (a, b, c, d, e, f) => { m = [a, b, c, d, e, f]; },
    resetTransform: () => { m = [1, 0, 0, 1, 0, 0]; },
    translate: (x, y) => { m = mul(m, [1, 0, 0, 1, x, y]); },
    scale: (x, y) => { m = mul(m, [x, 0, 0, y, 0, 0]); },
    rotate: (r) => { m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]); },
    save: () => { stack.push({ m: m.slice(), st: Object.assign({}, st) }); clipStack.push(clip.slice()); },
    restore: () => {
      const s = stack.pop(); if (s) { m = s.m; st = s.st; }
      const c = clipStack.pop(); if (c) clip = c;
    },
    beginPath: () => { poly = []; sub = null; },
    closePath: () => { if (sub && sub.length > 2) sub.push(sub[0].slice()); },
    moveTo: (x, y) => { if (sub && sub.length) poly.push(sub); sub = [tx(x, y)]; },
    lineTo: (x, y) => { if (!sub) sub = [tx(x, y)]; else sub.push(tx(x, y)); },
    quadraticCurveTo: (a, b, c, d) => {
      if (!sub) sub = [];
      const p0 = sub.length ? sub[sub.length - 1] : tx(0, 0);
      flattenQuad(p0, tx(a, b), tx(c, d), sub);
    },
    bezierCurveTo: (a, b, c, d, e, f) => {
      if (!sub) sub = [];
      const p0 = sub.length ? sub[sub.length - 1] : tx(0, 0);
      flattenCubic(p0, tx(a, b), tx(c, d), tx(e, f), sub);
    },
    arc: (x, y, r, a0, a1, ccw) => {
      if (!sub) sub = [];
      const pts = ellipsePts(x, y, r, r, 0, a0, a1);
      for (const p of pts) sub.push(p);
    },
    ellipse: (x, y, rx, ry, rot, a0, a1) => {
      if (!sub) sub = [];
      const pts = ellipsePts(x, y, rx, ry, rot, a0, a1);
      for (const p of pts) sub.push(p);
    },
    rect: (x, y, w, h) => {
      const a = tx(x, y), b = tx(x + w, y), c = tx(x + w, y + h), d = tx(x, y + h);
      if (sub && sub.length) poly.push(sub);
      sub = [a, b, c, d, a.slice()];
    },
    fill: () => {
      const all = poly.slice(); if (sub && sub.length > 2) all.push(sub);
      fillPolys(all, parsePaint(st.fillStyle), st.globalAlpha);
      poly = []; sub = null;
    },
    stroke: () => {
      const all = poly.slice(); if (sub && sub.length > 1) all.push(sub);
      const col = parsePaint(st.strokeStyle);
      const w = st.lineWidth * devScale();
      for (const p of all) strokePoly(p, col, st.globalAlpha, w);
      poly = []; sub = null;
    },
    fillRect: (x, y, w, h) => {
      const a = tx(x, y), b = tx(x + w, y), c = tx(x + w, y + h), d = tx(x, y + h);
      fillPolys([[a, b, c, d]], parsePaint(st.fillStyle), st.globalAlpha);
    },
    strokeRect: (x, y, w, h) => {
      const a = tx(x, y), b = tx(x + w, y), c = tx(x + w, y + h), d = tx(x, y + h);
      strokePoly([a, b, c, d, a.slice()], parsePaint(st.strokeStyle), st.globalAlpha, st.lineWidth * devScale());
    },
    clearRect: () => {},
    clip: () => {
      /* intersect with the bounding box of the current path, in device space */
      const all = poly.slice(); if (sub && sub.length > 1) all.push(sub);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of all) for (const q of p) {
        if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
        if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
      }
      if (x0 > x1) return;
      clip = [
        Math.max(clip[0], Math.floor(x0)), Math.max(clip[1], Math.floor(y0)),
        Math.min(clip[2], Math.ceil(x1)), Math.min(clip[3], Math.ceil(y1))
      ];
    },
    setLineDash: () => {}, getLineDash: () => [],
    /* Gradients are approximated by the coverage-weighted mean of their stops.
       Sampling the FIRST stop instead would paint the vignette (transparent ->
       opaque black) as a solid black shape and blank the whole frame. */
    createLinearGradient: () => makeGrad(),
    createRadialGradient: () => makeGrad(),
    createPattern: () => null,
    drawImage: () => {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    putImageData: () => {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    isPointInPath: () => false,
    measureText: (t) => ({ width: String(t).length * 8.4 + 1.2 }),
    fillText: () => {},
    strokeText: () => {}
  };
  Object.keys(st).forEach(k => {
    Object.defineProperty(api, k, { get: () => st[k], set: v => { st[k] = v; }, enumerable: true, configurable: true });
  });
  api.getContextAttributes = () => ({ alpha: false });
  api.__debug = () => ({ m: m.slice(), dev: dev(), clip: clip.slice(), SS: SS, BW: BW, BH: BH });
  /* bounding box of every device-space coordinate the rasteriser touched —
     the fastest way to prove geometry is landing where it should */
  api.__inkBounds = () => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (let y = 0; y < BH; y++) {
      for (let x = 0; x < BW; x++) {
        const i = (y * BW + x) * 3;
        if (buf[i] > 1.5 || buf[i + 1] > 1.5 || buf[i + 2] > 1.5) {
          n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    return n ? { x0: x0, y0: y0, x1: x1, y1: y1, lit: n, W: W, H: H } : { lit: 0, W: W, H: H };
  };

  /* ---- PNG output ------------------------------------------------------- */
  api.toPNG = function () {
    /* box-downsample SS x SS and composite over black */
    const out = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const i = (((y * SS + sy) * BW) + (x * SS + sx)) * 3;
            r += buf[i]; g += buf[i + 1]; b += buf[i + 2];
          }
        }
        const k = SS * SS, o = (y * W + x) * 3;
        out[o] = Math.max(0, Math.min(255, Math.round(r / k)));
        out[o + 1] = Math.max(0, Math.min(255, Math.round(g / k)));
        out[o + 2] = Math.max(0, Math.min(255, Math.round(b / k)));
      }
    }
    /* PNG encode */
    const raw = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) {
      raw[y * (W * 3 + 1)] = 0;
      out.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
    }
    const idat = zlib.deflateSync(raw, { level: 6 });
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
      return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
    ]);
  };
  return api;
}

let CRC_T = null;
function crc32(buf) {
  if (!CRC_T) {
    CRC_T = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_T[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

module.exports = { createRaster };
