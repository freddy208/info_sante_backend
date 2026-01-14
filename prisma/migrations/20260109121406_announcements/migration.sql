-- CreateIndex
CREATE INDEX "announcements_status_publishedAt_idx" ON "announcements"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "announcements_categoryId_status_idx" ON "announcements"("categoryId", "status");

-- CreateIndex
CREATE INDEX "announcements_organizationId_status_idx" ON "announcements"("organizationId", "status");

-- CreateIndex
CREATE INDEX "announcements_isPinned_publishedAt_idx" ON "announcements"("isPinned", "publishedAt");
