import bcrypt from "bcryptjs";
import { getRouterParam } from "h3";
import { prisma } from "~/server/utils/prisma";
import { requireSuperadmin } from "~/server/utils/authz";

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);
  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId fehlt" });
  }

  const body = await readBody<{
    name?: string | null;
    password?: string;
    isSuperadmin?: boolean;
  }>(event);

  const update: {
    name?: string | null;
    passwordHash?: string;
    isSuperadmin?: boolean;
  } = {};

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: update,
    select: { id: true, email: true, name: true, isSuperadmin: true },
  });

  return user;
});
