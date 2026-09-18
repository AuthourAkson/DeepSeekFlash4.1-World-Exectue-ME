'use strict';
const fs=require('fs'),zlib=require('zlib');
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('不是 PNG');
  let i = 8, ihdr = null, idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.slice(i + 8, i + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], colour: data[9] };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (!ihdr || (ihdr.colour !== 2 && ihdr.colour !== 6) || ihdr.depth !== 8)
    throw new Error('只支持 8bit RGB/RGBA PNG（色型 ' + (ihdr && ihdr.colour) + '）');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, bpp = ihdr.colour === 6 ? 4 : 3, stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[p + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? px[(y - 1) * stride + x - bpp] : 0;
      let v;
      if (ft === 0) v = cur;
      else if (ft === 1) v = cur + a;
      else if (ft === 2) v = cur + b;
      else if (ft === 3) v = cur + ((a + b) >> 1);
      else { // Paeth
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = cur + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c));
      }
      px[y * stride + x] = v & 255;
    }
    p += stride;
  }
  const alpha = bpp === 4 ? px : null;
  if (bpp === 4) {
    const rgb = Buffer.alloc(h * w * 3);
    for (let i = 0, n = w * h; i < n; i++) {
      const a = px[i * 4 + 3] / 255;
      rgb[i * 3] = px[i * 4] * a; rgb[i * 3 + 1] = px[i * 4 + 1] * a; rgb[i * 3 + 2] = px[i * 4 + 2] * a;
    }
    return { w, h, px: rgb, alpha: alpha };
  }
  return { w, h, px, alpha: null };
}

module.exports={decodePng};
