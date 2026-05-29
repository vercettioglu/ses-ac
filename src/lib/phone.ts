// Türk cep telefonu doğrulama + normalize (saf fonksiyon, istemci+sunucu).
// Kabul edilen girişler: "05XX XXX XX XX", "5XXXXXXXXX", "+90 5XX...", "0090 5XX..."
// Saklanan kanonik form: "05XXXXXXXXX" (11 hane).

export function normalizeTrMobile(input: string): string | null {
  if (!input) return null;
  let n = input.replace(/\D/g, ''); // sadece rakamlar
  n = n.replace(/^00/, ''); // uluslararası 00 ön eki
  if (n.startsWith('90')) n = n.slice(2); // ülke kodu
  n = n.replace(/^0+/, ''); // baştaki sıfır(lar)
  // TR cep numarası: 10 hane ve 5 ile başlar (5XXXXXXXXX)
  if (!/^5\d{9}$/.test(n)) return null;
  return '0' + n;
}

export function isValidTrMobile(input: string): boolean {
  return normalizeTrMobile(input) !== null;
}

// Görüntüleme: "0539 624 92 95"
export function formatTrMobile(value: string): string {
  const n = normalizeTrMobile(value);
  if (!n) return value;
  // n = 0XXXXXXXXXX
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 9)} ${n.slice(9, 11)}`;
}
