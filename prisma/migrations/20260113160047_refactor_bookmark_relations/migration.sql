/*
  Warnings:

  - You are about to drop the column `contentId` on the `bookmarks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,contentType,announcementId]` on the table `bookmarks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,contentType,articleId]` on the table `bookmarks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmark_announcement";

-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmark_article";

-- DropIndex
DROP INDEX "bookmarks_userId_contentType_contentId_key";

-- AlterTable
ALTER TABLE "bookmarks" DROP COLUMN "contentId",
ADD COLUMN     "announcementId" TEXT,
ADD COLUMN     "articleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_contentType_announcementId_key" ON "bookmarks"("userId", "contentType", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_contentType_articleId_key" ON "bookmarks"("userId", "contentType", "articleId");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmark_announcement_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmark_article_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
