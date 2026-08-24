import bcrypt from "bcryptjs";
import { TenantRole } from "@prisma/client";
import { prisma } from "~/server/utils/prisma";
import { throwConflict, throwNotFound, throwValidation } from "~/server/utils/api-errors";
import { assertUuid } from "~/server/utils/authz";

const allowedRoles: TenantRole[] = [TenantRole.ADMIN, TenantRole.STAFF, TenantRole.END_CUSTOMER];

function normalizeRole(value: unknown): TenantRole {
  if (typeof value !== "string" || !allowedRoles.includes(value as TenantRole)) {
    throwValidation("Gültige Rolle ist erforderlich", { field: "role" });
  }
  return value as TenantRole;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throwValidation("E-Mail ist erforderlich", { field: "email" });
  }
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throwValidation("Gültige E-Mail ist erforderlich", { field: "email" });
  }
  return email;
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length ? name : null;
}

export async function listTenantMembers(tenantId: string) {
  const memberships = await prisma.membership.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: { id: true, email: true, name: true, isSuperadmin: true },
      },
    },
  });

  return {
    data: memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      user: m.user,
    })),
  };
}

export async function addTenantMember(tenantId: string, rawBody: unknown) {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(body.email);
  const role = normalizeRole(body.role);
  const name = normalizeName(body.name);
  const passwordRaw = typeof body.password === "string" ? body.password : "";

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isSuperadmin: true, passwordHash: true },
  });

  if (!user) {
    if (passwordRaw.length < 6) {
      throwValidation("Passwort muss mindestens 6 Zeichen haben", { field: "password" });
    }
    const passwordHash = await bcrypt.hash(passwordRaw, 10);
    user = await prisma.user.create({
      data: { email, name, passwordHash, isSuperadmin: false },
      select: { id: true, email: true, name: true, isSuperadmin: true, passwordHash: true },
    });
  }

  const existing = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    select: { id: true, deletedAt: true },
  });

  if (existing && !existing.deletedAt) {
    throwConflict("Benutzer ist bereits Mitglied dieses Mandanten", {
      conflictType: "MEMBER_EXISTS",
      userId: user.id,
    });
  }

  const membership = existing
    ? await prisma.membership.update({
        where: { id: existing.id },
        data: { role, deletedAt: null, deletedByUserId: null },
        select: { id: true, role: true, createdAt: true },
      })
    : await prisma.membership.create({
        data: { tenantId, userId: user.id, role },
        select: { id: true, role: true, createdAt: true },
      });

  return {
    membershipId: membership.id,
    role: membership.role,
    createdAt: membership.createdAt.toISOString(),
    user: { id: user.id, email: user.email, name: user.name, isSuperadmin: user.isSuperadmin },
  };
}

export async function updateTenantMember(
  tenantId: string,
  userIdInput: string | undefined,
  rawBody: unknown,
) {
  const userId = assertUuid(userIdInput, "userId");
  const body = (rawBody ?? {}) as Record<string, unknown>;

  const membership = await prisma.membership.findFirst({
    where: { tenantId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!membership) {
    throwNotFound("Mitgliedschaft nicht gefunden", { tenantId, userId });
  }

  const userUpdate: { name?: string | null; passwordHash?: string } = {};
  if (hasOwn(body, "name")) {
    userUpdate.name = normalizeName(body.name);
  }
  if (hasOwn(body, "password")) {
    const passwordRaw = typeof body.password === "string" ? body.password : "";
    if (passwordRaw.length > 0) {
      if (passwordRaw.length < 6) {
        throwValidation("Passwort muss mindestens 6 Zeichen haben", { field: "password" });
      }
      userUpdate.passwordHash = await bcrypt.hash(passwordRaw, 10);
    }
  }

  const membershipUpdate: { role?: TenantRole } = {};
  if (hasOwn(body, "role")) {
    membershipUpdate.role = normalizeRole(body.role);
  }

  if (!Object.keys(userUpdate).length && !Object.keys(membershipUpdate).length) {
    throwValidation("Keine Änderungen übermittelt");
  }

  const [updatedMembership] = await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: membershipUpdate,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true, isSuperadmin: true } },
      },
    }),
    ...(Object.keys(userUpdate).length
      ? [prisma.user.update({ where: { id: userId }, data: userUpdate })]
      : []),
  ]);

  const refreshed = await prisma.membership.findUnique({
    where: { id: updatedMembership.id },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true, isSuperadmin: true } },
    },
  });

  const result = refreshed ?? updatedMembership;
  return {
    membershipId: result.id,
    role: result.role,
    createdAt: result.createdAt.toISOString(),
    user: result.user,
  };
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function removeTenantMember(
  tenantId: string,
  userIdInput: string | undefined,
  actorUserId: string,
) {
  const userId = assertUuid(userIdInput, "userId");
  const membership = await prisma.membership.findFirst({
    where: { tenantId, userId, deletedAt: null },
    select: { id: true, teacherProfile: { select: { id: true } } },
  });
  if (!membership) {
    throwNotFound("Mitgliedschaft nicht gefunden", { tenantId, userId });
  }
  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membership.id },
      data: { deletedAt: new Date(), deletedByUserId: actorUserId },
    });
    if (membership.teacherProfile) {
      await tx.tenant.updateMany({
        where: { id: tenantId, defaultTeacherId: membership.teacherProfile.id },
        data: { defaultTeacherId: null },
      });
    }
  });
}
