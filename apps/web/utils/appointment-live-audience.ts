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

export function pushRecipientUserIds(
  event: Pick<
    AppointmentLiveEvent,
    "type" | "actorUserId" | "createdByUserId" | "teacherUserId" | "teacherUserIds"
  >,
): string[] {
  const ids = new Set<string>();
  for (const id of event.teacherUserIds ?? []) ids.add(id);
  if (event.teacherUserId) ids.add(event.teacherUserId);
  if (event.type !== "appointment.created" && event.createdByUserId) {
    ids.add(event.createdByUserId);
  }
  ids.delete(event.actorUserId);
  return [...ids];
}

export function liveEventNotificationCopy(event: Pick<AppointmentLiveEvent, "type" | "title" | "startsAt" | "previousStartsAt">): {
  title: string;
  body: string;
} {
  const when = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.startsAt));

  if (event.type === "appointment.moved") {
    const previous = event.previousStartsAt
      ? new Intl.DateTimeFormat("de-DE", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(event.previousStartsAt))
      : "";
    return {
      title: "Termin verschoben",
      body: [event.title, previous ? `${previous} → ${when}` : when].filter(Boolean).join(" · "),
    };
  }
  if (event.type === "appointment.deleted") {
    return {
      title: "Termin gelöscht",
      body: [event.title, when].filter(Boolean).join(" · "),
    };
  }
  return {
    title: "Neuer Termin",
    body: [event.title, when].filter(Boolean).join(" · "),
  };
}
