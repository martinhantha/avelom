-- AlterTable
ALTER TABLE "User" ADD COLUMN "nextDayBriefingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "createdByUserId" UUID;

-- CreateIndex
CREATE INDEX "Appointment_createdByUserId_idx" ON "Appointment"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
