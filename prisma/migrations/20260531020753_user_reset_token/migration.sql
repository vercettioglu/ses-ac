-- AlterTable: şifre sıfırlama token alanları (yalnızca özet saklanır)
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);
