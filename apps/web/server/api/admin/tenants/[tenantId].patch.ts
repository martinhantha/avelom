import { getRouterParam, readBody } from "h3";
import { prisma } from "~/server/utils/prisma";
import { requireSuperadmin } from "~/server/utils/authz";

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);
  const tenantId = getRouterParam(event, "tenantId");
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: "tenantId fehlt" });
  }

  const existing = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Mandant nicht gefunden" });
  }

  const body = await readBody<{ name?: string; slug?: string; useDefaultDuration?: boolean }>(event);
  const data: { name?: string; slug?: string; useDefaultDuration?: boolean } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name || name.length < 2) {
      throw createError({ statusCode: 400, statusMessage: "Name ist erforderlich (min. 2 Zeichen)" });
    }
    data.name = name;
  }
  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug);
    if (!slug || slug.length < 2) {
      throw createError({ statusCode: 400, statusMessage: "Slug ist erforderlich (min. 2 Zeichen)" });
    }
    data.slug = slug;
  }
  if (typeof body.useDefaultDuration === "boolean") {
    data.useDefaultDuration = body.useDefaultDuration;
  }

  if (!Object.keys(data).length) {
    throw createError({ statusCode: 400, statusMessage: "Keine Änderungen übermittelt" });
  }

  const tenant = await prisma.tenant.update({
    where: { id: existing.id },
    data,
    select: { id: true, name: true, slug: true, useDefaultDuration: true, createdAt: true },
  });

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    useDefaultDuration: tenant.useDefaultDuration,
    createdAt: tenant.createdAt.toISOString(),
  };
});
