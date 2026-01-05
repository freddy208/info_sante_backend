/*
  Warnings:

  - A unique constraint covering the columns `[announcementId,deviceId]` on the table `announcement_registrations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "announcement_registrations_announcementId_visitorPhone_key";

-- AlterTable
ALTER TABLE "announcement_registrations" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "announcement_registrations_announcementId_deviceId_key" ON "announcement_registrations"("announcementId", "deviceId");
