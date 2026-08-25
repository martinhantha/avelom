import {
  AppointmentStatus,
  AvailabilityExceptionType,
  CustomerSource,
  type Prisma,
} from "@prisma/client";
import { prisma } from "~/server/utils/prisma";
import {
  throwConflict,
  throwNotFound,
  throwValidation,
  throwVersionConflict,
} from "~/server/utils/api-errors";
import { assertUuid } from "~/server/utils/authz";

const BUSINESS_TIME_ZONE = "Europe/Rome";
const activeAppointmentStatuses = [
  AppointmentStatus.draft,
  AppointmentStatus.confirmed,
  AppointmentStatus.completed,
];

const appointmentSelect = {
  id: true,
  tenantId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  lessonTypeId: true,
  teacherId: true,
  resourceId: true,
  customerId: true,
  appointmentContactText: true,
  appointmentPhoneRaw: true,
  appointmentPhoneE164: true,
  unstructuredNote: true,
  parseSnapshot: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  lessonType: { select: { id: true, name: true, defaultDurationMin: true } },
  teacher: { select: { id: true, displayName: true } },
  resource: { select: { id: true, name: true, capacity: true } },
  customer: {
    select: {
      id: true,
      displayName: true,
      customerSource: true,
      phones: {
        where: { deletedAt: null },
        select: { e164: true, raw: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  },
} satisfies Prisma.AppointmentSelect;

const customerSelect = {
  id: true,
  tenantId: true,
  displayName: true,
  customerSource: true,
  notes: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  phones: {
    where: { deletedAt: null },
    select: { id: true, e164: true, raw: true, isPrimary: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.CustomerSelect;

function hasOwn(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredDate(value: unknown, field: string): Date {
  if (typeof value !== "string" || !value.trim()) {
    throwValidation(`${field} ist erforderlich`, { field });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwValidation(`${field} ist kein gültiges Datum`, { field });
  }
  return date;
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseRequiredDate(value, field);
}

function parseDateOnly(value: unknown, field: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throwValidation(`${field} muss im Format YYYY-MM-DD sein`, { field });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throwValidation(`${field} ist kein gültiges Datum`, { field });
  }
  return date;
}

function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ensureRange(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) {
    throwValidation("Ende muss nach dem Start liegen", {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }
}

function normalizeStatus(value: unknown): AppointmentStatus | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !Object.values(AppointmentStatus).includes(value as AppointmentStatus)) {
    throwValidation("Terminstatus ist ungültig", { field: "status" });
  }
  return value as AppointmentStatus;
}

function normalizeCustomerSource(value: unknown): CustomerSource {
  if (value === undefined || value === null || value === "") {
    return CustomerSource.manual;
  }
  if (typeof value !== "string" || !Object.values(CustomerSource).includes(value as CustomerSource)) {
    throwValidation("Kundenquelle ist ungültig", { field: "customerSource" });
  }
  return value as CustomerSource;
}

function normalizeExceptionType(value: unknown): AvailabilityExceptionType {
  if (typeof value !== "string" || !Object.values(AvailabilityExceptionType).includes(value as AvailabilityExceptionType)) {
    throwValidation("Ausnahmetyp ist ungültig", { field: "type" });
  }
  return value as AvailabilityExceptionType;
}

function normalizeOptionalUuid(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throwValidation(`${field} ist ungültig`, { field });
  }
  return assertUuid(value, field);
}

function normalizeRequiredUuid(value: string | undefined, field: string): string {
  return assertUuid(value, field);
}

function parseIfMatch(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throwValidation("If-Match muss eine gültige Versionsnummer sein", { header: "If-Match" });
  }
  return parsed;
}

function compareTimes(left: string, right: string): number {
  return left.localeCompare(right);
}

function normalizeTime(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    throwValidation(`${field} muss im Format HH:mm sein`, { field });
  }
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) {
    throwValidation(`${field} ist keine gültige Uhrzeit`, { field });
  }
  return value;
}

function toAppointmentDto(row: Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>) {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCustomerDto(row: Prisma.CustomerGetPayload<{ select: typeof customerSelect }>) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRuleDto(row: {
  id: string;
  tenantId: string;
  teacherId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  locationId: string | null;
  activityTags: Prisma.JsonValue | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toExceptionDto(row: {
  id: string;
  tenantId: string;
  teacherId: string;
  type: AvailabilityExceptionType;
  startsOn: Date;
  endsOn: Date;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    startsOn: dateOnlyString(row.startsOn),
    endsOn: dateOnlyString(row.endsOn),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireTeacher(tenantId: string, teacherId: string): Promise<void> {
  const teacher = await prisma.teacherProfile.findFirst({
    where: { id: teacherId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) {
    throwNotFound("Lehrer nicht gefunden", { teacherId });
  }
}

async function requireResource(tenantId: string, resourceId: string): Promise<{ capacity: number }> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
    select: { capacity: true },
  });
  if (!resource) {
    throwNotFound("Ressource nicht gefunden", { resourceId });
  }
  return resource;
}

async function tenantResourcesEnabled(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { resourcesEnabled: true },
  });
  return tenant?.resourcesEnabled ?? true;
}

async function requireLessonType(tenantId: string, lessonTypeId: string): Promise<void> {
  const lessonType = await prisma.lessonType.findFirst({
    where: { id: lessonTypeId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!lessonType) {
    throwNotFound("Terminart nicht gefunden", { lessonTypeId });
  }
}

async function requireCustomer(tenantId: string, customerId: string): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) {
    throwNotFound("Kunde nicht gefunden", { customerId });
  }
}

function getBusinessParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[byType.get("weekday") ?? ""];
  if (weekday === undefined) {
    throwValidation("Geschäftsdatum konnte nicht berechnet werden");
  }

  return {
    date: `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`,
    time: `${byType.get("hour")}:${byType.get("minute")}`,
    weekday,
  };
}

async function validateTeacherAvailability(
  tenantId: string,
  teacherId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { tenantId, teacherId, deletedAt: null },
      select: { weekday: true, startTime: true, endTime: true },
    }),
    prisma.availabilityException.findMany({
      where: { tenantId, teacherId, deletedAt: null },
      select: { type: true, startsOn: true, endsOn: true },
    }),
  ]);

  const start = getBusinessParts(startsAt);
  const end = getBusinessParts(endsAt);
  const exceptionForDay = exceptions.filter(
    (exception) =>
      start.date >= dateOnlyString(exception.startsOn) && start.date <= dateOnlyString(exception.endsOn),
  );
  const blockingException = exceptionForDay.find((exception) =>
    [
      AvailabilityExceptionType.vacation,
      AvailabilityExceptionType.sick,
      AvailabilityExceptionType.block,
    ].includes(exception.type),
  );

  if (blockingException) {
    throwConflict("Lehrer ist in diesem Zeitraum nicht verfügbar", {
      conflictType: "TEACHER_UNAVAILABLE",
      reason: blockingException.type,
      teacherId,
    });
  }

  if (rules.length === 0) {
    return;
  }

  const extraOpen = exceptionForDay.some((exception) => exception.type === AvailabilityExceptionType.extra_open);
  const matchingRule = rules.some(
    (rule) =>
      rule.weekday === start.weekday &&
      start.date === end.date &&
      compareTimes(start.time, rule.startTime) >= 0 &&
      compareTimes(end.time, rule.endTime) <= 0,
  );

  if (!matchingRule && !extraOpen) {
    throwConflict("Lehrer ist in diesem Zeitraum nicht verfügbar", {
      conflictType: "TEACHER_UNAVAILABLE",
      teacherId,
    });
  }
}

