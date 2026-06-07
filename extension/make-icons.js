#!/usr/bin/env node
// Generates simple PNG icons for the extension.
// Run once: node make-icons.js
// Requires no dependencies — uses raw PNG binary format.

import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function makePNG(size, r, g, b) {
  // Build RGBA pixel data — solid color with rounded corners
  const pixels = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const radius = size / 2 - 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center, dy = y - center;
      const inside = Math.sqrt(dx * dx + dy * dy) <= radius;
      const i = (y * size + x) * 4;
      pixels[i]   = inside ? r : 0;
      pixels[i+1] = inside ? g : 0;
      pixels[i+2] = inside ? b : 0;
      pixels[i+3] = inside ? 255 : 0;
    }
  }

  // Build PNG raw data (filter byte 0 before each row)
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    raw.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }

  const compressed = deflateSync(Buffer.from(raw));

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const buf = Buffer.concat([typeBytes, data]);
    const crc = crc32(buf);
    const out = Buffer.allocUnsafe(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    typeBytes.copy(out, 4);
    data.copy(out, 8);
    out.writeInt32BE(crc, 8 + data.length);
    return out;
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC32 table
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ -1) | 0;
}

// Axion blue: #4da6ff → rgb(77, 166, 255)
for (const size of [16, 48, 128]) {
  const png = makePNG(size, 77, 166, 255);
  writeFileSync(`icons/icon${size}.png`, png);
  console.log(`✔ icons/icon${size}.png`);
}
