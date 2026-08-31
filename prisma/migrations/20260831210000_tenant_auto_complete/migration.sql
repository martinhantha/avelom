-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "autoCompleteAppointments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "autoCompleteAfterMinutes" INTEGER NOT NULL DEFAULT 0;
