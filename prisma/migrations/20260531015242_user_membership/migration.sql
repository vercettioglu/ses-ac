-- AlterTable: üyelik (opsiyonel e-posta + şifre) alanları
ALTER TABLE "User" ADD COLUMN "email" TEXT,
ADD COLUMN "passwordHash" TEXT;

-- CreateIndex: e-posta benzersiz (NULL'lar serbest — anonim kullanıcılar etkilenmez)
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
