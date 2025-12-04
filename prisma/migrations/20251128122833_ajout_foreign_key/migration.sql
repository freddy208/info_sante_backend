-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "administratorId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "sessions_userType_organizationId_idx" ON "sessions"("userType", "organizationId");

-- CreateIndex
CREATE INDEX "sessions_userType_administratorId_idx" ON "sessions"("userType", "administratorId");
