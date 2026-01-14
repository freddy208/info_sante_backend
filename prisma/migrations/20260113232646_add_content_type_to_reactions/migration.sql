/*
  Warnings:

  - A unique constraint covering the columns `[userId,announcementId]` on the table `reactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,articleId]` on the table `reactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,commentId]` on the table `reactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,adviceId]` on the table `reactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contentType` to the `reactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "reactions_adviceId_idx";

-- DropIndex
DROP INDEX "reactions_announcementId_idx";

-- DropIndex
DROP INDEX "reactions_articleId_idx";

-- DropIndex
DROP INDEX "reactions_commentId_idx";

-- AlterTable
ALTER TABLE "reactions" ADD COLUMN     "contentType" "ContentType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_announcementId_key" ON "reactions"("userId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_articleId_key" ON "reactions"("userId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_commentId_key" ON "reactions"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_adviceId_key" ON "reactions"("userId", "adviceId");
