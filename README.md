# Ses Aç

Mobil öncelikli, **uygulama indirmeden çalışan** (PWA) web push duyuru sistemi.
Yerel/topluluk ekiplerinin, kendilerini takip eden kullanıcılara **izinli** ve **bölge bazlı**
(il/ilçe) anlık bildirim göndermesini sağlar.

- Marka: **Ses Aç** · Domain varsayımı: `https://ses.ac`
- Ürün tarafsız bir “duyuru ve bildirim alma” sistemidir.

## Özellikler

- 📱 PWA (manifest + service worker), Android/Chrome/Edge/Firefox/Safari ve iOS 16.4+ desteği
- 🔔 Web Push (VAPID) — kullanıcı izni olmadan asla gönderim yok
- 📍 İl / ilçe / “Tüm Türkiye” bazlı hedefleme
- 👤 Üyeliksiz kullanım (seçimler `localStorage`’da) — istenirse ad/iletişim eklenir
- 🛡️ Rol tabanlı paneller: `SUPER_ADMIN`, `REGION_ADMIN`, `SENDER`
- 🧱 Sunucu tarafında **kesin** rol + bölge yetki kontrolü (yalnızca frontend’e güvenilmez)
- 🚦 Rate limit (gönderici başına dakikada N duyuru, admin ayarlanabilir)
- 🧹 404/410 dönen abonelikler otomatik pasifleştirilir; admin temizleyebilir
- 🧾 Her gönderim için `DeliveryLog` + yönetim işlemleri için `AuditLog`

## Teknoloji

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn tarzı UI · PostgreSQL · Prisma ·
JWT (jose) + bcryptjs · `web-push` · Zod.

---

## Kurulum

### 1) Gereksinimler
- Node.js 20+ (geliştirme makinesinde 24 ile test edildi)
- PostgreSQL 14+ (Docker ile veya yerel kurulum)

### 2) Bağımlılıklar
```bash
npm install
```

### 3) Ortam değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayın ve doldurun:
```bash
cp .env.example .env
```

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı. Docker için: `postgresql://sesac:sesac@localhost:5432/sesac?schema=public` |
| `NEXTAUTH_SECRET` | Oturum (JWT) imzalama anahtarı. `openssl rand -base64 32` ile üretin |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push anahtar çifti (`npm run vapid`) |
| `VAPID_SUBJECT` | `mailto:admin@ses.ac` |
| `APP_URL` | Üretimde `https://ses.ac`, lokalde `http://localhost:3000` |

### 4) VAPID anahtarı üretimi
```bash
npm run vapid
# Çıktıyı .env içine yapıştırın
```

### 5) Veritabanı (Docker ile)
```bash
docker compose up -d        # PostgreSQL'i ayağa kaldırır
npm run db:migrate          # şemayı uygular (prisma migrate dev)
npm run db:seed             # örnek veri + hesaplar
```

### 5b) Docker olmadan Postgres (örn. macOS / Homebrew)
Docker yoksa yerel bir Postgres kullanabilirsiniz:
```bash
brew install postgresql@16 && brew services start postgresql@16
createdb sesac
# .env içinde:
# DATABASE_URL=postgresql://<kullanıcı>@localhost:5432/sesac?schema=public
npm run db:migrate && npm run db:seed
```

### 6) Geliştirme sunucusu
```bash
npm run dev      # http://localhost:3000
```

### Seed ile gelen hesaplar
| Rol | E-posta | Şifre |
|---|---|---|
| SUPER_ADMIN | `superadmin@ses.ac` | `SesAc!2025` |
| REGION_ADMIN | `antalya.admin@ses.ac` | `SesAc!2025` |
| SENDER | `konyaalti.sender@ses.ac` | `SesAc!2025` |

> Şifreyi `SEED_PASSWORD` ortam değişkeniyle değiştirebilirsiniz. **Üretimde mutlaka değiştirin.**

---

## Sayfalar

**Public:** `/` (kayıt) · `/setup` (izin + iOS yönlendirme) · `/feed` (akış) · `/a/[id]` (detay) · `/settings`
**Admin:** `/admin/login` · `/admin` · `/admin/senders` · `/admin/announcements` · `/admin/subscribers`
**Gönderici:** `/panel/login` · `/panel` · `/panel/history`

## API uçları
`POST /api/register` · `POST /api/push/subscribe` · `POST /api/push/unsubscribe` ·
`GET /api/push/public-key` · `GET|POST /api/announcements` · `GET /api/announcements/:id` ·
`POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/session` ·
`GET|POST /api/admin/senders` · `PATCH /api/admin/senders/:id` · `GET /api/admin/stats` ·
`GET|PATCH /api/admin/settings` · `POST /api/admin/subscriptions/cleanup`

---

## HTTPS gerekliliği (ÖNEMLİ)

> **Web Push yalnızca güvenli bağlamda (HTTPS) çalışır.** Tek istisna `http://localhost`’tur
> (geliştirme için güvenli sayılır). Gerçek cihazlarda (özellikle iPhone) test ederken
> **HTTPS şarttır**; aksi halde service worker ve bildirim izni çalışmaz.

