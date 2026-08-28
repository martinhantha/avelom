import type { AppointmentLiveEvent, AppointmentLiveEventType } from "~/types/live-events";
import { prisma } from "~/server/utils/prisma";
import {
  assignedTeachersFromAppointment,
  shouldReceiveAppointmentLive,
} from "~/utils/appointment-live-audience";

export { shouldReceiveAppointmentLive, assignedTeachersFromAppointment };

type Listener = (event: AppointmentLiveEvent) => void;

const globalForLive = globalThis as typeof globalThis & {
  avelomAppointmentListeners?: Map<string, Set<Listener>>;
};

const listeners =
  globalForLive.avelomAppointmentListeners ?? new Map<string, Set<Listener>>();
globalForLive.avelomAppointmentListeners = listeners;

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
    teacherId?: string | null;
    teacher?: { id: string; displayName: string } | null;
    teachers?: Array<{
      id?: string;
      teacherId?: string;
      displayName?: string;
      teacher?: { id: string; displayName: string } | null;
    }> | null;
    customer?: { displayName?: string | null } | null;
    lessonType?: { name?: string | null } | null;
  },
  extra?: { previousStartsAt?: string | null },
): Promise<AppointmentLiveEvent> {
  const assigned = assignedTeachersFromAppointment(appointment);
  const teacherIds = assigned.map((item) => item.id);
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
