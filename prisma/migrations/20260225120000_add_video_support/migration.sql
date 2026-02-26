-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "Generation" ADD COLUMN "videoUrl" TEXT;
