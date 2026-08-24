-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "defaultLessonTypeId" UUID;

-- CreateIndex
CREATE INDEX "Tenant_defaultLessonTypeId_idx" ON "Tenant"("defaultLessonTypeId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_defaultLessonTypeId_fkey" FOREIGN KEY ("defaultLessonTypeId") REFERENCES "LessonType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
