import { getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { prisma } from "~/server/utils/prisma";
import { throwValidation } from "~/server/utils/api-errors";
import { parseAppointmentIntent } from "~/server/utils/parse-intent";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = ((await readBody(event)) ?? {}) as {
    text?: unknown;
    answers?: Record<string, string>;
  };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    throwValidation("Text ist erforderlich", { field: "text" });
  }

  const [teachers, resources, lessonTypes, customers, tenant] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: { tenantId: access.tenant.id, deletedAt: null, membership: { deletedAt: null } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.resource.findMany({
      where: { tenantId: access.tenant.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lessonType.findMany({
      where: { tenantId: access.tenant.id, deletedAt: null },
      select: { id: true, name: true, defaultDurationMin: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { tenantId: access.tenant.id, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        phones: {
          where: { deletedAt: null },
          select: { e164: true, raw: true },
        },
      },
      orderBy: { displayName: "asc" },
      take: 300,
    }),
    prisma.tenant.findUnique({
      where: { id: access.tenant.id },
      select: { teacherLabel: true },
    }),
  ]);

  return parseAppointmentIntent(
    text,
    {
      timeZone: "Europe/Rome",
      teacherLabel: tenant?.teacherLabel?.trim() || "Lehrer",
      teachers,
      resources,
      lessonTypes: lessonTypes.map((item) => ({
        id: item.id,
        displayName: item.name,
        defaultDurationMin: item.defaultDurationMin,
      })),
      customers,
    },
    body.answers && typeof body.answers === "object" ? body.answers : {},
  );
});