### HTTPS ile lokal test (gerçek telefon için)
Aşağıdakilerden biriyle lokal sunucunuzu HTTPS olarak yayınlayın:
```bash
# Seçenek A: cloudflared (kurulum gerektirmez, hızlı)
cloudflared tunnel --url http://localhost:3000

# Seçenek B: ngrok
ngrok http 3000
```
Verilen `https://...` adresini telefonun tarayıcısında açın. (Tünel adresini kullanırken
`APP_URL`’i o adrese ayarlamanız önerilir.)

---

## iPhone (iOS / iPadOS) test yöntemi

iOS’ta web push için **iOS/iPadOS 16.4+** ve uygulamanın **Ana Ekrana Eklenmiş (PWA)** olması gerekir.

1. Siteyi **Safari**’de açın (HTTPS adresi).
2. Alttaki **Paylaş** simgesine dokunun.
3. **“Ana Ekrana Ekle”** seçeneğini seçin.
4. Ana ekrandaki **Ses Aç** simgesinden uygulamayı açın.
5. **“Bildirimleri Aç”**a dokunun ve izni verin.

Uygulama içinde bu adımlar, iPhone’da PWA olarak açılmamışsa otomatik olarak alttan açılan
sade bir kart (sheet) ile anlatılır.

## Android test yöntemi
1. Siteyi **Chrome** (veya Edge) ile açın.
2. Bölgenizi seçip **“Bildirimleri Aç”**a dokunun, izni verin.
3. (İsteğe bağlı) Chrome menüsünden **“Ana ekrana ekle”** ile PWA olarak kurabilirsiniz.

Android’de doğrudan bildirim izni akışı desteklenir; ana ekrana ekleme zorunlu değildir.

## Masaüstü
Chrome / Edge / Firefox ve (macOS’ta) Safari’de bildirim izni akışı desteklenir.

---

## Production deploy önerileri

- **Veritabanı:** Yönetilen PostgreSQL (Supabase, Neon, RDS vb.). `npm run db:deploy` ile migration uygulayın.
- **Çalıştırma:** `npm run build && npm start`. Node 20+.
  - Vercel/Netlify: çalışır; ancak push gönderimi istek içinde senkron yapıldığı için büyük
    kitlelerde **arka plan kuyruğu** (queue/worker) önerilir (aşağıdaki sınırlamalar).
  - VPS (önerilen): Node süreç yöneticisi (pm2/systemd) + Nginx (TLS sonlandırma) + Postgres.
- **HTTPS:** Zorunlu. Let’s Encrypt / Cloudflare.
- **Gizli anahtarlar:** `NEXTAUTH_SECRET` ve VAPID anahtarlarını güvenli saklayın; üretimde
  seed şifrelerini değiştirin.
- **VAPID:** Üretim ve geliştirmede **aynı** anahtar çifti kullanılmalı; anahtar değişirse mevcut
  abonelikler geçersiz olur.
- **Service worker / manifest:** `Service-Worker-Allowed: /` başlığı `next.config.mjs` içinde ayarlı.

---

## Güvenlik notları
- Şifreler `bcrypt` (12 round) ile hashlenir.
- Oturum: `HttpOnly`, `SameSite=Lax`, üretimde `Secure` çerez içinde JWT.
- State değiştiren uçlarda Origin (CSRF) kontrolü.
- Tüm yetki kontrolleri (rol + bölge) **sunucu tarafında** uygulanır.
- Girdi doğrulaması Zod ile yapılır (başlık ≤ 80, mesaj ≤ 220 karakter).
- Rate limit ve audit log mevcuttur.

## Bilinen sınırlamalar / TODO
- **Push gönderimi istek içinde senkron** yapılır. Çok büyük abone kitlelerinde gecikme/timeout
  olabilir; üretim için bir kuyruk/worker (BullMQ, Cloud Tasks vb.) önerilir. (Kodda `dispatchAnnouncement`)
- **Rate limit bellek-içidir** (tek örnek için). Çok örnekli dağıtımda Redis tabanlı limiter gerekir.
- **İlçe verisi** büyük iller için gömülüdür; diğer illerde ilçe serbest metin olarak girilir.
  Tam 81 il ilçe verisi `src/lib/regions.ts` içine eklenebilir.
- Anonim kullanıcı kaydı `userId` (CUID) ile güncellenebilir; doğrulamasızdır (MVP).
- `REGION_ADMIN` istatistikleri MVP’de global görür (bölgeye daraltma TODO).
- Üyelik bilgileri (ad/eposta/telefon) **doğrulamasızdır** (spec gereği).

## Faydalı komutlar
```bash
npm run dev          # geliştirme
npm run build        # üretim derlemesi (prisma generate + next build)
npm start            # üretim sunucusu
npm run vapid        # VAPID anahtarı üret
npm run icons        # PWA ikonlarını yeniden üret
npm run db:migrate   # migration (dev)
npm run db:deploy    # migration (prod)
npm run db:seed      # örnek veri
npm run db:studio    # Prisma Studio
```
