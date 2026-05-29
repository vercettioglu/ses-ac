// X (Twitter) tarzı, zaman sıralı, 64-bit'e sığan sayısal kimlik üretici.
// Ondalık basamaklar (string) olarak döner → URL'de sayısal görünür, BigInt serileştirme derdi yok.
// Yapı: [41 bit zaman damgası][12 bit sıra][10 bit rastgele]

const EPOCH = 1288834974657n; // klasik snowflake epoch (2010-11-04)

let lastTs = 0n;
let seq = 0n;

export function nextId(): string {
  let ts = BigInt(Date.now());

  if (ts === lastTs) {
    seq = (seq + 1n) & 0xfffn; // 12 bit sıra
    if (seq === 0n) ts = ts + 1n; // aynı ms içinde taşma → zamanı ilerlet
  } else {
    // her yeni ms için sırayı rastgele bir noktadan başlat (çakışmayı azaltır)
    seq = BigInt(Math.floor(Math.random() * 0x1000));
  }
  lastTs = ts;

  const rand = BigInt(Math.floor(Math.random() * 0x400)); // 10 bit ek entropi
  const id = ((ts - EPOCH) << 22n) | (seq << 10n) | rand;
  return id.toString();
}

export function isNumericId(value: string): boolean {
  return /^\d{1,20}$/.test(value);
}
