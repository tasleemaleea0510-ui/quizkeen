/**
 * Removes the black plate baked into some Keen artwork.
 *
 * A few of the exported pictures carry an opaque black rectangle behind the
 * character instead of transparency, which shows up on the collection as a
 * black square that ignores the card's colour. This walks in from the border
 * across pixels that are both opaque and near-black and clears their alpha, so
 * the card (or the pedestal behind it) shows through. Black *inside* the
 * character — outlines, eyes — is untouched because it is not reachable from
 * the border without crossing a coloured pixel.
 *
 * Run with `node scripts/matte-keens.mjs` (add `--dry` to only report).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const DRY = process.argv.includes("--dry");
const DIRS = ["public/keens", "public/keens/packs"];

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(CRC(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function decode(file) {
  const buf = readFileSync(file);
  let pos = 8, w = 0, h = 0, depth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || colorType !== 6 || interlace !== 0) return null;
  const bpp = 4, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, data: out };
}

function encode({ w, h, data }) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

for (const dir of DIRS) {
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  } catch {
    continue;
  }
  for (const name of files) {
    const file = `${dir}/${name}`;
    const img = decode(file);
    if (!img) {
      console.log(`${file}: skipped (not plain RGBA)`);
      continue;
    }
    const { w, h, data } = img;
    const at = (x, y) => (y * w + x) * 4;
    let borderDark = 0, borderTotal = 0;
    const consider = (x, y) => {
      const i = at(x, y);
      if (data[i + 3] < 200) return;
      borderTotal++;
      if (lum(data[i], data[i + 1], data[i + 2]) < 22) borderDark++;
    };
    for (let x = 0; x < w; x++) { consider(x, 0); consider(x, h - 1); }
    for (let y = 0; y < h; y++) { consider(0, y); consider(w - 1, y); }
    const share = borderTotal ? borderDark / borderTotal : 0;

    if (share < 0.5) {
      console.log(`${file}: no plate (${Math.round(share * 100)}% dark border)`);
      continue;
    }

    // Flood fill the plate from every border pixel that is opaque and black.
    const seen = new Uint8Array(w * h);
    const queue = [];
    const push = (x, y) => {
      const p = y * w + x;
      if (seen[p]) return;
      const i = at(x, y);
      if (data[i + 3] === 0) return;
      if (lum(data[i], data[i + 1], data[i + 2]) >= 22) return;
      seen[p] = 1;
      queue.push(p);
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

    let cleared = 0;
    while (queue.length) {
      const p = queue.pop();
      cleared++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }

    // Clear the plate, and soften the first opaque ring so the cutout does not
    // end in a hard black fringe against a coloured card.
    for (let p = 0; p < w * h; p++) {
      if (seen[p]) data[p * 4 + 3] = 0;
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x, i = p * 4;
        if (seen[p] || data[i + 3] === 0) continue;
        const touchesCleared =
          (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) ||
          (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
        if (!touchesCleared) continue;
        const l = lum(data[i], data[i + 1], data[i + 2]);
        if (l < 40) data[i + 3] = 0;
      }
    }

    const pct = Math.round((cleared / (w * h)) * 100);
    if (DRY) {
      console.log(`${file}: WOULD clear ${pct}% (${cleared} px)`);
    } else {
      writeFileSync(file, encode(img));
      console.log(`${file}: cleared ${pct}% (${cleared} px)`);
    }
  }
}
