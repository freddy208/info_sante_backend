-- CreateIndex
CREATE INDEX "advices_status_publishedAt_idx" ON "advices"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "advices_priority_status_idx" ON "advices"("priority", "status");

-- CreateIndex
CREATE INDEX "advices_organizationId_status_idx" ON "advices"("organizationId", "status");

-- CreateIndex
CREATE INDEX "announcement_registrations_announcementId_status_idx" ON "announcement_registrations"("announcementId", "status");

-- CreateIndex
CREATE INDEX "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_organizationId_status_idx" ON "articles"("organizationId", "status");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "bookmarks_userId_contentType_idx" ON "bookmarks"("userId", "contentType");

-- CreateIndex
CREATE INDEX "bookmarks_userId_createdAt_idx" ON "bookmarks"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "sessions_isActive_expiresAt_idx" ON "sessions"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