async function validateSchedulingConstraints(
  tenantId: string,
  input: {
    startsAt: Date;
    endsAt: Date;
    status: AppointmentStatus;
    teacherId: string | null;
    resourceId: string | null;
    excludeAppointmentId?: string;
  },
): Promise<void> {
  ensureRange(input.startsAt, input.endsAt);

  if (input.status === AppointmentStatus.cancelled) {
    return;
  }

  const overlapWhere = {
    tenantId,
    deletedAt: null,
    status: { in: activeAppointmentStatuses },
    startsAt: { lt: input.endsAt },
    endsAt: { gt: input.startsAt },
    ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
  } satisfies Prisma.AppointmentWhereInput;

  if (input.teacherId) {
    await validateTeacherAvailability(tenantId, input.teacherId, input.startsAt, input.endsAt);
    const conflicts = await prisma.appointment.findMany({
      where: { ...overlapWhere, teacherId: input.teacherId },
      select: { id: true, startsAt: true, endsAt: true },
      take: 3,
    });
    if (conflicts.length) {
      throwConflict("Lehrer ist im Zeitraum bereits gebucht", {
        conflictType: "TIME_OVERLAP",
        teacherId: input.teacherId,
        appointments: conflicts.map((row) => ({
          id: row.id,
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt.toISOString(),
        })),
      });
    }
  }

  if (input.resourceId) {
    const resource = await requireResource(tenantId, input.resourceId);
    const overlapCount = await prisma.appointment.count({
      where: { ...overlapWhere, resourceId: input.resourceId },
    });
    if (overlapCount >= resource.capacity) {
      throwConflict("Ressource ist im Zeitraum bereits ausgelastet", {
        conflictType: "RESOURCE_DOUBLE_BOOK",
        resourceId: input.resourceId,
        capacity: resource.capacity,
      });
    }
  }
}

