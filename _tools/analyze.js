// Local analysis of the MP3 + MIDI. No network, no deps.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..');

// ---------- MP3 duration via frame walking (CBR/VBR header aware) ----------
function mp3Info(file) {
  const buf = fs.readFileSync(file);
  const out = { file, bytes: buf.length };
  // ID3v2 skip
  let off = 0;
  if (buf.slice(0, 3).toString('latin1') === 'ID3') {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    off = 10 + size;
    out.id3 = size;
  }
  // Xing/Info VBR header
  const xingOff = off + 4 + ((buf[off + 2] & 1) ? 32 : 17);
  const tag = buf.slice(xingOff, xingOff + 4).toString('latin1');
  const bitrates = { 1: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] };
  let frames = 0, totalBytes = 0, first = null, last = null;
  let p = off;
  const srTab = [44100, 48000, 32000];
  while (p + 4 < buf.length) {
    if (buf[p] !== 0xff || (buf[p + 1] & 0xe0) !== 0xe0) { p++; continue; }
    const verBits = (buf[p + 1] >> 3) & 3;   // 3 = MPEG1
    const layerBits = (buf[p + 1] >> 1) & 3; // 1 = Layer III
    const brIdx = (buf[p + 2] >> 4) & 0xf;
    const srIdx = (buf[p + 2] >> 2) & 3;
    const pad = (buf[p + 2] >> 1) & 1;
    if (verBits !== 3 || layerBits !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) { p++; continue; }
    const sr = srTab[srIdx];
    const br = bitrates[1][brIdx] * 1000;
    const len = Math.floor(144 * br / sr) + pad;
    const samples = 1152;
    if (first === null) first = { p, sr, br, len, samples };
    last = { p, sr, br, len, samples };
    totalBytes += len; frames++;
    p += len;
  }
  out.frames = frames;
  out.sampleRate = first && first.sr;
  out.bitrate = first && first.br;
  out.tag = tag;
  // duration: use samples/frames * 1152 / sr
  if (first) out.duration = frames * 1152 / first.sr;
  out.audioStartSec = first ? (first.p) : null;
  return out;
}

// ---------- MIDI parse ----------
function midiInfo(file) {
  const buf = fs.readFileSync(file);
  let p = 0;
  const r16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
  const r32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
  const rstr = (n) => { const s = buf.slice(p, p + n).toString('latin1'); p += n; return s; };
  const vlq = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  const hdr = rstr(4);
  const hlen = r32();
  const fmt = r16(), ntrk = r16(), div = r16();
  const res = { hdr, hlen, fmt, ntrk, div, tracks: [], tempos: [], notes: 0, noteList: [] };
  for (let t = 0; t < ntrk; t++) {
    const id = rstr(4); const len = r32(); const end = p + len;
    const trk = { id, len, events: [], name: null };
    let tick = 0, running = 0;
    while (p < end) {
      const d = vlq(); tick += d;
      let st = buf[p];
      if (st & 0x80) { p++; running = st; } else { st = running; }
      const type = st & 0xf0;
      if (st === 0xff) {
        const mt = buf[p++]; const l = vlq(); const data = buf.slice(p, p + l); p += l;
        if (mt === 0x51) {
          const us = (data[0] << 16) | (data[1] << 8) | data[2];
          res.tempos.push({ tick, us, bpm: 60000000 / us });
          trk.events.push({ tick, type: 'tempo', bpm: 60000000 / us });
        } else if (mt === 0x03) { trk.name = data.toString('latin1'); trk.events.push({ tick, type: 'name', v: trk.name }); }
        else if (mt === 0x58) trk.events.push({ tick, type: 'timesig', v: [...data] });
        else if (mt === 0x2f) trk.events.push({ tick, type: 'end' });
      } else if (st === 0xf0 || st === 0xf7) {
        const l = vlq(); p += l;
      } else if (type === 0x90 || type === 0x80) {
        const note = buf[p++], vel = buf[p++];
        if (type === 0x90 && vel > 0) { res.notes++; res.noteList.push({ tick, note, vel, trk: t }); }
        trk.events.push({ tick, type: type === 0x90 ? 'on' : 'off', note, vel });
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) { p += 2; }
      else if (type === 0xc0 || type === 0xd0) { p += 1; }
      else { p++; }
    }
    p = end;
    res.tracks.push(trk);
  }
  return res;
}

const mp3 = mp3Info(path.join(DIR, 'Mili - world.execute (me) ;.mp3'));
console.log('=== MP3 ===');
console.log(JSON.stringify(mp3, null, 1));

const mid = midiInfo(path.join(DIR, 'world.execute (me) ;.mid'));
console.log('=== MIDI ===');
console.log('fmt', mid.fmt, 'ntrk', mid.ntrk, 'div', mid.div, 'notes', mid.notes);
console.log('tempos', JSON.stringify(mid.tempos));
mid.tracks.forEach((t, i) => {
  const evs = t.events.filter(e => e.type === 'name' || e.type === 'timesig' || e.type === 'tempo');
  const on = t.events.filter(e => e.type === 'on');
  const tickMax = t.events.length ? Math.max(...t.events.map(e => e.tick)) : 0;
  console.log(`track ${i}: name=${t.name} events=${t.events.length} notesOn=${on.length} lastTick=${tickMax}`, JSON.stringify(evs.slice(0, 6)));
});
