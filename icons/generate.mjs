// PNG アイコンをバイナリで直接生成するスクリプト
// 外部ライブラリ不要（Node.js 標準モジュールのみ使用）

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function writePng(filename, width, height, pixels) {
  // pixels: Uint8Array of RGBA (width * height * 4 bytes)

  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeB, data]);
    let crc = 0xffffffff;
    for (const b of crcBuf) {
      crc ^= b;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const crcB = Buffer.allocUnsafe(4);
    crcB.writeUInt32BE(crc);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB (3チャンネル)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT: filter byte (0) + RGB per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // alpha blend over white background
      const a = pixels[i + 3] / 255;
      rawRows.push(Math.round(pixels[i] * a + 255 * (1 - a)));
      rawRows.push(Math.round(pixels[i+1] * a + 255 * (1 - a)));
      rawRows.push(Math.round(pixels[i+2] * a + 255 * (1 - a)));
    }
  }
  const compressed = deflateSync(Buffer.from(rawRows));

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(filename, png);
  console.log(`✓ ${filename} (${width}x${height})`);
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const cornerR = size * 0.125; // 角丸の半径

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // alpha blend
    const srcA = a / 255;
    const dstA = pixels[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA === 0) return;
    pixels[i]     = Math.round((r * srcA + pixels[i]     * dstA * (1 - srcA)) / outA);
    pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
    pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
    pixels[i + 3] = Math.round(outA * 255);
  }

  // 角丸矩形の内側判定
  function inRoundRect(x, y, rx, ry, rw, rh, cr) {
    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
    const dx = Math.max(rx + cr - x, 0, x - (rx + rw - cr));
    const dy = Math.max(ry + cr - y, 0, y - (ry + rh - cr));
    return dx * dx + dy * dy <= cr * cr || (dx === 0 || dy === 0);
  }

  // 背景描画: Angular レッド (#DD0031)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inRoundRect(x, y, 0, 0, size, size, cornerR)) {
        setPixel(x, y, 0xDD, 0x00, 0x31, 255);
      }
    }
  }

  // シールド形 (Angular ロゴ風)
  const sw = size * 0.52; // シールド幅
  const sh = size * 0.60; // シールド高さ
  const sx = cx - sw / 2;
  const sy = cy - sh / 2 - size * 0.04;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - sx) / sw; // 0..1
      const ny = (y - sy) / sh; // 0..1
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
      // 台形っぽいシールド: 下に向かって狭くなる
      const halfW = 0.5 - Math.max(0, (ny - 0.6)) * 0.8;
      if (Math.abs(nx - 0.5) <= halfW) {
        setPixel(x, y, 255, 255, 255, 230);
      }
    }
  }

  // "A" の文字（ベジェ近似なしのシンプルな描画）
  const fs = size * 0.30; // font size
  const tx = cx;
  const ty = cy + size * 0.08;

  // A の左斜め線
  for (let t = 0; t <= 1; t += 0.002) {
    const lx = Math.round(tx - fs * 0.38 * (1 - t));
    const ly = Math.round(ty + fs * 0.4 - fs * 0.8 * (1 - t));
    for (let dx = -Math.max(1, size * 0.025); dx <= Math.max(1, size * 0.025); dx++) {
      setPixel(Math.round(lx + dx), ly, 0xDD, 0x00, 0x31, 255);
    }
  }
  // A の右斜め線
  for (let t = 0; t <= 1; t += 0.002) {
    const lx = Math.round(tx + fs * 0.38 * (1 - t));
    const ly = Math.round(ty + fs * 0.4 - fs * 0.8 * (1 - t));
    for (let dx = -Math.max(1, size * 0.025); dx <= Math.max(1, size * 0.025); dx++) {
      setPixel(Math.round(lx + dx), ly, 0xDD, 0x00, 0x31, 255);
    }
  }
  // A の横棒
  const barY = Math.round(ty + fs * 0.05);
  const barX1 = Math.round(tx - fs * 0.18);
  const barX2 = Math.round(tx + fs * 0.18);
  for (let x = barX1; x <= barX2; x++) {
    for (let dy = -Math.max(1, size * 0.02); dy <= Math.max(1, size * 0.02); dy++) {
      setPixel(x, barY + Math.round(dy), 0xDD, 0x00, 0x31, 255);
    }
  }

  // 右下の緑ドット (#00C864) - ハイライトを表現
  const dotR = size * 0.14;
  const dotCx = size * 0.76;
  const dotCy = size * 0.76;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - dotCx) ** 2 + (y - dotCy) ** 2);
      if (d <= dotR) {
        setPixel(x, y, 0x00, 0xC8, 0x64, 255);
      }
    }
  }

  // チェックマーク（ドット内）
  if (size >= 32) {
    const ck = size * 0.07;
    for (let t = 0; t <= 1; t += 0.005) {
      // 左下がり
      const x1 = Math.round(dotCx - ck * 0.6 + ck * 0.4 * t);
      const y1 = Math.round(dotCy + ck * 0.1 * t);
      setPixel(x1, y1, 255, 255, 255, 230);
      setPixel(x1, y1 + 1, 255, 255, 255, 180);
      // 右上がり
      const x2 = Math.round(dotCx - ck * 0.2 + ck * 0.8 * t);
      const y2 = Math.round(dotCy + ck * 0.1 - ck * 0.8 * t);
      setPixel(x2, y2, 255, 255, 255, 230);
      setPixel(x2, y2 + 1, 255, 255, 255, 180);
    }
  }

  return pixels;
}

for (const size of [128, 48, 16]) {
  const pixels = generateIcon(size);
  writePng(`icon${size}.png`, size, size, pixels);
}