async function validateAppointmentReferences(
  tenantId: string,
  input: {
    teacherId?: string | null;
    resourceId?: string | null;
    lessonTypeId?: string | null;
    customerId?: string | null;
  },
): Promise<void> {
  if (input.teacherId) {
    await requireTeacher(tenantId, input.teacherId);
  }
  if (input.resourceId) {
    await requireResource(tenantId, input.resourceId);
  }
  if (input.lessonTypeId) {
    await requireLessonType(tenantId, input.lessonTypeId);
  }
  if (input.customerId) {
    await requireCustomer(tenantId, input.customerId);
  }
}

export async function listAppointments(
  tenantId: string,
  query: {
    from?: string;
    to?: string;
    teacherId?: string;
    status?: string;
    q?: string;
    page?: string | number;
    pageSize?: string | number;
    sort?: string;
  },
) {
  const startsAtFilter: Prisma.DateTimeFilter = {};
  if (query.from) {
    startsAtFilter.gte = parseRequiredDate(query.from, "from");
  }
  if (query.to) {
    startsAtFilter.lt = parseRequiredDate(query.to, "to");
  }
  const teacherId = query.teacherId ? assertUuid(query.teacherId, "teacherId") : undefined;
  const statusFilter = query.status
    ? query.status
        .split(",")
        .map((status) => status.trim())
        .filter(Boolean)
        .map((status) => normalizeStatus(status))
        .filter((status): status is AppointmentStatus => Boolean(status))
    : undefined;
  const q = query.q?.trim();

  const pageRaw = Number(query.page ?? 1);
  const pageSizeRaw = Number(query.pageSize ?? 25);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 100
      ? Math.floor(pageSizeRaw)
      : 25;
  const sort = query.sort === "asc" ? "asc" : "desc";

  const where: Prisma.AppointmentWhereInput = {
    tenantId,
    deletedAt: null,
    ...(Object.keys(startsAtFilter).length ? { startsAt: startsAtFilter } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
    ...(q
      ? {
          OR: [
            { appointmentContactText: { contains: q, mode: "insensitive" } },
            { customer: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      select: appointmentSelect,
      orderBy: { startsAt: sort },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: rows.map(toAppointmentDto),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAppointment(tenantId: string, appointmentIdInput: string | undefined) {
  const appointmentId = normalizeRequiredUuid(appointmentIdInput, "appointmentId");
  const row = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: appointmentSelect,
  });
  if (!row) {
    throwNotFound("Termin nicht gefunden", { appointmentId });
  }
  return toAppointmentDto(row);
}

export async function createAppointment(tenantId: string, rawBody: unknown) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const startsAt = parseRequiredDate(body.startsAt, "startsAt");
  const endsAt = parseRequiredDate(body.endsAt, "endsAt");
  const status = normalizeStatus(body.status) ?? AppointmentStatus.confirmed;
  const lessonTypeId = normalizeOptionalUuid(body.lessonTypeId, "lessonTypeId") ?? null;
  const teacherId = normalizeOptionalUuid(body.teacherId, "teacherId") ?? null;
  const resourcesEnabled = await tenantResourcesEnabled(tenantId);
  const resourceId = resourcesEnabled
    ? (normalizeOptionalUuid(body.resourceId, "resourceId") ?? null)
    : null;
  const customerId = normalizeOptionalUuid(body.customerId, "customerId") ?? null;

  await validateAppointmentReferences(tenantId, { lessonTypeId, teacherId, resourceId, customerId });
  await validateSchedulingConstraints(tenantId, { startsAt, endsAt, status, teacherId, resourceId });

  const row = await prisma.appointment.create({
    data: {
      tenantId,
      startsAt,
      endsAt,
      status,
      lessonTypeId,
      teacherId,
      resourceId,
      customerId,
      appointmentContactText: optionalTrimmedString(body.appointmentContactText),
      appointmentPhoneRaw: optionalTrimmedString(body.appointmentPhoneRaw),
      appointmentPhoneE164: optionalTrimmedString(body.appointmentPhoneE164),
      unstructuredNote: optionalTrimmedString(body.unstructuredNote),
    },
    select: appointmentSelect,
  });

  return toAppointmentDto(row);
}

export async function patchAppointment(
  tenantId: string,
  appointmentIdInput: string | undefined,
  rawBody: unknown,
  ifMatchHeader?: string,
) {
  const appointmentId = normalizeRequiredUuid(appointmentIdInput, "appointmentId");
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: appointmentSelect,
  });
  if (!existing) {
    throwNotFound("Termin nicht gefunden", { appointmentId });
  }

  const ifMatch = parseIfMatch(ifMatchHeader);
  if (ifMatch !== undefined && existing.version !== ifMatch) {
    throwVersionConflict("Termin wurde inzwischen verändert", {
      expectedVersion: ifMatch,
      currentVersion: existing.version,
    });
  }

  const startsAt = parseOptionalDate(body.startsAt, "startsAt") ?? existing.startsAt;
  const endsAt = parseOptionalDate(body.endsAt, "endsAt") ?? existing.endsAt;
  const status = normalizeStatus(body.status) ?? existing.status;
  const lessonTypeId = hasOwn(body, "lessonTypeId")
    ? normalizeOptionalUuid(body.lessonTypeId, "lessonTypeId") ?? null
    : existing.lessonTypeId;
  const teacherId = hasOwn(body, "teacherId")
    ? normalizeOptionalUuid(body.teacherId, "teacherId") ?? null
    : existing.teacherId;
  const resourcesEnabled = await tenantResourcesEnabled(tenantId);
  const resourceId =
    resourcesEnabled && hasOwn(body, "resourceId")
      ? normalizeOptionalUuid(body.resourceId, "resourceId") ?? null
      : existing.resourceId;
  const customerId = hasOwn(body, "customerId")
    ? normalizeOptionalUuid(body.customerId, "customerId") ?? null
    : existing.customerId;

  await validateAppointmentReferences(tenantId, { lessonTypeId, teacherId, resourceId, customerId });
  await validateSchedulingConstraints(tenantId, {
    startsAt,
    endsAt,
    status,
    teacherId,
    resourceId,
    excludeAppointmentId: appointmentId,
  });

  const data: Prisma.AppointmentUncheckedUpdateInput = {
    version: { increment: 1 },
  };
  if (hasOwn(body, "startsAt")) data.startsAt = startsAt;
  if (hasOwn(body, "endsAt")) data.endsAt = endsAt;
  if (hasOwn(body, "status")) data.status = status;
  if (hasOwn(body, "lessonTypeId")) data.lessonTypeId = lessonTypeId;
  if (hasOwn(body, "teacherId")) data.teacherId = teacherId;
  if (resourcesEnabled && hasOwn(body, "resourceId")) data.resourceId = resourceId;
  if (hasOwn(body, "customerId")) data.customerId = customerId;
  if (hasOwn(body, "appointmentContactText")) {
    data.appointmentContactText = optionalTrimmedString(body.appointmentContactText);
  }
  if (hasOwn(body, "appointmentPhoneRaw")) {
    data.appointmentPhoneRaw = optionalTrimmedString(body.appointmentPhoneRaw);
  }
  if (hasOwn(body, "appointmentPhoneE164")) {
    data.appointmentPhoneE164 = optionalTrimmedString(body.appointmentPhoneE164);
  }
  if (hasOwn(body, "unstructuredNote")) {
    data.unstructuredNote = optionalTrimmedString(body.unstructuredNote);
  }

  const row = await prisma.appointment.update({
    where: { id: appointmentId },
    data,
    select: appointmentSelect,
  });

  return toAppointmentDto(row);
}

export async function softDeleteAppointment(
  tenantId: string,
  appointmentIdInput: string | undefined,
  actorUserId: string,
) {
  const appointmentId = normalizeRequiredUuid(appointmentIdInput, "appointmentId");
  await getAppointment(tenantId, appointmentId);
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      deletedAt: new Date(),
      deletedByUserId: actorUserId,
      version: { increment: 1 },
    },
  });
}

