import { createError, readBody } from "h3";
import { restoreCookieSession } from "~/server/utils/auth-cookies";
import { prisma } from "~/server/utils/prisma";
import { loadUserWithMemberships, toAuthSession } from "~/server/utils/session";
import { throwValidation } from "~/server/utils/api-errors";

export default defineEventHandler(async (event) => {
  const session = await restoreCookieSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet" });
  }

  const body = ((await readBody(event)) ?? {}) as { nextDayBriefingEnabled?: unknown };
  if (typeof body.nextDayBriefingEnabled !== "boolean") {
    throwValidation("Keine Änderungen übermittelt");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nextDayBriefingEnabled: body.nextDayBriefingEnabled },
  });

  const user = await loadUserWithMemberships(session.user.id);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet" });
  }
  return toAuthSession(user);
});
