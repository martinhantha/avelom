import assert from "node:assert/strict";
import {
  assignedTeachersFromAppointment,
  shouldReceiveAppointmentLive,
} from "../apps/web/utils/appointment-live-audience";

const staffUserId = "staff-user";
const adminUserId = "admin-user";

const createdForStaff = {
  type: "appointment.created" as const,
  actorUserId: adminUserId,
  createdByUserId: adminUserId,
  teacherUserId: staffUserId,
  teacherUserIds: [staffUserId],
};

const deletedForStaff = {
  ...createdForStaff,
  type: "appointment.deleted" as const,
};

assert.equal(shouldReceiveAppointmentLive(staffUserId, createdForStaff), true);
assert.equal(shouldReceiveAppointmentLive(staffUserId, deletedForStaff), true);
assert.equal(shouldReceiveAppointmentLive("other-user", createdForStaff), false);
assert.equal(shouldReceiveAppointmentLive(adminUserId, createdForStaff), true);

assert.deepEqual(
  assignedTeachersFromAppointment({
    teacher: { id: "t1", displayName: "Julian" },
    teachers: [{ id: "t1", displayName: "Julian" }],
  }).map((item) => item.id),
  ["t1"],
);

assert.deepEqual(
  assignedTeachersFromAppointment({
    teacherId: "t1",
    teachers: [{ teacherId: "t1", teacher: { id: "t1", displayName: "Julian" } }],
  }).map((item) => item.id),
  ["t1"],
);

assert.deepEqual(
  assignedTeachersFromAppointment({
    teacherId: "t1",
    teachers: [
      { teacherId: "t1", teacher: { id: "t1", displayName: "Julian" } },
      { teacherId: "t2", teacher: { id: "t2", displayName: "Ally" } },
    ],
  }).map((item) => item.id),
  ["t1", "t2"],
);

console.log("appointment-live-audience tests passed");
