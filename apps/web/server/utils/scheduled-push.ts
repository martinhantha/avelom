import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "~/server/utils/prisma";
import { sendPushToUsers, isFirebasePushConfigured } from "~/server/utils/push";
import { appointmentEventTitle } from "~/server/utils/appointment-events";
import { assignedTeachersFromAppointment } from "~/utils/appointment-live-audience";
import { resolveAppointmentDisplayName } from "~/utils/appointment-contact";
import {
  addCalendarDays,
  dateKey,
  isBriefingDue,
  REMINDER_LEAD_MS,
  tzParts,
  zonedLocalDate,
} from "~/utils/rome-time";

const reminderAppointmentSelect = {
  id: true,
  tenantId: true,
  startsAt: true,
  teacherId: true,
  appointmentContactText: true,
  customer: { select: { displayName: true } },
  lessonType: { select: { name: true } },
  teacher: { select: { id: true, displayName: true } },
  teachers: {
    select: {
      teacherId: true,
      teacher: { select: { id: true, displayName: true } },
    },
  },
} as const;

function formatWhen(startsAt: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}

function formatClock(startsAt: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}

async function teacherUserIds(appointment: {
  teacherId?: string | null;
  teacher?: { id?: string | null } | null;
  teachers?: Array<{
    teacherId?: string | null;
    teacher?: { id?: string | null } | null;
  }> | null;
}): Promise<string[]> {
  const assigned = assignedTeachersFromAppointment(appointment);
  const ids = assigned.map((item) => item.id);
  if (!ids.length) return [];
  const profiles = await prisma.teacherProfile.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      membership: { deletedAt: null },
    },
    select: {
      membership: {
        select: {
          userId: true,
          user: { select: { deletedAt: true, disabledAt: true } },
        },
      },
    },
  });
  return [
    ...new Set(
      profiles
        .map((profile) => profile.membership)
        .filter((membership) => membership?.user && !membership.user.deletedAt && !membership.user.disabledAt)
        .map((membership) => membership!.userId),
    ),
  ];
}

async function sendDueReminders(now: Date): Promise<void> {
  const due = await prisma.appointment.findMany({
    where: {
      deletedAt: null,
      reminderPushSentAt: null,
      status: { in: [AppointmentStatus.draft, AppointmentStatus.confirmed] },
      startsAt: {
        gt: now,
        lte: new Date(now.getTime() + REMINDER_LEAD_MS),
      },
    },
    select: reminderAppointmentSelect,
    take: 50,
  });

  for (const appointment of due) {
    const claimed = await prisma.appointment.updateMany({
      where: { id: appointment.id, reminderPushSentAt: null, deletedAt: null },
      data: { reminderPushSentAt: now },
    });
    if (!claimed.count) continue;

    try {
      const userIds = await teacherUserIds(appointment);
      if (!userIds.length) continue;
      const title = resolveAppointmentDisplayName(appointment);
      const minutes = Math.max(
        1,
        Math.round((appointment.startsAt.getTime() - now.getTime()) / 60_000),
      );
      await sendPushToUsers({
        userIds,
        title: "Terminerinnerung",
        body: `${title} · in ${minutes} Min · ${formatWhen(appointment.startsAt)}`,
        data: {
          type: "appointment.reminder",
          appointmentId: appointment.id,
          tenantId: appointment.tenantId,
        },
      });
    } catch (error) {
      await prisma.appointment.updateMany({
        where: { id: appointment.id },
        data: { reminderPushSentAt: null },
      });
      console.warn("[push] reminder failed", appointment.id, error);
    }
  }
}

async function sendDueBriefings(now: Date): Promise<void> {
  if (!isBriefingDue(now)) return;

  const today = tzParts(now);
  const todayKey = dateKey(today);
  const tomorrow = addCalendarDays(today, 1);
  const from = zonedLocalDate(tomorrow, 0, 0);
  const to = zonedLocalDate(addCalendarDays(tomorrow, 1), 0, 0);

  const [teachers, appointments] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: {
        deletedAt: null,
        membership: {
          deletedAt: null,
          user: {
            deletedAt: null,
            disabledAt: null,
            nextDayBriefingEnabled: true,
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        membership: { select: { userId: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        status: { in: [AppointmentStatus.draft, AppointmentStatus.confirmed] },
        startsAt: { gte: from, lt: to },
      },
      select: {
        id: true,
        tenantId: true,
        startsAt: true,
        teacherId: true,
        appointmentContactText: true,
        customer: { select: { displayName: true } },
        lessonType: { select: { name: true } },
        teacher: { select: { id: true } },
        teachers: { select: { teacherId: true, teacher: { select: { id: true } } } },
      },
    }),
  ]);

  const itemsByTeacher = new Map<string, Array<{ startsAt: Date; title: string }>>();
  for (const appointment of appointments) {
    const title = appointmentEventTitle(appointment);
    for (const assigned of assignedTeachersFromAppointment(appointment)) {
      const key = `${appointment.tenantId}:${assigned.id}`;
      const list = itemsByTeacher.get(key) ?? [];
      list.push({ startsAt: appointment.startsAt, title });
      itemsByTeacher.set(key, list);
    }
  }

  for (const teacher of teachers) {
    const userId = teacher.membership?.userId;
    if (!userId) continue;
    try {
      await prisma.nextDayBriefingPush.create({
        data: { userId, tenantId: teacher.tenantId, dateKey: todayKey },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }

    const items = itemsByTeacher.get(`${teacher.tenantId}:${teacher.id}`) ?? [];
    if (!items.length) continue;
    items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const times = items.map((item) => `${formatClock(item.startsAt)} ${item.title}`).join(", ");
    try {
      await sendPushToUsers({
        userIds: [userId],
        title: "Termine morgen",
        body: `${items.length} ${items.length === 1 ? "Termin" : "Termine"} · ${times}`,
        data: {
          type: "appointment.briefing",
          tenantId: teacher.tenantId,
          dateKey: todayKey,
        },
      });
    } catch (error) {
      await prisma.nextDayBriefingPush.deleteMany({
        where: { userId, tenantId: teacher.tenantId, dateKey: todayKey },
      });
      console.warn("[push] briefing failed", userId, teacher.tenantId, error);
    }
  }
}

export async function runScheduledPushTick(now = new Date()): Promise<void> {
  if (!isFirebasePushConfigured()) return;
  await sendDueReminders(now);
  await sendDueBriefings(now);
}
