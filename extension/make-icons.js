#!/usr/bin/env node
// Generates PNG icons for the extension matching the Axion ◈ logo.
// Run once: node make-icons.js

import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const s  = size / 128;
  const cx = size / 2;
  const cy = size / 2;

  function setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // alpha blend
    const pa = pixels[i + 3] / 255;
    const na = a / 255;
    const out = na + pa * (1 - na);
    if (out === 0) return;
    pixels[i]     = (r * na + pixels[i]     * pa * (1 - na)) / out;
    pixels[i + 1] = (g * na + pixels[i + 1] * pa * (1 - na)) / out;
    pixels[i + 2] = (b * na + pixels[i + 2] * pa * (1 - na)) / out;
    pixels[i + 3] = out * 255;
  }

  // ── Background circle ──────────────────────────────────────────────────────
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d <= size / 2 - 0.5) {
        // Dark gradient: blend #1a1a2e → #16213e based on distance
        const t = d / (size / 2);
        const i = (y * size + x) * 4;
        pixels[i]     = Math.round(26  - t * 4);
        pixels[i + 1] = Math.round(26  + t * 7);
        pixels[i + 2] = Math.round(46  - t * 8);
        pixels[i + 3] = 255;
      }
    }
  }

  // ── Draw stroke helper (anti-aliased thick line) ───────────────────────────
  const sw = Math.max(1.2, 2.2 * s); // stroke radius

  function drawLine(x1, y1, x2, y2, r = 77, g = 166, b = 255) {
    x1 *= s; y1 *= s; x2 *= s; y2 *= s;
    const len   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.ceil(len * 3);
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      for (let dy = -Math.ceil(sw + 1); dy <= Math.ceil(sw + 1); dy++) {
        for (let dx = -Math.ceil(sw + 1); dx <= Math.ceil(sw + 1); dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const alpha = Math.max(0, Math.min(1, sw - dist + 0.5)) * 255;
          if (alpha > 0) setPixel(px + dx, py + dy, r, g, b, alpha);
        }
      }
    }
  }

  function drawCircleFill(px, py, radius, r = 77, g = 166, b = 255) {
    for (let dy = -Math.ceil(radius + 1); dy <= Math.ceil(radius + 1); dy++) {
      for (let dx = -Math.ceil(radius + 1); dx <= Math.ceil(radius + 1); dx++) {
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, Math.min(1, radius - dist + 0.5)) * 255;
        if (alpha > 0) setPixel(px + dx, py + dy, r, g, b, alpha);
      }
    }
  }

  // ── ◈ shape ────────────────────────────────────────────────────────────────
  // All coordinates are in 128px space, scaled by s

  // Outer diamond
  drawLine(64, 14, 114, 64);
  drawLine(114, 64, 64, 114);
  drawLine(64, 114, 14, 64);
  drawLine(14, 64, 64, 14);

  // Inner square
  drawLine(44, 44, 84, 44);
  drawLine(84, 44, 84, 84);
  drawLine(84, 84, 44, 84);
  drawLine(44, 84, 44, 44);

  // Crosshair lines (diamond vertex → square midpoint)
  drawLine(64, 14, 64, 44);
  drawLine(64, 84, 64, 114);
  drawLine(14, 64, 44, 64);
  drawLine(84, 64, 114, 64);

  // Center dot
  drawCircleFill(cx, cy, 4.5 * s);

  return pixels;
}

function buildPNG(size) {
  const pixels = drawIcon(size);

  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    raw.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const compressed = deflateSync(Buffer.from(raw));

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
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = buildPNG(size);
  writeFileSync(`icons/icon${size}.png`, png);
  console.log(`✔ icons/icon${size}.png`);
}
