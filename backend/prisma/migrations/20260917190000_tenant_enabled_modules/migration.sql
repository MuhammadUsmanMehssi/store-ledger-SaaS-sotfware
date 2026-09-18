-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "enabled_modules" JSONB NOT NULL DEFAULT '{}';
