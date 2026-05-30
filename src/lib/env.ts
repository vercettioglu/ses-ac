// Ortam değişkenlerine merkezi, gevşek erişim.
// Build sırasında hata fırlatmamak için değerler tembel okunur; gerçekten gerekli
// olan yerlerde (push gönderimi, auth) eksiklik runtime'da kontrol edilir.

export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? '';
  },
  get authSecret() {
    return process.env.NEXTAUTH_SECRET ?? '';
  },
  get vapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  },
  get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY ?? '';
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? 'mailto:admin@susma.org';
  },
  get appUrl() {
    return process.env.APP_URL ?? 'http://localhost:3000';
  },
  // E-posta (self-hosted Postfix → 127.0.0.1:25). Düşük hacim: hoş geldin + şifre sıfırlama.
  get mailHost() {
    return process.env.MAIL_HOST ?? '127.0.0.1';
  },
  get mailPort() {
    return Number(process.env.MAIL_PORT ?? '25');
  },
  get mailFrom() {
    return process.env.MAIL_FROM ?? 'Susma <noreply@susma.org>';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
};
