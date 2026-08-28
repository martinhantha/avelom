-- CreateTable
CREATE TABLE "AppointmentTeacher" (
    "appointmentId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTeacher_pkey" PRIMARY KEY ("appointmentId","teacherId")
);

-- CreateIndex
CREATE INDEX "AppointmentTeacher_teacherId_idx" ON "AppointmentTeacher"("teacherId");

-- AddForeignKey
ALTER TABLE "AppointmentTeacher" ADD CONSTRAINT "AppointmentTeacher_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentTeacher" ADD CONSTRAINT "AppointmentTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing primary teachers
INSERT INTO "AppointmentTeacher" ("appointmentId", "teacherId")
SELECT "id", "teacherId" FROM "Appointment" WHERE "teacherId" IS NOT NULL
ON CONFLICT DO NOTHING;