export async function listLessonTypes(tenantId: string) {
  const rows = await prisma.lessonType.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      tenantId: true,
      name: true,
      defaultDurationMin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return {
    data: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

function normalizeLessonTypePayload(rawBody: unknown, partial = false) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const name = hasOwn(body, "name") ? optionalTrimmedString(body.name) : undefined;
  if (!partial && (!name || name.length < 2)) {
    throwValidation("Name ist erforderlich", { field: "name" });
  }
  if (name !== undefined && (!name || name.length < 2)) {
    throwValidation("Name ist erforderlich", { field: "name" });
  }

  let defaultDurationMin: number | null | undefined;
  if (hasOwn(body, "defaultDurationMin")) {
    if (body.defaultDurationMin === null || body.defaultDurationMin === "") {
      defaultDurationMin = null;
    } else {
      const parsed = Number(body.defaultDurationMin);
      if (!Number.isInteger(parsed) || parsed < 5 || parsed > 24 * 60) {
        throwValidation("Standard-Dauer muss zwischen 5 und 1440 Minuten liegen", {
          field: "defaultDurationMin",
        });
      }
      defaultDurationMin = parsed;
    }
  }

  return { name, defaultDurationMin };
}

export async function createLessonType(tenantId: string, rawBody: unknown) {
  const payload = normalizeLessonTypePayload(rawBody);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { useDefaultDuration: true },
  });
  const useDefaultDuration = tenant?.useDefaultDuration ?? true;
  const row = await prisma.lessonType.create({
    data: {
      tenantId,
      name: payload.name!,
      defaultDurationMin: useDefaultDuration ? payload.defaultDurationMin ?? null : null,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      defaultDurationMin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function patchLessonType(
  tenantId: string,
  lessonTypeIdInput: string | undefined,
  rawBody: unknown,
) {
  const lessonTypeId = normalizeRequiredUuid(lessonTypeIdInput, "lessonTypeId");
  const existing = await prisma.lessonType.findFirst({
    where: { id: lessonTypeId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throwNotFound("Terminart nicht gefunden", { lessonTypeId });
  }
  const payload = normalizeLessonTypePayload(rawBody, true);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { useDefaultDuration: true },
  });
  const useDefaultDuration = tenant?.useDefaultDuration ?? true;
  const data: Prisma.LessonTypeUncheckedUpdateInput = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.defaultDurationMin !== undefined) {
    data.defaultDurationMin = useDefaultDuration ? payload.defaultDurationMin : null;
  }

  const row = await prisma.lessonType.update({
    where: { id: lessonTypeId },
    data,
    select: {
      id: true,
      tenantId: true,
      name: true,
      defaultDurationMin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function softDeleteLessonType(
  tenantId: string,
  lessonTypeIdInput: string | undefined,
  actorUserId: string,
) {
  const lessonTypeId = normalizeRequiredUuid(lessonTypeIdInput, "lessonTypeId");
  const existing = await prisma.lessonType.findFirst({
    where: { id: lessonTypeId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throwNotFound("Terminart nicht gefunden", { lessonTypeId });
  }
  await prisma.$transaction([
    prisma.tenant.updateMany({
      where: { id: tenantId, defaultLessonTypeId: lessonTypeId },
      data: { defaultLessonTypeId: null },
    }),
    prisma.lessonType.update({
      where: { id: lessonTypeId },
      data: { deletedAt: new Date(), deletedByUserId: actorUserId },
    }),
  ]);
}

export async function listCustomers(tenantId: string, query: { q?: string }) {
  const q = query.q?.trim();
  const rows = await prisma.customer.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
    },
    select: customerSelect,
    orderBy: { displayName: "asc" },
    take: 50,
  });

  return { data: rows.map(toCustomerDto) };
}

export async function getCustomer(tenantId: string, customerIdInput: string | undefined) {
  const customerId = normalizeRequiredUuid(customerIdInput, "customerId");
  const row = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: customerSelect,
  });
  if (!row) {
    throwNotFound("Kunde nicht gefunden", { customerId });
  }
  return toCustomerDto(row);
}

export async function createCustomer(tenantId: string, rawBody: unknown) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const displayName = optionalTrimmedString(body.displayName);
  if (!displayName || displayName.length < 2) {
    throwValidation("Kundenname ist erforderlich", { field: "displayName" });
  }
  const phones = Array.isArray(body.phones) ? body.phones : [];

  const row = await prisma.customer.create({
    data: {
      tenantId,
      displayName,
      customerSource: normalizeCustomerSource(body.customerSource),
      notes: optionalTrimmedString(body.notes),
      phones: phones.length
        ? {
            create: phones.map((phone, index) => {
              const phoneBody = (phone ?? {}) as Record<string, unknown>;
              return {
                tenantId,
                e164: optionalTrimmedString(phoneBody.e164),
                raw: optionalTrimmedString(phoneBody.raw),
                isPrimary: index === 0 || Boolean(phoneBody.isPrimary),
              };
            }),
          }
        : undefined,
    },
    select: customerSelect,
  });

  return toCustomerDto(row);
}

export async function patchCustomer(
  tenantId: string,
  customerIdInput: string | undefined,
  rawBody: unknown,
  ifMatchHeader?: string,
) {
  const customerId = normalizeRequiredUuid(customerIdInput, "customerId");
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true, version: true },
  });
  if (!existing) {
    throwNotFound("Kunde nicht gefunden", { customerId });
  }

  const ifMatch = parseIfMatch(ifMatchHeader);
  if (ifMatch !== undefined && existing.version !== ifMatch) {
    throwVersionConflict("Kunde wurde inzwischen verändert", {
      expectedVersion: ifMatch,
      currentVersion: existing.version,
    });
  }

  const data: Prisma.CustomerUpdateInput = { version: { increment: 1 } };
  if (hasOwn(body, "displayName")) {
    const displayName = optionalTrimmedString(body.displayName);
    if (!displayName || displayName.length < 2) {
      throwValidation("Kundenname ist erforderlich", { field: "displayName" });
    }
    data.displayName = displayName;
  }
  if (hasOwn(body, "notes")) {
    data.notes = optionalTrimmedString(body.notes);
  }

  const row = await prisma.customer.update({
    where: { id: customerId },
    data,
    select: customerSelect,
  });

  return toCustomerDto(row);
}

