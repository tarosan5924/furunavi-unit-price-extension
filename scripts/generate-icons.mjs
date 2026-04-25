/**
 * 依存ゼロの純 Node.js PNG 生成スクリプト。
 * 16 / 48 / 128px の単色アイコンを icons/ に出力する。
 *
 * PNG 構造:
 *   シグネチャ(8B) + IHDR チャンク + IDAT チャンク(zlib 圧縮) + IEND チャンク
 *
 * zlib の代わりに deflate-stored（非圧縮）ブロックを使用して
 * 外部依存なしで有効な PNG を生成する。
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, "../icons");

/** 背景色 #2563eb（Tailwind blue-600）の RGB */
const BG = { r: 0x25, g: 0x63, b: 0xeb };

/** CRC-32 テーブルを生成する */
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

/**
 * バイト列の CRC-32 を計算する。
 *
 * @param {Uint8Array} buf
 * @returns {number}
 */
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * PNG チャンクを生成する。
 *
 * @param {string} type - 4文字のチャンクタイプ
 * @param {Uint8Array} data - チャンクデータ
 * @returns {Uint8Array}
 */
function chunk(type, data) {
  const typeBuf = new TextEncoder().encode(type);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length, false);
  const crcInput = new Uint8Array(typeBuf.length + data.length);
  crcInput.set(typeBuf);
  crcInput.set(data, typeBuf.length);
  const crcBuf = new Uint8Array(4);
  new DataView(crcBuf.buffer).setUint32(0, crc32(crcInput), false);
  return concat([len, typeBuf, data, crcBuf]);
}

/**
 * 複数の Uint8Array を結合する。
 *
 * @param {Uint8Array[]} arrays
 * @returns {Uint8Array}
 */
function concat(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * 32bit 整数をビッグエンディアン 4バイトに変換する。
 *
 * @param {number} n
 * @returns {Uint8Array}
 */
function u32be(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}

/**
 * deflate-stored（非圧縮）形式で zlib ストリームを生成する。
 * 外部ライブラリ不要で有効な zlib データを作る最小実装。
 *
 * @param {Uint8Array} raw - 圧縮前のバイト列
 * @returns {Uint8Array}
 */
function zlibStored(raw) {
  // zlib ヘッダ: CMF=0x78, FLG=0x01（無圧縮, チェックサムを 31 の倍数に調整）
  const header = new Uint8Array([0x78, 0x01]);

  // deflate-stored ブロックは 65535B 以下の場合 1 ブロックに収まる
  const bfinal = 1; // 最終ブロック
  const btype = 0; // 無圧縮
  const len = raw.length;
  const nlen = ~len & 0xffff;

  const block = new Uint8Array(5 + len);
  block[0] = (bfinal & 1) | ((btype & 3) << 1);
  block[1] = len & 0xff;
  block[2] = (len >> 8) & 0xff;
  block[3] = nlen & 0xff;
  block[4] = (nlen >> 8) & 0xff;
  block.set(raw, 5);

  // Adler-32 チェックサム
  let s1 = 1;
  let s2 = 0;
  for (const b of raw) {
    s1 = (s1 + b) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = new Uint8Array(4);
  new DataView(adler.buffer).setUint32(0, (s2 << 16) | s1, false);

  return concat([header, block, adler]);
}

/**
 * 指定サイズの単色 PNG バイト列を生成する。
 * 中央に「¥」を白色テキストで描画する（フォント埋め込みは不要なため省略）。
 *
 * @param {number} size - 画像の幅・高さ（ピクセル）
 * @param {{ r: number, g: number, b: number }} bg - 背景色
 * @returns {Uint8Array}
 */
function makePng(size, bg) {
  // PNG シグネチャ
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 幅・高さ・ビット深度8・カラータイプ2（RGB）
  const ihdr = chunk("IHDR", concat([u32be(size), u32be(size), new Uint8Array([8, 2, 0, 0, 0])]));

  // 画像データ: 各行の先頭にフィルタバイト 0 を付ける
  const rowSize = size * 3;
  const raw = new Uint8Array(size * (1 + rowSize));
  for (let y = 0; y < size; y++) {
    const base = y * (1 + rowSize);
    raw[base] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3] = bg.r;
      raw[base + 1 + x * 3 + 1] = bg.g;
      raw[base + 1 + x * 3 + 2] = bg.b;
    }
  }

  const idat = chunk("IDAT", zlibStored(raw));
  const iend = chunk("IEND", new Uint8Array(0));

  return concat([sig, ihdr, idat, iend]);
}

for (const size of [16, 48, 128]) {
  const png = makePng(size, BG);
  const outPath = resolve(ICONS_DIR, `icon${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated: ${outPath} (${png.length} bytes)`);
}
