-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "AdminUser_parentId_idx" ON "AdminUser"("parentId");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
