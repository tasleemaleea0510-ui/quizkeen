#!/usr/bin/env node
/**
 * Turn Keen design sheets into the square PNGs the app serves.
 *
 * The app expects one square, transparent file per Keen at
 * `public/keens/<id>.png` (see `keenArtSrc` in `src/lib/keens.ts`). Design
 * sheets arrive as a character on a plain background with a label beside it, so
 * this script does the three things that need doing:
 *
 *   1. find the artwork — everything that is not the flat background colour,
 *   2. square it — pad the short side so the character is not stretched,
 *   3. cut it out — background pixels become transparent, so a Keen sits on the
 *      dark UI instead of carrying a white box around with it.
 *
 * There is no sharp/imagemagick here on purpose: it decodes and encodes PNG with
 * Node's own zlib, so `node scripts/crop-keens.mjs` works with no install step.
 *
 * USAGE
 *   Put each image in `scripts/keen-source/` named after the Keen id:
 *     pumpkin.png, chickenchick.png, chickchicken.png, frogula.png,
 *     cookiepumpkin.png, cookiemummy.png, cookieghost.png, pumpkinkingu.png
 *   Then run:   node scripts/crop-keens.mjs
 *   Check:      node scripts/crop-keens.mjs --self-test
 *
 * Only 8-bit RGB/RGBA non-interlaced PNGs are read — which is what a screenshot
 * or a design export produces. If a file is JPEG, save it as PNG first.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";

// Sources live outside `public/` on purpose: a design sheet is not a shipped
// asset, and anything under public is served to the world.
const SOURCE_DIR = join("scripts", "keen-source");
const OUT_DIR = join("public", "keens");
const SIZE = 512;
/** How far a pixel must sit from the background colour to count as artwork. */
const TOLERANCE = 42;

// ── PNG decode ───────────────────────────────────────────────────────────────

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let header = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }
  if (!header) throw new Error("missing IHDR");
  if (header.bitDepth !== 8) throw new Error(`unsupported bit depth ${header.bitDepth}`);
  if (header.interlace !== 0) throw new Error("interlaced PNGs are not supported");
  if (header.colorType !== 2 && header.colorType !== 6) {
    throw new Error(`unsupported colour type ${header.colorType} (need RGB or RGBA)`);
  }

  const { width, height } = header;
  const channels = header.colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const curStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? out[curStart + x - channels] : 0;
      const up = y > 0 ? out[curStart - stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? out[curStart - stride + x - channels] : 0;
      let value = raw[rowStart + x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) {
        throw new Error(`unknown filter ${filter}`);
      }
      out[curStart + x] = value & 0xff;
    }
  }

  // RGBA out, whatever came in: the rest of the script only deals with one shape.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < out.length; i += channels, j += 4) {
    rgba[j] = out[i];
    rgba[j + 1] = out[i + 1];
    rgba[j + 2] = out[i + 2];
    rgba[j + 3] = channels === 4 ? out[i + 3] : 255;
  }
  return { width, height, data: rgba };
}

// ── PNG encode ───────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);
  const name = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, payload])), 0);
  return Buffer.concat([length, name, payload, crc]);
}

function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Crop ─────────────────────────────────────────────────────────────────────

/** The background colour, read from the four corners and averaged. */
function backgroundColor({ width, height, data }) {
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  const sum = corners.reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
  return sum.map((value) => Math.round(value / corners.length));
}

function isArtwork(data, i, bg) {
  if (data[i + 3] < 24) return false;
  const distance =
    Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
  return distance > TOLERANCE;
}

