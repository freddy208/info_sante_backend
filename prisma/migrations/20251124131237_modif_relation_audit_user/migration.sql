-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "fk_AuditLog_administrator";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "fk_AuditLog_organization";
