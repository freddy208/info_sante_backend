-- CreateIndex
CREATE INDEX "organizations_latitude_longitude_idx" ON "organizations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "organizations_status_type_idx" ON "organizations"("status", "type");
