import type { H3Event } from "h3";
import type { AuthSession } from "~/types/auth";
import { getRequestHeader } from "h3";
import { restoreCookieSession } from "~/server/utils/auth-cookies";
import { authSessionFromAccessToken } from "~/server/utils/auth-service";
import { prisma } from "~/server/utils/prisma";
import { throwApiError, throwNotFound } from "~/server/utils/api-errors";

function unauthorized(message: string): never {
  throwApiError(401, "UNAUTHORIZED", message);
}

function forbidden(message: string): never {
  throwApiError(403, "FORBIDDEN", message);
}

export async function requireSession(event: H3Event): Promise<AuthSession> {
  const authorization = getRequestHeader(event, "authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (bearerToken) {
    const session = await authSessionFromAccessToken(bearerToken);
    if (!session) unauthorized("Sitzung ungültig");
    return session;
  }

  const session = await restoreCookieSession(event);
  if (!session) unauthorized("Nicht angemeldet");
  return session;
}

export async function requireSuperadmin(event: H3Event): Promise<AuthSession> {
  const session = await requireSession(event);
  if (!session.user.isSuperadmin) {
    forbidden("Nur für Superadmin");
  }
  return session;
}

export type TenantAccessRole = "ADMIN" | "STAFF" | "END_CUSTOMER";

export interface TenantAccess {
  session: AuthSession;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  actorUserId: string;
  role: TenantAccessRole | "SUPERADMIN";
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value: string | undefined, label: string): string {
  if (!value || !uuidPattern.test(value)) {
    throwApiError(400, "VALIDATION_ERROR", `${label} ist ungültig`, { field: label });
  }
  return value;
}

export async function requireTenantAccess(
  event: H3Event,
  tenantIdInput: string | undefined,
  allowedRoles: TenantAccessRole[] = ["ADMIN", "STAFF"],
): Promise<TenantAccess> {
  const tenantId = assertUuid(tenantIdInput, "tenantId");
  const session = await requireSession(event);

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) {
    throwNotFound("Mandant nicht gefunden", { tenantId });
  }

  if (session.user.isSuperadmin) {
    return {
      session,
      tenant,
      actorUserId: session.user.id,
      role: "SUPERADMIN",
    };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      userId: session.user.id,
      deletedAt: null,
      role: { in: allowedRoles },
    },
    select: { role: true },
  });

  if (!membership) {
    forbidden("Keine Berechtigung für diesen Mandanten");
  }

  return {
    session,
    tenant,
    actorUserId: session.user.id,
    role: membership.role,
  };
}

export async function getActorTeacherProfileId(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const profile = await prisma.teacherProfile.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      membership: { userId, tenantId, deletedAt: null },
    },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function staffAppointmentScope(access: TenantAccess): Promise<{
  forceTeacherId: string | null;
  empty: boolean;
}> {
  if (access.role !== "STAFF") {
    return { forceTeacherId: null, empty: false };
  }
  const teacherId = await getActorTeacherProfileId(access.tenant.id, access.actorUserId);
  if (!teacherId) {
    return { forceTeacherId: null, empty: true };
  }
  return { forceTeacherId: teacherId, empty: false };
}
