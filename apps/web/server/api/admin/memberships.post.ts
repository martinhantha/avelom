import { TenantRole } from "@prisma/client";
import { prisma } from "~/server/utils/prisma";
import { requireSuperadmin } from "~/server/utils/authz";

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);
  const body = await readBody<{ userId?: string; tenantId?: string; role?: TenantRole }>(event);

  if (!body.userId || !body.tenantId) {
    throw createError({ statusCode: 400, statusMessage: "userId und tenantId sind erforderlich" });
  }
  if (!body.role || !Object.values(TenantRole).includes(body.role)) {
    throw createError({ statusCode: 400, statusMessage: "Gültige Rolle ist erforderlich" });
  }

  const membership = await prisma.membership.upsert({
    where: {
      tenantId_userId: { tenantId: body.tenantId, userId: body.userId },
    },
    create: {
      tenantId: body.tenantId,
      userId: body.userId,
      role: body.role,
    },
    update: {
      role: body.role,
      deletedAt: null,
      deletedByUserId: null,
    },
    select: { id: true, tenantId: true, userId: true, role: true },
  });

  return membership;
});
