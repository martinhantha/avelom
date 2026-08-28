import type { AppointmentLiveEvent } from "../types/live-events";

export type LiveAppointmentTeacher = {
  id?: string | null;
  teacherId?: string | null;
  displayName?: string | null;
  teacher?: { id?: string | null; displayName?: string | null } | null;
};

export function assignedTeachersFromAppointment(appointment: {
  teacherId?: string | null;
  teacher?: { id?: string | null; displayName?: string | null } | null;
  teachers?: LiveAppointmentTeacher[] | null;
}): Array<{ id: string; displayName: string }> {
  const collected: Array<{ id: string; displayName: string }> = [];

  const push = (id?: string | null, displayName?: string | null) => {
    if (!id || collected.some((item) => item.id === id)) return;
    collected.push({ id, displayName: displayName?.trim() || "" });
  };

  for (const item of appointment.teachers ?? []) {
    if (!item) continue;
    push(item.teacher?.id ?? item.teacherId ?? item.id, item.teacher?.displayName ?? item.displayName);
  }
  push(appointment.teacher?.id, appointment.teacher?.displayName);
  push(appointment.teacherId);

  return collected;
}

export function shouldReceiveAppointmentLive(
  viewerUserId: string,
  event: Pick<
    AppointmentLiveEvent,
    "type" | "actorUserId" | "createdByUserId" | "teacherUserId" | "teacherUserIds"
  >,
): boolean {
  if (event.actorUserId === viewerUserId) return true;

  const teacherUserIds = event.teacherUserIds ?? [];
  const isAssignedTeacher = Boolean(
    teacherUserIds.includes(viewerUserId) ||
      (event.teacherUserId && event.teacherUserId === viewerUserId),
  );
  const isCreator = Boolean(event.createdByUserId && event.createdByUserId === viewerUserId);

  if (event.type === "appointment.created") {
    return isAssignedTeacher;
  }
  if (event.type === "appointment.moved" || event.type === "appointment.deleted") {
    return isAssignedTeacher || isCreator;
  }
  return false;
}
