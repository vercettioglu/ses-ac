-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "senderType" "SenderType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "senderName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mutedUntil" TIMESTAMP(3);
