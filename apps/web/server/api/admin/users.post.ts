import bcrypt from "bcryptjs";
import { TenantRole } from "@prisma/client";
import { prisma } from "~/server/utils/prisma";
import { requireSuperadmin } from "~/server/utils/authz";
import { assertEmailAvailable, normalizeEmail } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);
  const body = await readBody<{
    email?: string;
    name?: string;
    password?: string;
    isSuperadmin?: boolean;
    tenantId?: string;
    role?: TenantRole;
  }>(event);

  const email = normalizeEmail(body.email);
  await assertEmailAvailable(email);
  const password = body.password ?? "";
  const name = body.name?.trim() || null;
  const isSuperadmin = Boolean(body.isSuperadmin);

  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: "Passwort muss mindestens 6 Zeichen haben" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = body.role && Object.values(TenantRole).includes(body.role) ? body.role : undefined;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      isSuperadmin,
      memberships:
        body.tenantId && role
          ? {
              create: {
                tenantId: body.tenantId,
                role,
              },
            }
          : undefined,
    },
    select: { id: true, email: true, name: true, isSuperadmin: true },
  });

  return user;
});
