import type { AuthSession } from "~/types/auth";
import { prisma } from "./prisma";

export async function loadUserWithMemberships(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              useDefaultDuration: true,
              teacherLabel: true,
              resourcesEnabled: true,
            },
          },
        },
      },
    },
  });
}

export function toAuthSession(user: NonNullable<Awaited<ReturnType<typeof loadUserWithMemberships>>>): AuthSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperadmin: user.isSuperadmin,
    },
    memberships: user.memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      role: m.role,
      useDefaultDuration: m.tenant.useDefaultDuration,
      teacherLabel: m.tenant.teacherLabel?.trim() || "Lehrer",
      resourcesEnabled: m.tenant.resourcesEnabled,
    })),
  };
}