export async function softDeleteCustomer(
  tenantId: string,
  customerIdInput: string | undefined,
  actorUserId: string,
) {
  const customerId = normalizeRequiredUuid(customerIdInput, "customerId");
  await getCustomer(tenantId, customerId);
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt, deletedByUserId: actorUserId, version: { increment: 1 } },
    }),
    prisma.customerPhone.updateMany({
      where: { tenantId, customerId, deletedAt: null },
      data: { deletedAt, deletedByUserId: actorUserId },
    }),
  ]);
}

export async function listAvailabilityRules(tenantId: string, teacherIdInput: string | undefined) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  await requireTeacher(tenantId, teacherId);
  const rows = await prisma.availabilityRule.findMany({
    where: { tenantId, teacherId, deletedAt: null },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      weekday: true,
      startTime: true,
      endTime: true,
      locationId: true,
      activityTags: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return { data: rows.map(toRuleDto) };
}

function normalizeRulePayload(rawBody: unknown, partial = false) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const weekday = hasOwn(body, "weekday") ? Number(body.weekday) : undefined;
  if (!partial && weekday === undefined) {
    throwValidation("Wochentag ist erforderlich", { field: "weekday" });
  }
  if (weekday !== undefined && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    throwValidation("Wochentag muss zwischen 0 und 6 liegen", { field: "weekday" });
  }

  const startTime = hasOwn(body, "startTime") ? normalizeTime(body.startTime, "startTime") : undefined;
  const endTime = hasOwn(body, "endTime") ? normalizeTime(body.endTime, "endTime") : undefined;
  if (!partial && !startTime) {
    throwValidation("Startzeit ist erforderlich", { field: "startTime" });
  }
  if (!partial && !endTime) {
    throwValidation("Endzeit ist erforderlich", { field: "endTime" });
  }
  if (startTime && endTime && compareTimes(startTime, endTime) >= 0) {
    throwValidation("Endzeit muss nach der Startzeit liegen", { startTime, endTime });
  }

  const locationId = hasOwn(body, "locationId")
    ? normalizeOptionalUuid(body.locationId, "locationId") ?? null
    : undefined;
  const activityTags = hasOwn(body, "activityTags") && Array.isArray(body.activityTags)
    ? body.activityTags.filter((tag): tag is string => typeof tag === "string")
    : undefined;
  const priority = hasOwn(body, "priority") ? Number(body.priority) : undefined;
  if (priority !== undefined && !Number.isInteger(priority)) {
    throwValidation("Priorität muss eine ganze Zahl sein", { field: "priority" });
  }

  return { weekday, startTime, endTime, locationId, activityTags, priority };
}