/** The tight box around everything that is not background. */
function artworkBounds(image) {
  const bg = backgroundColor(image);
  const { width, height, data } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (!isArtwork(data, i, bg)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("no artwork found — is the image blank, or the background not flat?");
  return { minX, minY, maxX, maxY, bg };
}

/**
 * Cut the artwork out, square it and scale it to `SIZE`.
 *
 * Sampling is a box average: each destination pixel is the average of the source
 * pixels it covers, which is what keeps a 3000 px sheet from turning into a
 * jagged 512 px card.
 */
function cropToSquare(image) {
  const { minX, minY, maxX, maxY, bg } = artworkBounds(image);
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const side = Math.max(boxWidth, boxHeight);
  // A little air around the character, so it does not touch the card edge.
  const padded = Math.round(side * 1.08);
  const offsetX = minX - Math.round((padded - boxWidth) / 2);
  const offsetY = minY - Math.round((padded - boxHeight) / 2);

  const out = Buffer.alloc(SIZE * SIZE * 4);
  const scale = padded / SIZE;

  for (let y = 0; y < SIZE; y += 1) {
    const sy0 = offsetY + Math.floor(y * scale);
    const sy1 = offsetY + Math.floor((y + 1) * scale);
    for (let x = 0; x < SIZE; x += 1) {
      const sx0 = offsetX + Math.floor(x * scale);
      const sx1 = offsetX + Math.floor((x + 1) * scale);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = sy0; sy < Math.max(sy1, sy0 + 1); sy += 1) {
        if (sy < 0 || sy >= image.height) continue;
        for (let sx = sx0; sx < Math.max(sx1, sx0 + 1); sx += 1) {
          if (sx < 0 || sx >= image.width) continue;
          const i = (sy * image.width + sx) * 4;
          const opaque = data_isSolid(image.data, i);
          const alpha = opaque ? image.data[i + 3] : 0;
          r += image.data[i] * alpha;
          g += image.data[i + 1] * alpha;
          b += image.data[i + 2] * alpha;
          a += alpha;
          count += 1;
        }
      }
      const o = (y * SIZE + x) * 4;
      if (a > 0 && count > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / Math.max(1, count));
      }
    }
  }
  return { width: SIZE, height: SIZE, data: out, bg };
}

/** True when this pixel is artwork rather than background. */
function data_isSolid(data, i) {
  const bg = data.__bg ?? null;
  return bg ? isArtwork(data, i, bg) : data[i + 3] > 0;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function cropFile(sourcePath, label) {
  const image = decodePng(readFileSync(sourcePath));
  const bg = backgroundColor(image);
  // Attach the background so the sampler can drop it while it averages.
  image.data.__bg = bg;
  const result = cropToSquare(image);
  delete image.data.__bg;
  const png = encodePng(result);
  writeFileSync(join(OUT_DIR, `${label}.png`), png);
  return { label, source: sourcePath, bytes: png.length };
}

function selfTest() {
  // Build a sheet-shaped test image: a red square on a white field, with a lot
  // of margin — exactly what a design sheet looks like to this script.
  const width = 300;
  const height = 120;
  const data = Buffer.alloc(width * height * 4, 255);
  for (let y = 30; y < 90; y += 1) {
    for (let x = 40; x < 100; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 220;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 255;
    }
  }
  const sheet = decodePng(encodePng({ width, height, data }));
  sheet.data.__bg = backgroundColor(sheet);
  const cropped = cropToSquare(sheet);
  delete sheet.data.__bg;

  const problems = [];
  if (cropped.width !== SIZE || cropped.height !== SIZE) problems.push("not 512x512");
  // Corners must be transparent (trimmed margin), the middle must be artwork.
  const corner = (cropped.data[3] + cropped.data[(SIZE - 1) * 4 + 3]) / 2;
  const centre = cropped.data[(SIZE / 2) * SIZE * 4 + SIZE / 2 * 4 + 3];
  if (corner > 8) problems.push(`corner alpha ${corner} should be transparent`);
  if (centre < 200) problems.push(`centre alpha ${centre} should be opaque`);
  const roundTrip = decodePng(encodePng(cropped));
  if (roundTrip.width !== SIZE) problems.push("encode/decode round trip failed");

  if (problems.length) {
    console.error("self-test FAILED:", problems.join("; "));
    process.exitCode = 1;
    return;
  }
  console.log("self-test OK — decode, trim, square, cut-out and re-encode all work");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  if (!existsSync(SOURCE_DIR)) {
    console.error(`No source folder. Create ${SOURCE_DIR} and put the Keen images in it.`);
    process.exitCode = 1;
    return;
  }
  const files = readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith(".png"));
  if (files.length === 0) {
    console.error(`No .png files in ${SOURCE_DIR}.`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let failed = 0;
  for (const file of files) {
    const label = file.replace(/\.png$/i, "");
    try {
      const result = cropFile(join(SOURCE_DIR, file), label);
      console.log(`✓ ${label}.png  (${Math.round(result.bytes / 1024)} kB)`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${label}: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main();
