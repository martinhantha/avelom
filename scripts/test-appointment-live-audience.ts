import assert from "node:assert/strict";
import {
  assignedTeachersFromAppointment,
  pushRecipientUserIds,
  shouldReceiveAppointmentLive,
} from "../apps/web/utils/appointment-live-audience";
import { formatTeachersForViewer } from "../apps/web/utils/appointment-contact";

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
assert.deepEqual(pushRecipientUserIds(createdForStaff), [staffUserId]);
assert.deepEqual(pushRecipientUserIds(deletedForStaff), [staffUserId]);

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

assert.equal(
  formatTeachersForViewer(
    {
      teachers: [
        { id: "t1", displayName: "Julian" },
        { id: "t2", displayName: "Ally" },
      ],
    },
    { teacherProfileId: "t1", canManageTenant: false },
  ),
  "Ally",
);

console.log("appointment-live-audience tests passed");
