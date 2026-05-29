-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_publicId_key" ON "Announcement"("publicId");
