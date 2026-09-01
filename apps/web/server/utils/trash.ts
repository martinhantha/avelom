import { prisma } from "~/server/utils/prisma";
import { throwNotFound, throwValidation } from "~/server/utils/api-errors";
import { restoreTenantMember } from "~/server/utils/members";
import {
  restoreAppointment,
  restoreCustomer,
  restoreLessonType,
} from "~/server/utils/scheduling";

export const TRASH_KINDS = ["appointment", "customer", "lessonType", "member"] as const;
export type TrashKind = (typeof TRASH_KINDS)[number];

export type TrashItem = {
  kind: TrashKind;
  id: string;
  title: string;
  subtitle: string | null;
  deletedAt: string;
  deletedByName: string | null;
};

const TRASH_PAGE_MAX = 100;
const TRASH_FETCH_CAP = 200;

function parsePage(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function formatAppointmentWhen(startsAt: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}

function actorLabel(user: { name: string | null; email: string } | undefined) {
  if (!user) return null;
  return user.name?.trim() || user.email || null;
}

function matchesQuery(item: TrashItem, q: string) {
  if (!q) return true;
  const haystack = `${item.title} ${item.subtitle ?? ""} ${item.deletedByName ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

async function actorNamesById(userIds: Array<string | null | undefined>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  return new Map(users.map((user) => [user.id, actorLabel(user) ?? user.email]));
}

export function parseTrashKind(value: string | undefined): TrashKind | "all" {
  if (!value || value === "all") return "all";
  if ((TRASH_KINDS as readonly string[]).includes(value)) {
    return value as TrashKind;
  }
  throwValidation("Ungültiger Papierkorb-Typ", { field: "kind" });
}

async function loadDeletedAppointments(tenantId: string): Promise<TrashItem[]> {
  const rows = await prisma.appointment.findMany({
    where: { tenantId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: TRASH_FETCH_CAP,
    select: {
      id: true,
      deletedAt: true,
      deletedByUserId: true,
      startsAt: true,
      appointmentContactText: true,
      customer: { select: { displayName: true } },
      lessonType: { select: { name: true } },
      teacher: { select: { displayName: true } },
    },
  });
  const names = await actorNamesById(rows.map((row) => row.deletedByUserId));
  return rows.map((row) => {
    const title =
      row.customer?.displayName ||
      row.appointmentContactText ||
      row.lessonType?.name ||
      "Termin";
    const when = formatAppointmentWhen(row.startsAt);
    const teacher = row.teacher?.displayName;
    return {
      kind: "appointment" as const,
      id: row.id,
      title,
      subtitle: teacher ? `${when} · ${teacher}` : when,
      deletedAt: row.deletedAt!.toISOString(),
      deletedByName: row.deletedByUserId ? (names.get(row.deletedByUserId) ?? null) : null,
    };
  });
}

async function loadDeletedCustomers(tenantId: string): Promise<TrashItem[]> {
  const rows = await prisma.customer.findMany({
    where: { tenantId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: TRASH_FETCH_CAP,
    select: {
      id: true,
      displayName: true,
      deletedAt: true,
      deletedByUserId: true,
      phones: {
        select: { e164: true, raw: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });
  const names = await actorNamesById(rows.map((row) => row.deletedByUserId));
  return rows.map((row) => {
    const phone = row.phones[0];
    return {
      kind: "customer" as const,
      id: row.id,
      title: row.displayName,
      subtitle: phone?.e164 || phone?.raw || null,
      deletedAt: row.deletedAt!.toISOString(),
      deletedByName: row.deletedByUserId ? (names.get(row.deletedByUserId) ?? null) : null,
    };
  });
}

async function loadDeletedLessonTypes(tenantId: string): Promise<TrashItem[]> {
  const rows = await prisma.lessonType.findMany({
    where: { tenantId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: TRASH_FETCH_CAP,
    select: {
      id: true,
      name: true,
      defaultDurationMin: true,
      deletedAt: true,
      deletedByUserId: true,
    },
  });
  const names = await actorNamesById(rows.map((row) => row.deletedByUserId));
  return rows.map((row) => ({
    kind: "lessonType" as const,
    id: row.id,
    title: row.name,
    subtitle: row.defaultDurationMin ? `${row.defaultDurationMin} min` : null,
    deletedAt: row.deletedAt!.toISOString(),
    deletedByName: row.deletedByUserId ? (names.get(row.deletedByUserId) ?? null) : null,
  }));
}

async function loadDeletedMembers(tenantId: string): Promise<TrashItem[]> {
  const rows = await prisma.membership.findMany({
    where: { tenantId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: TRASH_FETCH_CAP,
    select: {
      id: true,
      role: true,
      deletedAt: true,
      deletedByUserId: true,
      user: { select: { name: true, email: true } },
    },
  });
  const names = await actorNamesById(rows.map((row) => row.deletedByUserId));
  return rows.map((row) => ({
    kind: "member" as const,
    id: row.id,
    title: row.user.name?.trim() || row.user.email,
    subtitle: `${row.user.email} · ${row.role}`,
    deletedAt: row.deletedAt!.toISOString(),
    deletedByName: row.deletedByUserId ? (names.get(row.deletedByUserId) ?? null) : null,
  }));
}

export async function listTenantTrash(
  tenantId: string,
  query: { kind?: string; q?: string; page?: string; pageSize?: string },
) {
  const kind = parseTrashKind(query.kind);
  const q = query.q?.trim().toLowerCase() ?? "";
  const page = parsePage(query.page, 1, 1000);
  const pageSize = parsePage(query.pageSize, 25, TRASH_PAGE_MAX);

  const [appointments, customers, lessonTypes, members] = await Promise.all([
    loadDeletedAppointments(tenantId),
    loadDeletedCustomers(tenantId),
    loadDeletedLessonTypes(tenantId),
    loadDeletedMembers(tenantId),
  ]);
  const allItems = [...appointments, ...customers, ...lessonTypes, ...members].filter((item) =>
    matchesQuery(item, q),
  );
  const counts = {
    appointment: allItems.filter((item) => item.kind === "appointment").length,
    customer: allItems.filter((item) => item.kind === "customer").length,
    lessonType: allItems.filter((item) => item.kind === "lessonType").length,
    member: allItems.filter((item) => item.kind === "member").length,
  };
  const items = allItems
    .filter((item) => kind === "all" || item.kind === kind)
    .sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : a.deletedAt > b.deletedAt ? -1 : 0));

  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    counts: {
      ...counts,
      total: counts.appointment + counts.customer + counts.lessonType + counts.member,
    },
  };
}

export async function restoreTrashItem(tenantId: string, kindInput: string | undefined, id: string | undefined) {
  const kind = parseTrashKind(kindInput);
  if (kind === "all") {
    throwValidation("Papierkorb-Typ ist erforderlich", { field: "kind" });
  }
  if (kind === "appointment") {
    return { kind: "appointment" as const, data: await restoreAppointment(tenantId, id) };
  }
  if (kind === "customer") {
    return { kind: "customer" as const, data: await restoreCustomer(tenantId, id) };
  }
  if (kind === "lessonType") {
    return { kind: "lessonType" as const, data: await restoreLessonType(tenantId, id) };
  }
  return { kind: "member" as const, data: await restoreTenantMember(tenantId, id) };
}
