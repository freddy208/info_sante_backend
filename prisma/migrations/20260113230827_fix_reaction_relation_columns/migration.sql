/*
  Warnings:

  - You are about to drop the column `contentId` on the `reactions` table. All the data in the column will be lost.
  - You are about to drop the column `contentType` on the `reactions` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `reactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_advice";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_announcement";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_article";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_comment";

-- DropIndex
DROP INDEX "reactions_contentType_contentId_idx";

-- DropIndex
DROP INDEX "reactions_userId_contentType_contentId_key";

-- AlterTable
ALTER TABLE "reactions" DROP COLUMN "contentId",
DROP COLUMN "contentType",
ADD COLUMN     "adviceId" TEXT,
ADD COLUMN     "announcementId" TEXT,
ADD COLUMN     "articleId" TEXT,
ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "reactions_announcementId_idx" ON "reactions"("announcementId");

-- CreateIndex
CREATE INDEX "reactions_articleId_idx" ON "reactions"("articleId");

-- CreateIndex
CREATE INDEX "reactions_commentId_idx" ON "reactions"("commentId");

-- CreateIndex
CREATE INDEX "reactions_adviceId_idx" ON "reactions"("adviceId");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_adviceId_fkey" FOREIGN KEY ("adviceId") REFERENCES "advices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
