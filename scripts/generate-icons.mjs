// Bağımsız PNG ikon üretici (ek bağımlılık yok, sadece Node zlib).
// "Susma" markası için kırmızı zemin + beyaz yayın dalgası deseni.
// Kullanım: npm run icons
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'icons');

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = 0 (compression/filter/interlace)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Renkler
const RED = [216, 57, 43, 255]; // #d8392b
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

function makeIcon(size, opts = {}) {
  const { rounded = true, fillBg = true, bg = RED, fg = WHITE } = opts;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerR = size * 0.22;

  const set = (x, y, c) => {
    const i = (y * size + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = c[3];
  };

  // Yuvarlatılmış köşe maskesi içinde mi?
  const insideRounded = (x, y) => {
    if (!rounded) return true;
    const dx = Math.max(cornerR - x, x - (size - 1 - cornerR), 0);
    const dy = Math.max(cornerR - y, y - (size - 1 - cornerR), 0);
    return dx * dx + dy * dy <= cornerR * cornerR;
  };

  // Desen: merkez disk + iki eşmerkezli halka (yayın dalgası)
  const rDisc = size * 0.12;
  const ring1 = [size * 0.22, size * 0.275];
  const ring2 = [size * 0.345, size * 0.4];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      let color = TRANSPARENT;
      if (fillBg && insideRounded(x, y)) color = bg;

      const isFg =
        dist <= rDisc ||
        (dist >= ring1[0] && dist <= ring1[1]) ||
        (dist >= ring2[0] && dist <= ring2[1]);

      if (isFg) {
        // Badge gibi şeffaf zeminli ikonlarda fg her yerde görünür;
        // kırmızı zeminli ikonlarda da fg beyaz.
        if (!fillBg || insideRounded(x, y)) color = fg;
      }
      set(x, y, color);
    }
  }
  return encodePng(size, size, buf);
}

function write(name, buf) {
  fs.writeFileSync(path.join(OUT_DIR, name), buf);
  console.log(`  ✓ ${name} (${buf.length} bayt)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('İkonlar üretiliyor → public/icons');
// PWA ikonları (yuvarlatılmış kırmızı kare + beyaz desen)
write('icon-192.png', makeIcon(192, { rounded: true }));
write('icon-512.png', makeIcon(512, { rounded: true }));
// Maskable: tüm alanı doldur (köşe yok)
write('icon-512-maskable.png', makeIcon(512, { rounded: false }));
// Apple touch icon: iOS köşeleri kendi maskeler → tam kare
write('apple-touch-icon.png', makeIcon(180, { rounded: false }));
// Badge: monokrom (şeffaf zemin + beyaz desen)
write('badge-72.png', makeIcon(72, { rounded: false, fillBg: false, fg: WHITE }));
console.log('Tamamlandı.');
