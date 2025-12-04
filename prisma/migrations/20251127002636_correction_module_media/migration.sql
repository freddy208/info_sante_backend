/*
  Warnings:

  - Added the required column `uploaderType` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_uploadedBy_fkey";

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "uploaderType" "UserType" NOT NULL;

-- CreateIndex
CREATE INDEX "media_uploadedBy_uploaderType_idx" ON "media"("uploadedBy", "uploaderType");
