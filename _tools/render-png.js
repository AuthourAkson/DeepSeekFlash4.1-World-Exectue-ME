/* ============================================================================
   render-png.js — rasterise real frames of the film to PNG so they can be
   looked at. Uses the software rasteriser in raster.js; text is drawn as
   measured placeholder boxes (its exact glyphs are not needed to judge
   placement, scale and composition).
   ==========================================================================*/
const fs = require('fs'), path = require('path');
const { createEnv } = require('./stub-env');
const { createRaster } = require('./raster');

const W = 1600, H = 900;
const outDir = path.join(__dirname, 'preview');
fs.mkdirSync(outDir, { recursive: true });

/* monospace metrics: enough to place placeholder boxes where the real text is */
function textWidth(s, px) { return String(s).length * px * 0.6; }

function renderPNG(t, opts) {
  opts = opts || {};
  const env = createEnv({ quiet: true });
  const EM = env.EM, D = EM.D;
  const r = createRaster(W * (opts.scale || 1), H * (opts.scale || 1), opts.ss || 2);
  const s = opts.scale || 1;

  let m = null;
  const origSetTransform = r.setTransform;
  /* track the current matrix ourselves so text boxes can be positioned */
  let cur = [1, 0, 0, 1, 0, 0];
  const stack = [];
  r.setTransform = (a, b, c, d, e, f) => { cur = [a, b, c, d, e, f]; origSetTransform(a, b, c, d, e, f); };
  const wrap = (name, fn) => {
    const o = r[name].bind(r);
    r[name] = (...a) => { fn(a); return o(...a); };
  };
  wrap('translate', a => { cur = mul(cur, [1, 0, 0, 1, a[0], a[1]]); });
  wrap('scale', a => { cur = mul(cur, [a[0], 0, 0, a[1], 0, 0]); });
  wrap('rotate', a => { cur = mul(cur, [Math.cos(a[0]), Math.sin(a[0]), -Math.sin(a[0]), Math.cos(a[0]), 0, 0]); });
  const origSave = r.save.bind(r), origRestore = r.restore.bind(r);
  r.save = () => { stack.push(cur.slice()); origSave(); };
  r.restore = () => { const p = stack.pop(); if (p) cur = p; origRestore(); };

  /* text as measured boxes translucent, so the artwork underneath stays visible */
  r.fillText = function (txt, x, y) {
    txt = String(txt);
    if (!txt) return;
    const px = parseFloat((r.font.match(/(\d+(\.\d+)?)px/) || [0, 14])[1]) || 14;
    const wpx = textWidth(txt, px) * s;
    const hpx = px * s;
    const tx = cur[0] * x * s + cur[2] * y * s + cur[4] * s;
    const ty = cur[1] * x * s + cur[3] * y * s + cur[5] * s;
    /* x offset depends on alignment */
    let ox = 0;
    if (r.textAlign === 'center') ox = -wpx / 2;
    else if (r.textAlign === 'right') ox = -wpx;
    let oy = 0;
    if (r.textBaseline === 'middle') oy = -hpx / 2;
    else if (r.textBaseline === 'top') oy = 0;
    else if (r.textBaseline === 'bottom') oy = -hpx;
    else oy = -hpx * 0.78;
    const col = typeof r.fillStyle === 'string' && r.fillStyle[0] === '#' ? r.fillStyle : '#cfe6f2';
    r.save();
    r.globalAlpha = Math.min(0.5, (r.globalAlpha || 1) * 0.5);
    r.fillStyle = col;
    r.fillRect((tx + ox) / s, (ty + oy) / s, wpx / s, hpx / s);
    r.restore();
  };
  r.strokeText = function () {};

  function mul(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }

  /* the same transform the app's resetView() applies */
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.fillStyle = '#000';
  r.fillRect(0, 0, W, H);
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.translate(W / 2, H / 2);

  D.bind(r, W, H);
  EM.WorldLayer.frame(W, H, 1, 0, 0);

  const w = EM.World.at(t);
  w.time = t; w.pal = EM.World.palette(w); w.U = 1;
  EM.WorldLayer.draw(w, w.pal, t, 0);

  const cue = EM.Lyrics.at(t);
  EM.drawScene(cue.scene, w, t, cue);

  return { png: r.toPNG(), cue: cue, scene: cue.scene };
}

module.exports = { renderPNG };

if (require.main === module) {
  const args = process.argv.slice(2);
  const times = args.filter(a => !isNaN(parseFloat(a)) && isFinite(parseFloat(a))).map(parseFloat);
  const list = times.length ? times : [8.0, 31.5, 82.0, 113.0, 148.0, 196.0];
  for (const t of list) {
    const out = renderPNG(t);
    const name = t.toFixed(2).replace('.', '_') + 's_' + out.scene + '.png';
    fs.writeFileSync(path.join(outDir, name), out.png);
    console.log(t.toFixed(2).padStart(7) + 's  ' + out.scene.padEnd(18) + ' "'
      + out.cue.text.slice(0, 34) + '"  ->  ' + name + '  (' + (out.png.length / 1024).toFixed(0) + ' kB)');
  }
}
