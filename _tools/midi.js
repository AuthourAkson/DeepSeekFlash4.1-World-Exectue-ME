const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..');
const buf = fs.readFileSync(path.join(DIR, 'world.execute (me) ;.mid'));
let p = 0;
const r16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
const r32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
const rstr = (n) => { const s = buf.slice(p, p + n).toString('latin1'); p += n; return s; };
const vlq = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
rstr(4); r32(); const fmt = r16(); const ntrk = r16(); const div = r16();
let usPerQN = 500000, tempos = [];
const all = [];
for (let t = 0; t < ntrk; t++) {
  rstr(4); const len = r32(); const end = p + len;
  let tick = 0, running = 0;
  while (p < end) {
    tick += vlq();
    let st = buf[p];
    if (st & 0x80) { p++; running = st; } else st = running;
    const type = st & 0xf0;
    if (st === 0xff) {
      const mt = buf[p++]; const l = vlq(); const d = buf.slice(p, p + l); p += l;
      if (mt === 0x51) { usPerQN = (d[0] << 16) | (d[1] << 8) | d[2]; tempos.push({ tick, usPerQN }); }
    } else if (st === 0xf0 || st === 0xf7) { p += vlq(); }
    else if (type === 0x90 || type === 0x80) {
      const note = buf[p++], vel = buf[p++];
      if (type === 0x90 && vel > 0) all.push({ tick, note, vel, t: tick * usPerQN / div / 1e6 });
    } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) p += 2;
    else if (type === 0xc0 || type === 0xd0) p += 1;
    else p++;
  }
  p = end;
}
// group into onsets (notes within 5ms)
const onsets = [];
for (const n of all.sort((a, b) => a.t - b.t)) {
  const last = onsets[onsets.length - 1];
  if (last && n.t - last.t < 0.006) { last.notes.push(n.note); last.vel = Math.max(last.vel, n.vel); }
  else onsets.push({ t: n.t, notes: [n.note], vel: n.vel });
}
console.log('fmt', fmt, 'div', div, 'tempos', JSON.stringify(tempos));
console.log('total noteOn', all.length, 'onsets', onsets.length, 'lastOnset', onsets[onsets.length - 1].t.toFixed(3));
// beat grid
const spb = 60 / 130;
console.log('secPerBeat', spb.toFixed(6), 'totalBeats', (onsets[onsets.length - 1].t / spb).toFixed(2));
// pitch histogram per 4s bucket to see sections
const buckets = {};
for (const o of onsets) {
  const b = Math.floor(o.t / 4) * 4;
  buckets[b] = buckets[b] || { n: 0, lo: 200, hi: 0, dens: 0 };
  buckets[b].n++;
  buckets[b].lo = Math.min(buckets[b].lo, ...o.notes);
  buckets[b].hi = Math.max(buckets[b].hi, ...o.notes);
}
// onset density per second
const dens = new Array(212).fill(0);
for (const o of onsets) { const i = Math.min(211, Math.floor(o.t)); dens[i]++; }
let line = '';
for (let i = 0; i < 212; i++) line += `${String(i).padStart(3)}:${String(dens[i]).padStart(2)} `, i % 12 === 11 && (line += '\n');
console.log('=== onset density per second ===');
console.log(line);
// detect gaps (silence-ish) and bursts
let gaps = [], s = null;
for (let i = 0; i < 212; i++) {
  if (dens[i] === 0) { if (s === null) s = i; } else if (s !== null) { gaps.push([s, i - 1]); s = null; }
}
if (s !== null) gaps.push([s, 211]);
console.log('=== zero-onset runs (>=1s) ===');
console.log(gaps.filter(g => g[1] - g[0] >= 1).map(g => `${g[0]}-${g[1]}`).join(', '));
// compressed onset track for embedding
const comp = onsets.map(o => [Math.round(o.t * 1000), Math.min(...o.notes), Math.max(...o.notes), o.notes.length, o.vel]);
fs.writeFileSync(path.join(__dirname, 'onsets.json'), JSON.stringify(comp));
console.log('onsets.json bytes', fs.statSync(path.join(__dirname, 'onsets.json')).size);
