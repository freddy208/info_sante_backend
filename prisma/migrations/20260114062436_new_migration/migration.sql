/*
  Warnings:

  - A unique constraint covering the columns `[userId,contentType,adviceId]` on the table `bookmarks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "advices" ADD COLUMN     "commentsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bookmarks" ADD COLUMN     "adviceId" TEXT;

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "adviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_contentType_adviceId_key" ON "bookmarks"("userId", "contentType", "adviceId");

-- CreateIndex
CREATE INDEX "comments_adviceId_idx" ON "comments"("adviceId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_adviceId_fkey" FOREIGN KEY ("adviceId") REFERENCES "advices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_adviceId_fkey" FOREIGN KEY ("adviceId") REFERENCES "advices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