export async function createAvailabilityRule(
  tenantId: string,
  teacherIdInput: string | undefined,
  rawBody: unknown,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  await requireTeacher(tenantId, teacherId);
  const payload = normalizeRulePayload(rawBody);

  const row = await prisma.availabilityRule.create({
    data: {
      tenantId,
      teacherId,
      weekday: payload.weekday!,
      startTime: payload.startTime!,
      endTime: payload.endTime!,
      locationId: payload.locationId,
      activityTags: payload.activityTags,
      priority: payload.priority ?? 0,
    },
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      weekday: true,
      startTime: true,
      endTime: true,
      locationId: true,
      activityTags: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return toRuleDto(row);
}

export async function patchAvailabilityRule(
  tenantId: string,
  teacherIdInput: string | undefined,
  ruleIdInput: string | undefined,
  rawBody: unknown,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  const ruleId = normalizeRequiredUuid(ruleIdInput, "ruleId");
  await requireTeacher(tenantId, teacherId);
  const existing = await prisma.availabilityRule.findFirst({
    where: { id: ruleId, tenantId, teacherId, deletedAt: null },
    select: { id: true, startTime: true, endTime: true },
  });
  if (!existing) {
    throwNotFound("Verfügbarkeitsregel nicht gefunden", { ruleId });
  }
  const payload = normalizeRulePayload(rawBody, true);
  const startTime = payload.startTime ?? existing.startTime;
  const endTime = payload.endTime ?? existing.endTime;
  if (compareTimes(startTime, endTime) >= 0) {
    throwValidation("Endzeit muss nach der Startzeit liegen", { startTime, endTime });
  }

  const data: Prisma.AvailabilityRuleUncheckedUpdateInput = {};
  if (payload.weekday !== undefined) data.weekday = payload.weekday;
  if (payload.startTime !== undefined) data.startTime = payload.startTime;
  if (payload.endTime !== undefined) data.endTime = payload.endTime;
  if (payload.locationId !== undefined) data.locationId = payload.locationId;
  if (payload.activityTags !== undefined) data.activityTags = payload.activityTags;
  if (payload.priority !== undefined) data.priority = payload.priority;

  const row = await prisma.availabilityRule.update({
    where: { id: ruleId },
    data,
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      weekday: true,
      startTime: true,
      endTime: true,
      locationId: true,
      activityTags: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return toRuleDto(row);
}

export async function softDeleteAvailabilityRule(
  tenantId: string,
  teacherIdInput: string | undefined,
  ruleIdInput: string | undefined,
  actorUserId: string,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  const ruleId = normalizeRequiredUuid(ruleIdInput, "ruleId");
  await requireTeacher(tenantId, teacherId);
  const rule = await prisma.availabilityRule.findFirst({
    where: { id: ruleId, tenantId, teacherId, deletedAt: null },
    select: { id: true },
  });
  if (!rule) {
    throwNotFound("Verfügbarkeitsregel nicht gefunden", { ruleId });
  }
  await prisma.availabilityRule.update({
    where: { id: ruleId },
    data: { deletedAt: new Date(), deletedByUserId: actorUserId },
  });
}

export async function listAvailabilityExceptions(tenantId: string, teacherIdInput: string | undefined) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  await requireTeacher(tenantId, teacherId);
  const rows = await prisma.availabilityException.findMany({
    where: { tenantId, teacherId, deletedAt: null },
    orderBy: [{ startsOn: "asc" }, { type: "asc" }],
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      type: true,
      startsOn: true,
      endsOn: true,
      reason: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return { data: rows.map(toExceptionDto) };
}

function normalizeExceptionPayload(rawBody: unknown, partial = false) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const type = hasOwn(body, "type") ? normalizeExceptionType(body.type) : undefined;
  if (!partial && !type) {
    throwValidation("Ausnahmetyp ist erforderlich", { field: "type" });
  }
  const startsOn = hasOwn(body, "startsOn") ? parseDateOnly(body.startsOn, "startsOn") : undefined;
  const endsOn = hasOwn(body, "endsOn") ? parseDateOnly(body.endsOn, "endsOn") : undefined;
  if (!partial && !startsOn) {
    throwValidation("Startdatum ist erforderlich", { field: "startsOn" });
  }
  if (!partial && !endsOn) {
    throwValidation("Enddatum ist erforderlich", { field: "endsOn" });
  }
  const reason = hasOwn(body, "reason") ? optionalTrimmedString(body.reason) : undefined;
  return { type, startsOn, endsOn, reason };
}

export async function createAvailabilityException(
  tenantId: string,
  teacherIdInput: string | undefined,
  rawBody: unknown,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  await requireTeacher(tenantId, teacherId);
  const payload = normalizeExceptionPayload(rawBody);
  if (payload.endsOn! < payload.startsOn!) {
    throwValidation("Enddatum muss am oder nach dem Startdatum liegen", {
      startsOn: dateOnlyString(payload.startsOn!),
      endsOn: dateOnlyString(payload.endsOn!),
    });
  }

  const row = await prisma.availabilityException.create({
    data: {
      tenantId,
      teacherId,
      type: payload.type!,
      startsOn: payload.startsOn!,
      endsOn: payload.endsOn!,
      reason: payload.reason,
    },
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      type: true,
      startsOn: true,
      endsOn: true,
      reason: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return toExceptionDto(row);
}

export async function patchAvailabilityException(
  tenantId: string,
  teacherIdInput: string | undefined,
  exceptionIdInput: string | undefined,
  rawBody: unknown,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  const exceptionId = normalizeRequiredUuid(exceptionIdInput, "exceptionId");
  await requireTeacher(tenantId, teacherId);
  const existing = await prisma.availabilityException.findFirst({
    where: { id: exceptionId, tenantId, teacherId, deletedAt: null },
    select: { id: true, startsOn: true, endsOn: true },
  });
  if (!existing) {
    throwNotFound("Verfügbarkeitsausnahme nicht gefunden", { exceptionId });
  }
  const payload = normalizeExceptionPayload(rawBody, true);
  const startsOn = payload.startsOn ?? existing.startsOn;
  const endsOn = payload.endsOn ?? existing.endsOn;
  if (endsOn < startsOn) {
    throwValidation("Enddatum muss am oder nach dem Startdatum liegen", {
      startsOn: dateOnlyString(startsOn),
      endsOn: dateOnlyString(endsOn),
    });
  }

  const data: Prisma.AvailabilityExceptionUncheckedUpdateInput = {};
  if (payload.type !== undefined) data.type = payload.type;
  if (payload.startsOn !== undefined) data.startsOn = payload.startsOn;
  if (payload.endsOn !== undefined) data.endsOn = payload.endsOn;
  if (payload.reason !== undefined) data.reason = payload.reason;

  const row = await prisma.availabilityException.update({
    where: { id: exceptionId },
    data,
    select: {
      id: true,
      tenantId: true,
      teacherId: true,
      type: true,
      startsOn: true,
      endsOn: true,
      reason: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return toExceptionDto(row);
}

export async function softDeleteAvailabilityException(
  tenantId: string,
  teacherIdInput: string | undefined,
  exceptionIdInput: string | undefined,
  actorUserId: string,
) {
  const teacherId = normalizeRequiredUuid(teacherIdInput, "teacherId");
  const exceptionId = normalizeRequiredUuid(exceptionIdInput, "exceptionId");
  await requireTeacher(tenantId, teacherId);
  const exception = await prisma.availabilityException.findFirst({
    where: { id: exceptionId, tenantId, teacherId, deletedAt: null },
    select: { id: true },
  });
  if (!exception) {
    throwNotFound("Verfügbarkeitsausnahme nicht gefunden", { exceptionId });
  }
  await prisma.availabilityException.update({
    where: { id: exceptionId },
    data: { deletedAt: new Date(), deletedByUserId: actorUserId },
  });
}

export async function getSchedulingOptions(tenantId: string, query: { q?: string }) {
  const q = query.q?.trim();
  const [teachers, resources, lessonTypes, customers, tenant] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: { tenantId, deletedAt: null, membership: { deletedAt: null } },
      select: { id: true, displayName: true, qualifications: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.resource.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, capacity: true },
      orderBy: { name: "asc" },
    }),
    prisma.lessonType.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, defaultDurationMin: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, displayName: true, customerSource: true },
      orderBy: { displayName: "asc" },
      take: 20,
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultTeacherId: true, defaultLessonTypeId: true, teacherLabel: true, resourcesEnabled: true },
    }),
  ]);

  const defaultTeacherId =
    tenant?.defaultTeacherId && teachers.some((teacher) => teacher.id === tenant.defaultTeacherId)
      ? tenant.defaultTeacherId
      : null;
  const defaultLessonTypeId =
    tenant?.defaultLessonTypeId &&
    lessonTypes.some((lessonType) => lessonType.id === tenant.defaultLessonTypeId)
      ? tenant.defaultLessonTypeId
      : null;

  return {
    teachers,
    resources: tenant?.resourcesEnabled === false ? [] : resources,
    lessonTypes,
    customers,
    defaultTeacherId,
    defaultLessonTypeId,
    teacherLabel: tenant?.teacherLabel?.trim() || "Lehrer",
    resourcesEnabled: tenant?.resourcesEnabled ?? true,
    businessTimeZone: BUSINESS_TIME_ZONE,
  };
}
