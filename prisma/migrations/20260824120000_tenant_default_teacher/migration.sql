-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "defaultTeacherId" UUID;

-- CreateIndex
CREATE INDEX "Tenant_defaultTeacherId_idx" ON "Tenant"("defaultTeacherId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_defaultTeacherId_fkey" FOREIGN KEY ("defaultTeacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
