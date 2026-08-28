import { readBody } from "h3";
import { requireSession } from "~/server/utils/authz";
import { prisma } from "~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const body = ((await readBody(event)) ?? {}) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token) {
    await prisma.devicePushToken.deleteMany({ where: { userId: session.user.id, token } });
  } else {
    await prisma.devicePushToken.deleteMany({ where: { userId: session.user.id } });
  }
  return { ok: true as const };
});
