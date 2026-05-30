#!/usr/bin/env bash
# Susma — VPS otomatik deploy scripti. Konum: /opt/susma/deploy.sh
# GitHub Actions, kısıtlı SSH anahtarıyla (forced-command) yalnızca bu scripti çalıştırır.
set -euo pipefail

APP_DIR="/opt/susma"
cd "$APP_DIR"

echo "[deploy] $(date -Is) başladı — $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# Son main'i çek
git fetch --quiet origin main
git reset --hard origin/main

# Bağımlılıklar (build için devDependencies de gerekli)
npm ci --include=dev --no-audit --no-fund

# Veritabanı şeması (yalnızca bekleyen migration'ları uygular, veriyi silmez)
npx prisma migrate deploy

# Üretim derlemesi
npm run build

# Sıfır-kesintiye yakın yeniden başlat
pm2 reload susma --update-env

echo "[deploy] tamamlandı — $(git rev-parse --short HEAD)"
