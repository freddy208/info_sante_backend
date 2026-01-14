/*
  Warnings:

  - The values [USER,ORGANIZATION,ADVICE,MEDIA,CATEGORY,REGISTRATION] on the enum `ResourceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ResourceType_new" AS ENUM ('ANNOUNCEMENT', 'ARTICLE', 'COMMENT');
ALTER TABLE "audit_logs" ALTER COLUMN "resourceType" TYPE "ResourceType_new" USING ("resourceType"::text::"ResourceType_new");
ALTER TABLE "statistics" ALTER COLUMN "resourceType" TYPE "ResourceType_new" USING ("resourceType"::text::"ResourceType_new");
ALTER TYPE "ResourceType" RENAME TO "ResourceType_old";
ALTER TYPE "ResourceType_new" RENAME TO "ResourceType";
DROP TYPE "public"."ResourceType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT "fk_bookmark_announcement";

-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT "fk_bookmark_article";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "fk_media_announcement";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "fk_media_article";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "fk_reaction_advice";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "fk_reaction_announcement";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "fk_reaction_article";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "fk_reaction_comment";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "fk_Session_administrator";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "fk_Session_organization";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "statistics" DROP CONSTRAINT "fk_statistic_announcement";

-- DropForeignKey
ALTER TABLE "statistics" DROP CONSTRAINT "fk_statistic_article";

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hashedRefreshToken" TEXT;

-- CreateIndex
CREATE INDEX "idx_announcements_search_vector" ON "announcements" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "idx_articles_search_vector" ON "articles" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "idx_org_search_vector" ON "organizations" USING GIN ("search_vector");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_announcement" FOREIGN KEY ("contentId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_article" FOREIGN KEY ("contentId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_comment" FOREIGN KEY ("contentId") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reaction_advice" FOREIGN KEY ("contentId") REFERENCES "advices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_announcement" FOREIGN KEY ("contentId") REFERENCES "announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_article" FOREIGN KEY ("contentId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmark_announcement" FOREIGN KEY ("contentId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmark_article" FOREIGN KEY ("contentId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "session_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "session_org" FOREIGN KEY ("userId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "session_admin" FOREIGN KEY ("userId") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "stat_announcement" FOREIGN KEY ("resourceId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "stat_article" FOREIGN KEY ("resourceId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
