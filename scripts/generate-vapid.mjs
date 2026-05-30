// VAPID anahtar çifti üretir.
// Kullanım: npm run vapid
// Çıktıyı .env dosyanıza ekleyin (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\nVAPID anahtarları üretildi. .env dosyanıza ekleyin:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\nVAPID_SUBJECT=mailto:admin@susma.org\n');
