/*
  Warnings:

  - You are about to drop the column `search_vector` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `organizations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_announcements_search";

-- DropIndex
DROP INDEX "idx_articles_search";

-- DropIndex
DROP INDEX "idx_organizations_search";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "search_vector";
