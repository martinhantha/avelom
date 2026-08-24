-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "teacherLabel" TEXT NOT NULL DEFAULT 'Lehrer';
ALTER TABLE "Tenant" ADD COLUMN "resourcesEnabled" BOOLEAN NOT NULL DEFAULT true;
