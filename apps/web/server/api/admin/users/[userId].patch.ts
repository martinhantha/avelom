import bcrypt from "bcryptjs";
import { getRouterParam } from "h3";
import { prisma } from "~/server/utils/prisma";
import { requireSuperadmin } from "~/server/utils/authz";
import { assertEmailAvailable, normalizeEmail, setUserDisabled } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const session = await requireSuperadmin(event);
  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId fehlt" });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Benutzer nicht gefunden" });
  }

  const body = await readBody<{
    email?: string;
    name?: string | null;
    password?: string;
    isSuperadmin?: boolean;
    disabled?: boolean;
  }>(event);

  const update: {
    email?: string;
    name?: string | null;
    passwordHash?: string;
    isSuperadmin?: boolean;
  } = {};

  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    await assertEmailAvailable(email, userId);
    update.email = email;
  }
  if (body.name !== undefined) {
    const name = body.name?.trim();
    update.name = name ? name : null;
  }
  if (body.password !== undefined) {
    if (body.password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: "Passwort muss mindestens 6 Zeichen haben" });
    }
    update.passwordHash = await bcrypt.hash(body.password, 10);
  }
  if (body.isSuperadmin !== undefined) {
    update.isSuperadmin = Boolean(body.isSuperadmin);
  }

  if (body.disabled !== undefined) {
    await setUserDisabled(userId, Boolean(body.disabled), {
      id: session.user.id,
      isSuperadmin: true,
    });
  }

  if (!Object.keys(update).length && body.disabled === undefined) {
    throw createError({ statusCode: 400, statusMessage: "Keine Änderungen übermittelt" });
  }

  if (Object.keys(update).length) {
    await prisma.user.update({
      where: { id: userId },
      data: update,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isSuperadmin: true, disabledAt: true },
  });

  return user ? { ...user, disabledAt: user.disabledAt?.toISOString() ?? null } : user;
});
