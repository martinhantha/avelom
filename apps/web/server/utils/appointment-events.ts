import type { AppointmentLiveEvent, AppointmentLiveEventType } from "~/types/live-events";
import { prisma } from "~/server/utils/prisma";

type Listener = (event: AppointmentLiveEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function appointmentEventTitle(appointment: {
  customer?: { displayName?: string | null } | null;
  appointmentContactText?: string | null;
  lessonType?: { name?: string | null } | null;
}): string {
  return (
    appointment.customer?.displayName ||
    appointment.appointmentContactText ||
    appointment.lessonType?.name ||
    "Termin"
  );
}

export async function toAppointmentLiveEvent(
  type: AppointmentLiveEventType,
  tenantId: string,
  actorUserId: string,
  appointment: {
    id: string;
    startsAt: string;
    createdByUserId?: string | null;
    appointmentContactText?: string | null;
    teacher?: { id: string; displayName: string } | null;
    teachers?: Array<{ id: string; displayName: string }> | null;
    customer?: { displayName?: string | null } | null;
    lessonType?: { name?: string | null } | null;
  },
  extra?: { previousStartsAt?: string | null },
): Promise<AppointmentLiveEvent> {
  const assigned = appointment.teachers?.length
    ? appointment.teachers
    : appointment.teacher
      ? [appointment.teacher]
      : [];
  const teacherIds = [...new Set(assigned.map((item) => item.id))];
  const profiles = teacherIds.length
    ? await prisma.teacherProfile.findMany({
        where: { id: { in: teacherIds }, deletedAt: null },
        select: { id: true, membership: { select: { userId: true } } },
      })
    : [];
  const teacherUserIds = [
    ...new Set(
      profiles
        .map((profile) => profile.membership?.userId)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  ];

  return {
    type,
    tenantId,
    appointmentId: appointment.id,
    actorUserId,
    createdByUserId: appointment.createdByUserId ?? null,
    teacherUserId: teacherUserIds[0] ?? null,
    teacherUserIds,
    title: appointmentEventTitle(appointment),
    startsAt: appointment.startsAt,
    previousStartsAt: extra?.previousStartsAt ?? null,
    teacherName: assigned.map((item) => item.displayName).filter(Boolean).join(", ") || null,
    teacherId: assigned[0]?.id ?? null,
  };
}

export function publishAppointmentLive(event: AppointmentLiveEvent) {
  const tenantListeners = listeners.get(event.tenantId);
  if (!tenantListeners?.size) return;
  for (const listener of tenantListeners) {
    try {
      listener(event);
    } catch {
      // A broken subscriber must not block the others.
    }
  }
}

export function publishAppointmentCreated(event: AppointmentLiveEvent) {
  publishAppointmentLive(event);
}

export function shouldReceiveAppointmentLive(
  viewerUserId: string,
  event: AppointmentLiveEvent,
): boolean {
  if (event.actorUserId === viewerUserId) return true;

  const isAssignedTeacher = Boolean(
    event.teacherUserIds?.includes(viewerUserId) ||
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

export function subscribeAppointmentEvents(tenantId: string, listener: Listener): () => void {
  let tenantListeners = listeners.get(tenantId);
  if (!tenantListeners) {
    tenantListeners = new Set();
    listeners.set(tenantId, tenantListeners);
  }
  tenantListeners.add(listener);
  return () => {
    tenantListeners.delete(listener);
    if (!tenantListeners.size) {
      listeners.delete(tenantId);
    }
  };
}
