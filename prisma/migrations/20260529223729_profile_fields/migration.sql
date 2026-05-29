-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "occupation" TEXT;
