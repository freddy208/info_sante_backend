/*
  Warnings:

  - A unique constraint covering the columns `[userId,contentType,organizationId]` on the table `bookmarks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,organizationId]` on the table `reactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bookmarks" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "organizationMemberId" TEXT;

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "organizationMemberId" TEXT;

-- AlterTable
ALTER TABLE "reactions" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "organizationMemberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_contentType_organizationId_key" ON "bookmarks"("userId", "contentType", "organizationId");

-- CreateIndex
CREATE INDEX "comments_organizationId_idx" ON "comments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_organizationId_key" ON "reactions"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
