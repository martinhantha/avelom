import { readBody } from "h3";
import { requireSession } from "~/server/utils/authz";
import { prisma } from "~/server/utils/prisma";
import { throwValidation } from "~/server/utils/api-errors";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const body = ((await readBody(event)) ?? {}) as { token?: unknown; platform?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 4096) {
    throwValidation("Push-Token ist ungültig", { field: "token" });
  }
  const platform = body.platform === "ios" || body.platform === "web" ? body.platform : "android";
  await prisma.devicePushToken.upsert({
    where: { token },
    create: { userId: session.user.id, token, platform },
    update: { userId: session.user.id, platform },
  });
  return { ok: true as const };
});
