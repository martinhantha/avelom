-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "reminderPushSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_reminderPushSentAt_startsAt_idx" ON "Appointment"("reminderPushSentAt", "startsAt");

-- CreateTable
CREATE TABLE "NextDayBriefingPush" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextDayBriefingPush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NextDayBriefingPush_userId_tenantId_dateKey_key" ON "NextDayBriefingPush"("userId", "tenantId", "dateKey");

-- CreateIndex
CREATE INDEX "NextDayBriefingPush_dateKey_idx" ON "NextDayBriefingPush"("dateKey");

-- AddForeignKey
ALTER TABLE "NextDayBriefingPush" ADD CONSTRAINT "NextDayBriefingPush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextDayBriefingPush" ADD CONSTRAINT "NextDayBriefingPush_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
