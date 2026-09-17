/* ============================================================================
   world.execute(me); — 20_lyrics.js
   Timings are the frame-accurate timeline of the provided audio
   (Mili - world.execute(me); , 211.984 s @ 130 BPM, 4/4).

   Each cue carries a SCENE id. scenes.js must implement every id, and the
   self-test fails the build if the two ever drift apart — that is how
   "every lyric line has its own visual" is *enforced*, not just intended.
   ==========================================================================*/
(function (EM) {
  'use strict';

  /* [time_seconds, text, scene_id, variant_index] --------------------------
     variant_index counts repeated lines so the same words can behave
     differently the 2nd / 6th / 12th time they are sung.                    */
  var CUES = [
    [0.000, '(pre-roll)', 0, 'boot.pre'],
    [0.100, 'Switch on the power line', 0, 'boot.power'],
    [1.740, 'Remember to put on', 0, 'boot.remember'],
    [2.920, 'PROTECTION', 0, 'boot.protect'],
    [3.873, 'Lay down your pieces', 0, 'boot.pieces'],
    [5.491, "And let's begin", 0, 'boot.begin'],
    [6.380, 'OBJECT CREATION', 0, 'boot.object'],
    [7.446, 'Fill in my data parameters', 0, 'boot.parameters'],
    [10.091, 'INITIALIZATION', 0, 'boot.init'],
    [11.095, 'Set up our new world', 0, 'boot.world'],
    [12.906, "And let's begin the", 0, 'boot.begin2'],
    [13.891, 'SIMULATION', 0, 'boot.sim'],
    [16.000, '(instrumental — world boot)', 0, 'inst.boot'],
    [29.709, "If I'm a set of points", 0, 'p.points'],
    [31.116, 'Then I will give you my', 0, 'p.giveA'],
    [32.682, 'DIMENSION', 0, 'p.dimension'],
    [33.412, "If I'm a circle", 0, 'p.circle'],
    [34.646, 'Then I will give you my', 0, 'p.giveB'],
    [36.287, 'CIRCUMFERENCE', 0, 'p.circumference'],
    [37.067, "If I'm a sine wave", 0, 'p.sine'],
    [38.596, 'Then you can sit on all my', 0, 'p.sit'],
    [40.049, 'TANGENTS', 0, 'p.tangents'],
    [40.706, 'If I approach infinity', 0, 'p.infinity'],
    [42.346, 'Then you can be my', 0, 'p.bemine'],
    [43.507, 'LIMITATIONS', 0, 'p.limitations'],
    [44.452, 'Switch my current', 0, 'p.current'],
    [45.850, 'To AC, to DC', 0, 'p.acdc'],
    [47.672, 'And then blind my vision', 0, 'p.blind'],
    [49.534, 'So dizzy, so dizzy', 0, 'p.dizzy'],
    [51.363, 'Oh, we can travel', 0, 'p.travel'],
    [53.225, 'To A.D., to B.C.', 0, 'p.adbc'],
    [55.083, 'And we can unite', 0, 'p.unite'],
    [56.916, 'So deeply, so deeply', 0, 'p.deeply'],
    [59.223, 'If I can', 0, 'c.ifIcan'],
    [59.687, 'If I can give you all the', 0, 'c.giveall'],
    [61.958, 'STIMULATIONS', 0, 'c.stim'],
    [62.589, 'Then I can', 0, 'c.thenIcan'],
    [63.535, 'Then I can be your only', 0, 'c.only'],
    [65.397, 'SATISFACTION', 0, 'c.satis'],
    [66.601, 'If I can make you happy', 0, 'c.happy'],
    [68.252, 'I will run the', 0, 'c.runthe'],
    [69.259, 'EXECUTION', 0, 'ex.first'],
    [70.084, 'Though we are trapped', 0, 'c.trapped'],
    [71.764, 'In this strange, strange', 0, 'c.strange'],
    [73.169, 'SIMULATION', 0, 'c.sim2'],
    [74.045, "If I'm an eggplant", 0, 'o.eggplant'],
    [75.422, 'Then I will give you my', 0, 'o.giveC'],
    [76.959, 'NUTRIENTS', 0, 'o.nutrients'],
    [77.576, "If I'm a tomato", 0, 'o.tomato'],
    [79.226, 'Then I will give you', 0, 'o.giveD'],
    [80.620, 'ANTIOXIDANTS', 0, 'o.antiox'],
    [81.351, "If I'm a tabby cat", 0, 'o.cat'],
    [82.833, 'Then I will purr for your', 0, 'o.purr'],
    [84.268, 'ENJOYMENT', 0, 'o.enjoy'],
    [85.078, "If I'm the only God", 0, 'o.god'],
    [86.538, "Then you're the proof of my", 0, 'o.proof'],
    [87.922, 'EXISTENCE', 0, 'o.existence'],
    [88.587, 'Switch my gender', 0, 'g.gender'],
    [90.197, 'To F, to M', 0, 'g.fm'],
    [92.015, 'And then do whatever', 0, 'g.whatever'],
    [93.953, 'From A.M. to P.M.', 0, 'g.ampm'],
    [95.465, 'Oh, switch my role', 0, 'g.role'],
    [97.739, 'To S, to M', 0, 'g.sm'],
    [99.349, 'So we can enter', 0, 'g.enter'],
    [101.474, 'The trance, the trance', 0, 'g.trance'],
    [103.489, 'If I can', 0, 'v.ifIcan2'],
    [104.197, 'If I can feel your', 0, 'v.feel'],
    [106.293, 'VIBRATIONS', 0, 'v.vibrations'],
    [107.220, 'Then I can', 0, 'v.thenIcan2'],
    [107.903, 'Then I can finally be', 0, 'v.finally'],
    [110.221, 'COMPLETION', 0, 'v.completion'],
    [110.900, 'Though you have left', 0, 'L.left1'],
    [112.220, 'You have left', 0, 'L.left2'],
    [113.100, 'You have left', 0, 'L.left3'],
    [114.180, 'You have left', 0, 'L.left4'],
    [114.920, 'You have left', 0, 'L.left5'],
    [115.780, 'You have left me in', 0, 'L.leftme'],
    [117.274, 'ISOLATION', 0, 'L.isolation'],
    [118.333, 'If I can', 0, 'f.ifIcan3'],
    [118.979, 'If I can erase all the pointless', 0, 'f.erase'],
    [120.860, 'FRAGMENTS', 0, 'f.fragments'],
    [121.728, 'Then maybe', 0, 'f.thenmaybe'],
    [122.714, "Then maybe you won't leave me so", 0, 'f.disheartened'],
    [124.890, 'DISHEARTENED', 0, 'f.disheartened2'],
    [125.708, 'Challenging your God', 0, 'arg.challenge'],
    [128.661, 'You have made some', 0, 'arg.madesome'],
    [131.224, 'ILLEGAL ARGUMENTS', 0, 'arg.illegal'],
    [134.380, '(instrumental — argument stack)', 0, 'inst.stack'],
    [147.660, 'EXECUTION', 0, 'ex.r1'],
    [148.600, 'EXECUTION', 0, 'ex.r2'],
    [149.520, 'EXECUTION', 0, 'ex.r3'],
    [150.540, 'EXECUTION', 0, 'ex.r4'],
    [151.520, 'EXECUTION', 0, 'ex.r5'],
    [152.280, 'EXECUTION', 0, 'ex.r6'],
    [153.160, 'EXECUTION', 0, 'ex.r7'],
    [153.980, 'EXECUTION', 0, 'ex.r8'],
    [155.200, 'EXECUTION', 0, 'ex.r9'],
    [156.080, 'EXECUTION', 0, 'ex.r10'],
    [157.040, 'EXECUTION', 0, 'ex.r11'],
    [158.000, 'EXECUTION', 0, 'ex.r12'],
    [158.900, 'Ein, dos', 0, 'ex.ein'],
    [159.657, 'Trois, ne', 0, 'ex.trois'],
    [160.693, 'Fem, liù', 0, 'ex.fem'],
    [161.584, 'EXECUTION', 0, 'ex.r13'],
    [162.632, 'If I can', 0, 'ex.ifIcan4'],
    [163.315, 'If I can give them all the', 0, 'ex.givethem'],
    [165.166, 'EXECUTION', 0, 'ex.r14'],
    [166.016, 'Then I can', 0, 'ex.thenIcan'],
    [167.022, 'Then I can be your only', 0, 'ex.only'],
    [168.911, 'EXECUTION', 0, 'ex.r15'],
    [169.824, 'If I can have you back', 0, 'ex.haveyouback'],
    [171.868, 'I will run the', 0, 'ex.runthe'],
    [172.712, 'EXECUTION', 0, 'ex.r16'],
    [173.643, 'Though we are trapped', 0, 'ex.trapped'],
    [174.975, 'We are trapped, ah', 0, 'ex.trapped2'],
    [177.246, "I've studied", 0, 'love.studied'],
    [178.173, "I've studied how to properly", 0, 'love.properly'],
    [179.929, 'LO-O-OVE', 0, 'love.l1'],
    [180.857, 'Question me', 0, 'love.question'],
    [181.901, 'Question me, I can answer all', 0, 'love.answer'],
    [183.646, 'LO-O-OVE', 0, 'love.l2'],
    [184.540, 'I know the algebraic expression of', 0, 'love.algebraic'],
    [187.665, 'LO-O-OVE', 0, 'love.l3'],
    [188.483, 'Though you are free', 0, 'love.free'],
    [189.746, 'I am trapped', 0, 'love.trappedme'],
    [190.801, 'Trapped in', 0, 'love.trappedin'],
    [191.356, 'LO-O-OVE', 0, 'love.l4b'],
    [193.460, '(instrumental — open loop)', 0, 'inst.loop'],
    [205.811, 'EXECUTION', 0, 'ex.final'],
    [206.620, '(outro)', 0, 'outro'],
    [211.984, '(end)', 0, 'end']
  ];

  /* number the repeats so scenes can vary the same words across the song */
  var counts = {};
  var C = [];
  for (var i = 0; i < CUES.length; i++) {
    var c = CUES[i];
    var key = c[3];                      /* scene id (CUES[i] = [t, text, 0, scene]) */
    counts[key] = (counts[key] || 0) + 1;
    C.push({
      i: i,
      t: c[0],
      text: c[1],
      scene: c[3],
      repeat: counts[key] - 1,
      dur: 0.6
    });
  }
  for (i = 0; i < C.length; i++) {
    C[i].end = (i + 1 < C.length) ? C[i + 1].t : EM.AUDIO_END;
    C[i].dur = Math.max(0.12, C[i].end - C[i].t);
  }

  /* index by scene id for the self-test */
  var BY_SCENE = {};
  for (i = 0; i < C.length; i++) BY_SCENE[C[i].scene] = C[i];

  /* cue active at time t (binary search — O(log n), called every frame)    */
  function at(t) {
    var lo = 0, hi = C.length - 1, best = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (C[mid].t <= t + 1e-6) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return C[best];
  }

  /* build the LRC text (used by the on-screen lyric panel + the self-test) */
  function toLRC() {
    var out = 'world.execute(me); — timeline\n';
    for (var i = 0; i < C.length; i++) {
      out += '[' + EM.fmtTime(C[i].t) + '] ' + C[i].text + '\n';
    }
    return out;
  }

  EM.Lyrics = {
    cues: C,
    count: C.length,
    at: at,
    byScene: BY_SCENE,
    toLRC: toLRC,
    duration: EM.AUDIO_END
  };
})(window.EM);
