/* ============================================================================
   world.execute(me); — 01_world.js
   The persistent "simulation" the whole film lives inside.

   Everything visual is driven from ONE number: audio.currentTime (seconds).
   worldAt(t) returns the interpolated global state of the world. Lyric plates
   read this state, so the world decays / warms / shatters *continuously*
   underneath the per-line visuals. That is what keeps 95 discrete tableaux
   feeling like one film instead of a slideshow.
   ==========================================================================*/
(function (global) {
  'use strict';

  var EM = global.EM;

  /* --------------------------------------------------------------------------
     THE WORLD ARC  (read the table like a score)
     --------------------------------------------------------------------------
     struct   how much of the drawn world still obeys its own rules (1 = perfect)
     chaos    geometric disorder / jitter / shattered shards
     warm     0 = cryogenic monitor blue, 1 = body heat
     heat     0 = safe, 1 = alarm / metal-under-strain
     rot      0 = clean code, 1 = organic growth (vines, flesh, purr)
     love     the forbidden variable the machine is not allowed to have
     density  how many particles / nodes are alive
     scale    how zoomed-in the camera is (1 = wide)
     tilt     roll of the whole world, degrees
     vert     vertical drop (the pit; rises to +1 at "ISOLATION")
     shatter  0..1 - shard displacement applied to world geometry
     glow     bloom amount
     topo     'grid' -> 'sphere' -> 'wave' -> 'organic' -> 'tangle' -> 'open'
     alarm    'idle' | 'warn' | 'error' | 'exec'
     ------------------------------------------------------------------------ */
  var KEYS = [
    [0.000, { struct: 0.08, chaos: 0.12, warm: 0.00, heat: 0.00, rot: 0.00, love: 0.00, density: 0.13, scale: 1.30, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.30, topo: 'grid',    alarm: 'idle' }],
    [1.000, { struct: 0.26, chaos: 0.07, warm: 0.00, heat: 0.00, rot: 0.00, love: 0.00, density: 0.24, scale: 1.24, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.36, topo: 'grid' }],
    [6.400, { struct: 0.64, chaos: 0.05, warm: 0.02, heat: 0.00, rot: 0.00, love: 0.00, density: 0.46, scale: 1.08, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.44, topo: 'grid' }],
    [13.900,{ struct: 0.92, chaos: 0.03, warm: 0.03, heat: 0.00, rot: 0.00, love: 0.00, density: 0.66, scale: 0.99, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.48, topo: 'grid' }],
    [16.000,{ struct: 0.86, chaos: 0.07, warm: 0.10, heat: 0.00, rot: 0.01, love: 0.00, density: 0.56, scale: 1.04, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.46, topo: 'sphere' }],
    [26.000,{ struct: 0.80, chaos: 0.16, warm: 0.16, heat: 0.00, rot: 0.03, love: 0.00, density: 0.60, scale: 0.98, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.44, topo: 'sphere' }],
    [29.700,{ struct: 0.90, chaos: 0.06, warm: 0.04, heat: 0.00, rot: 0.00, love: 0.00, density: 0.72, scale: 0.96, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.36, topo: 'grid' }],
    [59.200,{ struct: 0.82, chaos: 0.10, warm: 0.12, heat: 0.00, rot: 0.00, love: 0.02, density: 0.76, scale: 0.94, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.36, topo: 'wave' }],
    [74.000,{ struct: 0.74, chaos: 0.12, warm: 0.26, heat: 0.00, rot: 0.48, love: 0.05, density: 0.74, scale: 0.92, tilt: -0.4,vert: 0.00, shatter: 0.00, glow: 0.38, topo: 'organic' }],
    [88.600,{ struct: 0.70, chaos: 0.14, warm: 0.34, heat: 0.02, rot: 0.62, love: 0.08, density: 0.72, scale: 0.92, tilt: 0.6, vert: 0.00, shatter: 0.00, glow: 0.40, topo: 'organic' }],
    [103.400,{struct: 0.68, chaos: 0.16, warm: 0.30, heat: 0.03, rot: 0.66, love: 0.14, density: 0.74, scale: 0.90, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.42, topo: 'organic' }],
    [110.900,{struct: 0.62, chaos: 0.28, warm: 0.10, heat: 0.04, rot: 0.30, love: 0.06, density: 0.55, scale: 0.94, tilt: 0.0, vert: 0.10, shatter: 0.04, glow: 0.32, topo: 'tangle' }],
    [117.300,{struct: 0.34, chaos: 0.46, warm: 0.00, heat: 0.06, rot: 0.02, love: 0.00, density: 0.26, scale: 1.02, tilt: 0.0, vert: 0.85, shatter: 0.20, glow: 0.18, topo: 'tangle' }],
    [121.700,{struct: 0.30, chaos: 0.50, warm: 0.00, heat: 0.08, rot: 0.00, love: 0.00, density: 0.22, scale: 1.04, tilt: 0.0, vert: 0.92, shatter: 0.24, glow: 0.16, topo: 'tangle' }],
    [125.700,{struct: 0.42, chaos: 0.40, warm: 0.02, heat: 0.34, rot: 0.00, love: 0.00, density: 0.44, scale: 0.98, tilt: 0.0, vert: 0.40, shatter: 0.16, glow: 0.36, topo: 'tangle', alarm: 'warn' }],
    [134.400,{struct: 0.46, chaos: 0.46, warm: 0.00, heat: 0.62, rot: 0.00, love: 0.00, density: 0.50, scale: 0.94, tilt: 0.0, vert: 0.20, shatter: 0.20, glow: 0.46, topo: 'tangle', alarm: 'error' }],
    [147.700,{struct: 0.52, chaos: 0.60, warm: 0.00, heat: 0.88, rot: 0.00, love: 0.02, density: 0.66, scale: 0.98, tilt: 0.0, vert: 0.00, shatter: 0.26, glow: 0.58, topo: 'tangle', alarm: 'exec' }],
    [158.000,{struct: 0.44, chaos: 0.70, warm: 0.00, heat: 1.00, rot: 0.00, love: 0.04, density: 0.82, scale: 1.02, tilt: 0.0, vert: 0.00, shatter: 0.34, glow: 0.72, topo: 'tangle', alarm: 'exec' }],
    [170.000,{struct: 0.38, chaos: 0.78, warm: 0.00, heat: 1.00, rot: 0.00, love: 0.10, density: 0.90, scale: 1.06, tilt: 0.0, vert: 0.00, shatter: 0.42, glow: 0.80, topo: 'tangle', alarm: 'exec' }],
    [177.200,{struct: 0.30, chaos: 0.86, warm: 0.06, heat: 0.92, rot: 0.02, love: 0.34, density: 0.94, scale: 1.10, tilt: 0.0, vert: 0.00, shatter: 0.52, glow: 0.88, topo: 'tangle', alarm: 'exec' }],
    [184.600,{struct: 0.16, chaos: 0.74, warm: 0.42, heat: 0.48, rot: 0.10, love: 0.74, density: 0.82, scale: 1.04, tilt: 0.0, vert: 0.00, shatter: 0.44, glow: 0.74, topo: 'open',   alarm: 'warn' }],
    [189.800,{struct: 0.09, chaos: 0.44, warm: 0.66, heat: 0.16, rot: 0.06, love: 0.92, density: 0.62, scale: 1.10, tilt: 0.0, vert: 0.00, shatter: 0.28, glow: 0.62, topo: 'open',   alarm: 'idle' }],
    [193.400,{struct: 0.03, chaos: 0.12, warm: 0.78, heat: 0.00, rot: 0.00, love: 1.00, density: 0.40, scale: 1.20, tilt: 0.0, vert: 0.00, shatter: 0.08, glow: 0.46, topo: 'open',   alarm: 'idle' }],
    [205.800,{struct: 0.01, chaos: 0.05, warm: 0.84, heat: 0.00, rot: 0.00, love: 1.00, density: 0.20, scale: 1.32, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.40, topo: 'open',   alarm: 'idle' }],
    [211.984,{struct: 0.00, chaos: 0.02, warm: 0.86, heat: 0.00, rot: 0.00, love: 1.00, density: 0.10, scale: 1.42, tilt: 0.0, vert: 0.00, shatter: 0.00, glow: 0.36, topo: 'open',   alarm: 'idle' }]
  ];

  var NUM = ['struct', 'chaos', 'warm', 'heat', 'rot', 'love', 'density', 'scale',
             'tilt', 'vert', 'shatter', 'glow'];
  var DISCRETE = ['topo', 'alarm'];

  /* piecewise-linear, monotone: cheap, stable and exactly frame-rate independent */
  function sample(t) {
    var lo = KEYS[0], hi = KEYS[KEYS.length - 1], i;
    for (i = 0; i < KEYS.length - 1; i++) {
      if (t >= KEYS[i][0] && t <= KEYS[i + 1][0]) { lo = KEYS[i]; hi = KEYS[i + 1]; break; }
    }
    if (t <= KEYS[0][0]) { lo = hi = KEYS[0]; }
    if (t >= KEYS[KEYS.length - 1][0]) { lo = hi = KEYS[KEYS.length - 1]; }

    var a = lo[1], b = hi[1];
    var u = (hi[0] === lo[0]) ? 0 : (t - lo[0]) / (hi[0] - lo[0]);
    u = u < 0 ? 0 : (u > 1 ? 1 : u);
    var e = u * u * (3 - 2 * u); /* smoothstep between keys => no velocity jumps */

    var out = {};
    for (var k = 0; k < NUM.length; k++) {
      var key = NUM[k];
      var va = a[key] === undefined ? 0 : a[key];
      var vb = b[key] === undefined ? va : b[key];
      out[key] = va + (vb - va) * e;
    }
    for (var d = 0; d < DISCRETE.length; d++) {
      out[DISCRETE[d]] = (e < 0.5 ? a[DISCRETE[d]] : b[DISCRETE[d]]) || a[DISCRETE[d]];
    }
    out.time = t;
    return out;
  }

  /* --------------------------------------------------------------------------
     COLOUR: one palette lerped by the world state.
     Monitor blue -> sterile white -> arc-weld orange -> alarm red ->
     flesh / vegetable -> written-paper warmth.
     ------------------------------------------------------------------------ */
  var C = EM.color;

  var PAL = {
    void:   [4, 6, 10],
    deep:   [8, 12, 20],
    ink:    [16, 22, 34],
    line:   [58, 92, 116],
    cyan:   [86, 214, 232],
    white:  [226, 240, 248],
    warn:   [246, 176, 62],
    red:    [232, 62, 54],
    flesh:  [242, 128, 176],
    paper:  [246, 238, 222],
    leaf:   [128, 206, 122],
    violet: [150, 116, 220]
  };

  function mix(a, b, u) {
    u = u < 0 ? 0 : (u > 1 ? 1 : u);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  function css(c, alpha) {
    if (alpha === undefined) alpha = 1;
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + alpha + ')';
  }

  /* derived palette for a world state */
  function palette(w) {
    var cold = mix(PAL.deep, PAL.cyan, 0.16 * (1 - w.warm));
    var accent = mix(PAL.cyan, PAL.white, w.warm * 0.55);
    accent = mix(accent, PAL.warn, w.heat * 0.85);
    accent = mix(accent, PAL.red, w.heat * w.heat * 0.9);
    accent = mix(accent, PAL.flesh, w.rot * 0.55 * (1 - w.heat));
    accent = mix(accent, PAL.paper, w.love * 0.5 * (1 - w.heat));
    var grid = mix(PAL.line, accent, 0.34);
    var hot = mix(mix(PAL.red, PAL.warn, 0.35), PAL.flesh, w.love * 0.35);
    return {
      bg0: css(mix(PAL.void, PAL.ink, w.warm * 0.55)),
      bg1: css(mix(PAL.deep, mix(PAL.ink, PAL.warn, 0.25), w.warm * 0.42 + w.heat * 0.14)),
      accent: accent,
      accentCSS: css(accent),
      grid: grid,
      gridCSS: css(grid),
      hot: hot,
      hotCSS: css(hot),
      ink: css(mix(PAL.white, PAL.paper, w.warm)),
      dim: css(mix(PAL.line, accent, 0.22), 0.5),
      paper: css(mix(PAL.white, PAL.paper, 0.6)),
      love: css(mix(PAL.flesh, PAL.paper, w.warm * 0.5))
    };
  }

  EM.World = { at: sample, palette: palette, mix: mix, css: css, COLORS: PAL, KEYS: KEYS };
})(window);
