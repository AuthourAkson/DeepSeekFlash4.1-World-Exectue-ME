/* ============================================================================
   world.execute(me); — 30_world_layer.js
   The continuous environment. It is NOT a slideshow background: it is the
   simulation the singer lives in, and it degrades exactly in step with the
   lyrics — grid -> sphere -> wave -> organic -> tangled -> open.

   Every particle is a pure function of (index, t), so scrubbing the audio
   backwards produces byte-identical frames. No internal mutable state means
   a seek can never desynchronise the picture from the sound.
   ==========================================================================*/
(function (EM) {
  'use strict';

  var D = EM.D, E = EM.E, TAU = EM.TAU;
  var clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, hash = EM.hash, noise = EM.noise2;

  var W = 1600, H = 900, CX = 0, CY = 0, U = 1;

  function frame(w, h, u, cx, cy) { W = w; H = h; U = u; CX = cx; CY = cy; }

  /* --------------------------------------------------------------------------
     ATMOSPHERE. Two layers that give the void depth: slow volumetric light
     shafts falling from above the frame, and a faint breathing starfield.
     Both are pure functions of t and intentionally quiet — they exist to make
     the dark passages feel like a place, not a void.
     ------------------------------------------------------------------------ */
  function lightShafts(w, pal, t) {
    if (!EM.Polish.shafts) return;
    var c = D.ctx();
    c.save();
    c.globalCompositeOperation = 'lighter';
    var fx = Math.sin(t * 0.047) * W * 0.10;
    var fy = -H * 0.42 + Math.cos(t * 0.063) * H * 0.05;
    var rays = 7;
    var base = 0.030 + 0.045 * w.love + 0.020 * w.heat;
    for (var i = 0; i < rays; i++) {
      var seed = hash(i * 977 + 41);
      var ang = -Math.PI / 2 + (i - (rays - 1) / 2) * 0.34 + Math.sin(t * 0.052 + i * 1.7) * 0.075;
      var len = H * (0.95 + seed * 0.5);
      var ex = fx + Math.cos(ang) * len;
      var ey = fy + Math.sin(ang) * len;
      var spread = (26 + seed * 48) * U;
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      var g = c.createLinearGradient(fx, fy, ex, ey);
      var col = i % 2 ? pal.hot : pal.accent;
      var a0 = base * (0.75 + seed * 0.5);
      g.addColorStop(0, rgba(col, a0));
      g.addColorStop(0.25, rgba(col, a0 * 0.55));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(fx + nx * spread * 0.18, fy + ny * spread * 0.18);
      c.lineTo(ex + nx * spread, ey + ny * spread);
      c.lineTo(ex - nx * spread, ey - ny * spread);
      c.lineTo(fx - nx * spread * 0.18, fy - ny * spread * 0.18);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function starfield(w, pal, t) {
    if (!EM.Polish.stars) return;
    var c = D.ctx();
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 84; i++) {
      var s1 = hash(i * 733 + 11), s2 = hash(i * 997 + 23);
      var x = (s1 - 0.5) * W * 1.1;
      var y = (s2 - 0.5) * H * 1.1;
      var tw = 0.35 + 0.65 * Math.sin(t * (0.4 + s1 * 1.2) + i * 2.7);
      var a = (0.012 + s1 * 0.040) * tw * (1 + w.love * 0.75);
      c.fillStyle = rgba([220, 235, 255], a);
      c.beginPath(); c.arc(x, y, (0.5 + s2 * 1.2) * U, 0, TAU); c.fill();
    }
    c.restore();
  }

  /* ==========================================================================
     1. BACKGROUND PLATE
     ======================================================================== */
  function bg(w, pal, wstate, t) {
    /* Rebuilt every frame on purpose: with no cross-frame cache a frame is a
       pure function of t, so scrubbing backwards renders exactly what
       playback rendered. A radial gradient is cheap; correctness is not. */
    var g = D.ctx().createRadialGradient(CX, CY - H * 0.05, H * 0.06, CX, CY, Math.max(W, H) * 0.78);
    g.addColorStop(0, pal.bg1);
    g.addColorStop(0.55, pal.bg0);
    g.addColorStop(1, '#010203');
    D.fill(g);
    D.frect(-W / 2 - 10, -H / 2 - 10, W + 20, H + 20);
    lightShafts(wstate, pal, t);
    starfield(wstate, pal, t);

    /* scanning raster — the world is being *rendered* */
    var c = D.ctx();
    c.save();
    c.globalAlpha = 0.055 + 0.03 * Math.sin(t * 2);
    D.stroke('rgba(255,255,255,1)');
    D.lw(1);
    var step = 4 * U;
    c.beginPath();
    for (var y = -H / 2; y < H / 2; y += step) { c.moveTo(-W / 2, y); c.lineTo(W / 2, y); }
    c.stroke();
    c.restore();

    /* soft ambient colour fields — a faint nebula that never competes with
       the linework, but keeps the void from reading as flat black */
    if (EM.Polish.ambient) {
    var c0 = D.ctx();
    c0.save();
    c0.globalCompositeOperation = 'lighter';
    var glowDefs = [
      [0.18, 0.20, pal.accent, 0.055],
      [0.82, 0.10, EM.World.COLORS.flesh, 0.040],
      [0.50, 0.88, pal.hot, 0.030]
    ];
    for (var gi = 0; gi < glowDefs.length; gi++) {
      var gd = glowDefs[gi];
      var gx = (hash(gi * 733 + 19) - 0.5) * W * 1.05 + Math.sin(t * 0.031 + gi * 2.1) * W * 0.025;
      var gy = (hash(gi * 977 + 57) - 0.5) * H * 0.85 + Math.cos(t * 0.027 + gi * 1.7) * H * 0.03;
      var gr = H * (0.24 + 0.20 * hash(gi * 131 + 7));
      var ga = gd[3] * (0.75 + 0.25 * Math.sin(t * 0.21 + gi * 1.3));
      var gg = c0.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, rgba(gd[2], ga));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      c0.fillStyle = gg;
      c0.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    c0.restore();
    }

    /* a slow sweep line that reads as a refresh */
    var sy = ((t * 0.12) % 1.6 - 0.3) * H;
    c.save();
    var g2 = c.createLinearGradient(0, sy - 90 * U, 0, sy + 90 * U);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.5, rgba(pal.accent, 0.055 + wstate.heat * 0.05));
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2;
    c.fillRect(-W / 2, sy - 90 * U, W, 180 * U);
    c.restore();
  }

  /* ==========================================================================
     2. THE GRID FIELD — the coordinate system the singer keeps referring to.
        Rendered as a receding plane with a horizon; breaks into shards as
        `shatter` rises.
     ======================================================================== */
  function gridField(w, pal, t) {
    var c = D.ctx();
    var horizon = CY - H * 0.10 + w.vert * H * 0.34;
    var ok = 1 - clamp(w.shatter * 1.15, 0, 1);
    var rows = 22, cols = 26;
    D.lw(1);

    c.save();
    c.beginPath(); c.rect(-W / 2, horizon, W, H / 2 - horizon + H / 2); c.clip();

    /* longitudinal lines converging to a vanishing point */
    var vpx = 0 + Math.sin(t * 0.13) * 90 * U;
    for (var i = 0; i <= cols; i++) {
      var u = i / cols * 2 - 1;
      var x0 = u * W * 0.95;
      var a = (1 - Math.abs(u) * 0.55) * 0.30 * ok;
      D.stroke(rgba(pal.grid, a * (0.5 + w.density * 0.7)));
      D.line(vpx, horizon, x0, H / 2 + 40 * U);
    }
    /* transverse lines with perspective spacing */
    for (var r = 1; r <= rows; r++) {
      var p = r / rows;
      var yy = horizon + Math.pow(p, 2.4) * (H * 0.62 + H * 0.1);
      var a2 = p * 0.34 * ok;
      D.stroke(rgba(pal.grid, a2 * (0.5 + w.density * 0.8)));
      D.line(-W / 2, yy, W / 2, yy);
    }
    c.restore();
  }

  /* ==========================================================================
     3. PRIMARY TOPOLOGY SHAPES
        Each returns its own geometry drawn with the shared primitives.
     ======================================================================== */
  var SHAPES = {
    /* 0-29 s : a point lattice. "If I'm a set of points" */
    grid: function (w, pal, t) {
      var n = Math.round(lerp(6, 15, w.density));
      var s = 96 * U;
      var pulse = EM.onsetPulse(t, 0.3);
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n * 0.6; j++) {
          var x = (i - (n - 1) / 2) * s;
          var y = (j - (n * 0.6 - 1) / 2) * s;
          var d = Math.hypot(x, y) / (n * s * 0.6);
          if (d > 1.05) continue;
          var tw = 0.25 + 0.75 * noise(i * 0.7 + 11, j * 0.7 + t * 0.5);
          var r = (1.1 + tw * 1.5 + pulse * 1.6) * U;
          var cc = D.ctx();
          cc.fillStyle = rgba(pal.accent, 0.16 + tw * 0.5);
          cc.beginPath(); cc.arc(x, y, Math.max(0.2, r * (1 + w.chaos * tw)), 0, TAU); cc.fill();
        }
      }
      /* connect the nearest neighbours: a mesh appears as order grows */
      var linkA = clamp((w.struct - 0.35) / 0.5, 0, 1);
      if (linkA > 0.01) {
        D.lw(0.8); D.stroke(rgba(pal.accent, 0.14 * linkA));
        var c = D.ctx(); c.beginPath();
        for (i = 0; i < n; i++) {
          for (var j2 = 0; j2 < n * 0.6; j2++) {
            var x1 = (i - (n - 1) / 2) * s, y1 = (j2 - (n * 0.6 - 1) / 2) * s;
            if (Math.hypot(x1, y1) / (n * s * 0.6) > 1.02) continue;
            c.moveTo(x1, y1); c.lineTo(x1 + s, y1);
            c.moveTo(x1, y1); c.lineTo(x1, y1 + s);
          }
        }
        c.stroke();
      }
    },

    /* 16-29 s and 29-59 s : a wireframe globe of data — the "new world" */
    sphere: function (w, pal, t) {
      var R = 250 * U * (1 + EM.onsetPulse(t, 0.34) * 0.05);
      var rot = t * 0.34;
      var rings = 16, seg = 30;
      D.lw(1.1);
      for (var i = 0; i <= rings; i++) {
        var phi = i / rings * Math.PI;
        var y = Math.cos(phi) * R;
        var rr = Math.sin(phi) * R;
        D.stroke(rgba(pal.accent, 0.10 + 0.24 * Math.sin(phi)));
        D.circle(0, y * (1 - w.chaos * 0.12), rr, 0, TAU); D.ctx().stroke();
      }
      for (var j = 0; j < seg; j++) {
        var th = j / seg * Math.PI + rot;
        D.stroke(rgba(pal.accent, 0.09 + w.density * 0.10));
        var c = D.ctx();
        c.beginPath();
        c.ellipse(0, 0, Math.abs(R * Math.cos(th)) + R * 0.02, R, 0, 0, TAU);
        c.stroke();
      }
      /* travelling data points on the surface */
      var N = Math.round(lerp(10, 90, w.density));
      for (var m = 0; m < N; m++) {
        var u1 = hash(m * 71 + 3) * TAU;
        var u2 = Math.acos(2 * hash(m * 131 + 7) - 1);
        var rr2 = R * Math.sin(u2);
        var px = Math.cos(u1 + rot) * rr2;
        var py = Math.cos(u2) * R;
        var depth = (Math.sin(u1 + rot) + 1) / 2;
        D.ctx().fillStyle = rgba(pal.accent, 0.10 + depth * 0.55);
        D.ctx().beginPath(); D.ctx().arc(px, py, (0.9 + depth * 1.9) * U, 0, TAU); D.ctx().fill();
      }
    },

    /* 59-74 s : a sine wave being dissected into tangents */
    wave: function (w, pal, t) {
      var amp = 150 * U, sw = W * 0.92;
      var c = D.ctx();
      /* the primary curve */
      D.lw(2.4); D.stroke(rgba(pal.accent, 0.9));
      c.beginPath();
      var n = 220;
      for (var i = 0; i <= n; i++) {
        var u = i / n;
        var x = (u - 0.5) * sw;
        var ph = u * TAU * 2 + t * 1.6;
        var y = Math.sin(ph) * amp;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      /* harmonics stacking as the "STIMULATIONS" grow */
      var hN = Math.round(clamp(w.density * 4, 1, 5));
      for (var h = 2; h <= hN + 1; h++) {
        D.lw(1); D.stroke(rgba(pal.accent, 0.24 / h));
        c.beginPath();
        for (i = 0; i <= n; i++) {
          u = i / n;
          x = (u - 0.5) * sw;
          y = Math.sin(u * TAU * 2 * h + t * 1.6 * h) * amp / h;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
      /* tangent markers riding the wave */
      var marks = 7;
      for (var m = 0; m < marks; m++) {
        var uu = (m + 0.5) / marks;
        var xx = (uu - 0.5) * sw;
        var ph2 = uu * TAU * 2 + t * 1.6;
        var yy = Math.sin(ph2) * amp;
        var slope = Math.cos(ph2) * amp * TAU * 2 / sw;
        var tl = 150 * U;
        D.lw(1.2); D.stroke(rgba(pal.accent, 0.5));
        D.line(xx - tl, yy - slope * tl, xx + tl, yy + slope * tl);
        D.fill(rgba(pal.accent, 0.95));
        D.circle(xx, yy, 3.2 * U); c.fill();
      }
    },

    /* 74-105 s : vines. The machine grows a body. */
    organic: function (w, pal, t) {
      var vines = 11;
      for (var v = 0; v < vines; v++) {
        var seed = v * 977;
        var x0 = (hash(seed) - 0.5) * W * 0.92;
        var y0 = H * 0.52;
        var pts = [[x0, y0]];
        var len = 7;
        var dir = (hash(seed + 1) - 0.5) * 0.8;
        var step = 78 * U;
        for (var k = 1; k <= len; k++) {
          dir += (noise(v * 3.1 + k * 0.5, t * 0.35 + v) - 0.5) * 1.1;
          dir = clamp(dir, -1.35, 1.35);
          var grow = clamp((t - 74) / 22 + hash(seed + k) * 0.35, 0, 1);
          if (k / len > grow) break;
          var px = pts[pts.length - 1][0] + Math.sin(dir) * step;
          var py = pts[pts.length - 1][1] - Math.cos(dir) * step;
          pts.push([px, py, dir]);
        }
        if (pts.length < 2) continue;
        var sm = D.smooth(pts.map(function (p) { return [p[0], p[1]]; }), 6);
        D.lw(2.2 * U); D.stroke(rgba(pal.accent, 0.34 * w.rot));
        D.path(sm, false);
        /* leaves / nodes at the joints */
        for (var j = 1; j < pts.length; j++) {
          var a = pts[j][2] || 0;
          var side = (j % 2 ? 1 : -1);
          D.fill(rgba(pal.hot, 0.30 * w.rot));
          D.ctx().beginPath();
          D.ctx().ellipse(pts[j][0], pts[j][1], 17 * U, 7 * U, a + side * 0.9, 0, TAU);
          D.ctx().fill();
          D.stroke(rgba(pal.accent, 0.4 * w.rot)); D.lw(1);
          D.ctx().stroke();
        }
      }
    },

    /* 105-177 s : everything that was tidy has become a knot */
    tangle: function (w, pal, t) {
      var c = D.ctx();
      var strands = 9;
      for (var s = 0; s < strands; s++) {
        var seed = s * 1313;
        var pts = [];
        var N = 64;
        for (var i = 0; i <= N; i++) {
          var u = i / N;
          var ang = u * TAU * (1.4 + s * 0.22) + t * (0.35 + s * 0.05);
          var rad = (110 + s * 26 + Math.sin(t * 0.7 + s) * 40 + u * 200) * U * lerp(1.0, 1.5, w.chaos);
          var wob = (noise(s * 5.5 + u * 4, t * 0.5 + s) - 0.5) * 150 * U * w.chaos;
          pts.push([
            Math.cos(ang) * rad + wob,
            Math.sin(ang * 0.83) * rad * 0.72 + wob * 0.6 + w.vert * H * 0.22
          ]);
        }
        var sm = D.smooth(pts, 2);
        D.lw(1.5); D.stroke(rgba(EM.World.mix(pal.accent, pal.hot, w.heat), 0.20 + 0.22 * Math.sin(s)));
        D.path(sm, false);
      }
    },

    /* 184-212 s : the rules are gone. Only a warm pulse remains.
       Deliberately built from centre-outwards so the eye always has a
       focal point: a breathing core, faint concentric orbits that keep the
       frame from reading as a flat wash, and a horizon that never quite
       resolves — the simulation still running, no longer obeyed. */
    open: function (w, pal, t) {
      var c = D.ctx();
      var beat = Math.sin(t * 2.1) * 0.5 + 0.5;

      /* a horizon line: the last surviving rule of the old world */
      var hy = -40 * U + Math.sin(t * 0.21) * 26 * U;
      var hg = c.createLinearGradient(-W * 0.5, hy, W * 0.5, hy);
      hg.addColorStop(0, 'rgba(0,0,0,0)');
      hg.addColorStop(0.5, rgba(pal.love, 0.10 + 0.05 * beat));
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      D.lw(1.2); D.stroke(hg);
      D.line(-W * 0.5, hy, W * 0.5, hy);

      /* concentric orbits, slowly rotating the other way */
      D.lw(1);
      var orbits = 9;
      for (var o = 0; o < orbits; o++) {
        var phase = ((t * 0.055 + o / orbits) % 1);
        var rr = (70 + phase * 900) * U * lerp(0.7, 1.05, w.love);
        var al = (1 - phase) * (1 - phase) * 0.16 * (0.4 + 0.6 * w.love);
        D.stroke(rgba(pal.love, al));
        c.beginPath();
        c.ellipse(0, hy * 0.4, rr, rr * 0.30, 0, 0, TAU);
        c.stroke();
      }

      /* the breathing core — additive, so it reads as emitted light */
      var R = (150 + beat * 60) * U * lerp(1, 1.35, w.love);
      var g = c.createRadialGradient(0, 0, 0, 0, 0, R * 2.6);
      g.addColorStop(0, rgba(pal.love, 0.34 * w.love + 0.06));
      g.addColorStop(0.42, rgba(pal.accent, 0.09));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.save();
      c.globalCompositeOperation = 'lighter';
      D.fill(g);
      D.circle(0, 0, R * 2.6); c.fill();
      c.restore();

      /* a defined core ring, so the eye has an edge to hold on to */
      D.lw(1.6); D.stroke(rgba(pal.love, 0.30 + 0.14 * beat));
      D.circle(0, 0, R * 0.52); c.stroke();
      D.lw(1); D.stroke(rgba(pal.love, 0.16));
      D.circle(0, 0, R * 0.70); c.stroke();

      /* and a negative-space vignette so the glow never flattens the frame
         into an even wash: the light stays light, everything else stays black */
      var vg = c.createRadialGradient(0, 0, R * 0.9, 0, 0, Math.max(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.55, 'rgba(0,0,0,0.34)');
      vg.addColorStop(1, 'rgba(0,0,0,0.80)');
      c.fillStyle = vg;
      c.fillRect(-W / 2, -H / 2, W, H);

      /* a few free-floating curves — hand-drawn, no longer parametric */
      D.lw(2.0);
      for (var i = 0; i < 5; i++) {
        var sd = i * 313;
        D.stroke(rgba(pal.love, 0.16 + 0.14 * Math.sin(t * 0.8 + i)));
        var pts = [];
        for (var k = 0; k <= 22; k++) {
          var u = k / 22;
          var a = u * TAU + t * (0.09 + i * 0.017) + sd;
          var rr2 = (170 + i * 62) * U * (1 + (noise(sd + k * 0.3, t * 0.25) - 0.5) * 0.35);
          pts.push([Math.cos(a) * rr2, Math.sin(a * 1.13) * rr2 * 0.55]);
        }
        D.path(D.smooth(pts, 3), false);
      }

      /* sparse warm particles drifting up through the light */
      for (var m = 0; m < 60; m++) {
        var s1 = hash(m * 8191 + 17), s2 = hash(m * 4421 + 5);
        var yy = ((s2 * H * 1.3 - t * (7 + s1 * 13)) % (H * 1.3));
        yy = yy < -H * 0.65 ? yy + H * 1.3 : yy;
        var xx = (s1 - 0.5) * W * 1.1 + Math.sin(t * 0.4 + s2 * 9) * 26 * U;
        D.ctx().fillStyle = rgba(pal.love, (0.07 + s2 * 0.20) * w.love);
        D.ctx().beginPath();
        D.ctx().arc(xx, yy, (0.8 + s1 * 2.2) * U, 0, TAU);
        D.ctx().fill();
      }
    }
  };

  /* ==========================================================================
     4. AMBIENT PARTICLES
        Deterministic drift; density and behaviour read from world state.
     ======================================================================== */
  function particles(w, pal, t) {
    var c = D.ctx();
    var n = Math.round(lerp(14, 190, w.density));
    var mode = w.topo;
    D.lw(1);
    for (var i = 0; i < n; i++) {
      var s1 = hash(i * 9176 + 13), s2 = hash(i * 3391 + 71), s3 = hash(i * 5527 + 29);

      if (mode === 'tangle') {
        /* orbiting debris in a collapsing system */
        var ang = s1 * TAU + t * (0.16 + s2 * 0.5) * (1 + w.chaos);
        var rad = (90 + s2 * 620) * U * lerp(1, 1.5, w.chaos);
        var px = Math.cos(ang) * rad;
        var py = Math.sin(ang * 1.07) * rad * 0.62 + w.vert * H * 0.2;
        D.fill(rgba(s3 > 0.72 ? pal.hot : pal.accent, 0.14 + s3 * 0.5));
        D.circle(px, py, (0.8 + s3 * 2.1) * U);
        c.fill();
      } else if (mode === 'organic') {
        /* spores / pollen */
        var yy = ((s2 * H * 1.3 - t * (14 + s1 * 26)) % (H * 1.3));
        yy = yy < -H * 0.65 ? yy + H * 1.3 : yy;
        var xx = (s1 - 0.5) * W * 1.1 + Math.sin(t * 0.6 + s3 * 9) * 22 * U;
        D.fill(rgba(pal.hot, 0.16 + s3 * 0.4));
        D.circle(xx, yy, (0.9 + s3 * 1.8) * U);
        c.fill();
      } else if (mode === 'open') {
        /* slow embers rising out of a finished world */
        var yy2 = ((s2 * H * 1.4 - t * (8 + s1 * 14)) % (H * 1.4));
        yy2 = yy2 < -H * 0.7 ? yy2 + H * 1.4 : yy2;
        var xx2 = (s1 - 0.5) * W * 1.15 + Math.sin(t * 0.35 + s3 * 7) * 34 * U;
        D.fill(rgba(pal.love, 0.10 + s3 * 0.34));
        D.circle(xx2, yy2, (0.7 + s3 * 2.0) * U);
        c.fill();
      } else {
        /* falling data glyphs */
        var col = Math.floor(s1 * 34);
        var yy3 = ((s2 * H * 1.35 + t * (30 + s3 * 90)) % (H * 1.35)) - H * 0.67;
        var xx3 = (col / 34 - 0.5) * W * 1.15;
        var a = 0.10 + s3 * 0.30;
        D.fill(rgba(pal.grid, a * (0.4 + w.density)));
        D.frect(xx3, yy3, 1.6 * U, (8 + s3 * 30) * U);
      }
    }
  }

  /* ==========================================================================
     5. VERTICAL THREADS — the "power line" / umbilical. Present from 0 s,
        pulled taut, then snapping during ISOLATION.
     ======================================================================== */
  function threads(w, pal, t) {
    var c = D.ctx();
    var n = 15;
    var snap = clamp((t - 116.4) / 1.1, 0, 1);
    for (var i = 0; i < n; i++) {
      var s = hash(i * 7717 + 5);
      var x = (i / (n - 1) - 0.5) * W * 0.86 + Math.sin(t * 0.4 + i) * 10 * U;
      var live = 1 - snap * (s > 0.45 ? 1 : 0.3);
      if (live <= 0.02) continue;
      var amp = (4 + 26 * w.chaos) * U * live;
      var pts = [];
      for (var k = 0; k <= 14; k++) {
        var u = k / 14;
        pts.push([x + Math.sin(u * 5 + t * 1.2 + i) * amp, (u - 0.5) * H * 1.05]);
      }
      D.lw(1);
      D.stroke(rgba(pal.grid, (0.06 + 0.11 * s) * live * (0.5 + w.density)));
      D.path(D.smooth(pts, 4), false);
    }
  }

  /* ==========================================================================
     6. SHATTER SHARDS — geometry that has stopped obeying the rules.
     ======================================================================== */
  function shards(w, pal, t) {
    if (w.shatter < 0.02) return;
    var c = D.ctx();
    var n = Math.round(w.shatter * 44);
    D.lw(1);
    for (var i = 0; i < n; i++) {
      var s = hash(i * 8191 + 17);
      var s2 = hash(i * 2731 + 91);
      var ang = s * TAU + t * (0.1 + s2 * 0.3);
      var rad = (60 + s2 * 560) * U * (0.4 + w.shatter);
      var px = Math.cos(ang) * rad;
      var py = Math.sin(ang * 1.2) * rad * 0.7;
      D.fill(rgba(s > 0.6 ? pal.hot : pal.grid, 0.06 + w.shatter * 0.16));
      D.stroke(rgba(pal.accent, 0.10 + w.shatter * 0.22));
      D.shard(s, px, py, (10 + s2 * 46) * U * w.shatter, ang, 0.5 + w.shatter * 0.4);
    }
  }

  /* ==========================================================================
     7. VIGNETTE + ALARM WASH
     ======================================================================== */
  function vignette(w, pal) {
    var c = D.ctx();
    if (w.heat > 0.05) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = w.heat * 0.16 * (0.7 + 0.3 * Math.sin(w.time * 6));
      c.fillStyle = rgba(pal.hot, 1);
      c.fillRect(-W / 2, -H / 2, W, H);
      c.restore();
    }
    var g = c.createRadialGradient(0, 0, H * 0.28, 0, 0, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0.72)');
    c.fillStyle = g;
    c.fillRect(-W / 2, -H / 2, W, H);
  }

  /* ==========================================================================
     MAIN DRAW
     ======================================================================== */
  function draw(w, pal, t, dim) {
    var c = D.ctx();
    bg(w, pal, w, t);
    gridField(w, pal, t);

    /* pick the topology, cross-fading during the seams so the world morphs */
    var shape = SHAPES[w.topo] || SHAPES.grid;
    c.save();
    /* a slow, deterministic camera drift: never enough to read as shake,
       but enough that the frame feels photographed rather than stamped */
    var driftX = Math.sin(t * 0.043) * 9 * U * (0.45 + w.chaos * 0.9)
               + (hash(Math.floor(t * 7) * 17) - 0.5) * w.shatter * 22 * U;
    var driftY = Math.cos(t * 0.057) * 7 * U * (0.45 + w.chaos * 0.9);
    var breathe = 1 + Math.sin(t * 0.11) * 0.006 + Math.sin(t * 0.31) * 0.002;
    c.translate(driftX, driftY + w.vert * -H * 0.02);
    c.rotate((w.tilt + Math.sin(t * 0.031) * 0.34) * Math.PI / 180);
    var zoom = lerp(1, w.scale, 0.5) * breathe;
    c.scale(zoom, zoom);
    c.globalAlpha = 1;
    if (w.shatter > 0.01) {
      c.translate((hash(Math.floor(t * 9) * 31) - 0.5) * w.shatter * 16 * U,
                  (hash(Math.floor(t * 9) * 61) - 0.5) * w.shatter * 16 * U);
    }
    threads(w, pal, t);
    shape(w, pal, t);
    c.restore();

    shards(w, pal, t);
    particles(w, pal, t);
    if (w.love > 0.28) loveGlyphs(w, pal, t);
    vignette(w, pal);
  }

  /* ==========================================================================
     8. LOVE GLYPHS — the thing the machine was never supposed to compute.
        Heart curves drawn as parametric plot points, drifting up.
     ======================================================================== */
  function loveGlyphs(w, pal, t) {
    var c = D.ctx();
    var n = Math.round(lerp(0, 26, (w.love - 0.28) / 0.72));
    for (var i = 0; i < n; i++) {
      var s1 = hash(i * 4421 + 3), s2 = hash(i * 9967 + 41);
      var yy = ((s2 * H * 1.4 - t * (16 + s1 * 30)) % (H * 1.4));
      yy = yy < -H * 0.7 ? yy + H * 1.4 : yy;
      var xx = (s1 - 0.5) * W * 1.1 + Math.sin(t * 0.5 + s2 * 12) * 40 * U;
      var sc = (7 + s2 * 16) * U;
      var al = (0.06 + s1 * 0.30) * clamp((w.love - 0.28) / 0.5, 0, 1);
      D.stroke(rgba(pal.love, al));
      D.lw(1.4);
      c.beginPath();
      for (var k = 0; k <= 26; k++) {
        var a = k / 26 * TAU;
        var hx = 16 * Math.pow(Math.sin(a), 3);
        var hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        var px = xx + hx / 16 * sc;
        var py = yy + hy / 16 * sc;
        if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
    }
  }

  EM.WorldLayer = { draw: draw, frame: frame, SHAPES: SHAPES };
})(window.EM);
