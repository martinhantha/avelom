import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@avelom.local";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo123";
const DEMO_NAME = process.env.SEED_DEMO_NAME ?? "Demo Admin";
const TENANT_NAME = process.env.SEED_TENANT_NAME ?? "Demo Studio";
const TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? "demo-studio";
const DEMO_IS_SUPERADMIN = (process.env.SEED_DEMO_IS_SUPERADMIN ?? "true").toLowerCase() === "true";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    create: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
    },
    update: {
      name: TENANT_NAME,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash,
      isSuperadmin: DEMO_IS_SUPERADMIN,
    },
    update: {
      name: DEMO_NAME,
      passwordHash,
      isSuperadmin: DEMO_IS_SUPERADMIN,
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: user.id },
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "ADMIN",
    },
    update: {
      role: "ADMIN",
      deletedAt: null,
      deletedByUserId: null,
    },
  });

  const teacher = await prisma.teacherProfile.upsert({
    where: { membershipId: membership.id },
    create: {
      tenantId: tenant.id,
      membershipId: membership.id,
      displayName: "Martin Demo",
      qualifications: ["demo", "standard"],
    },
    update: {
      tenantId: tenant.id,
      displayName: "Martin Demo",
      qualifications: ["demo", "standard"],
      deletedAt: null,
      deletedByUserId: null,
    },
  });

  const existingResource = await prisma.resource.findFirst({
    where: { tenantId: tenant.id, name: "Ressource Alpha" },
  });
  if (existingResource) {
    await prisma.resource.update({
      where: { id: existingResource.id },
      data: { capacity: 1, deletedAt: null, deletedByUserId: null },
    });
  } else {
    await prisma.resource.create({
      data: {
        tenantId: tenant.id,
        name: "Ressource Alpha",
        capacity: 1,
      },
    });
  }

  const existingLessonType = await prisma.lessonType.findFirst({
    where: { tenantId: tenant.id, name: "Schnupperstunde" },
  });
  if (existingLessonType) {
    await prisma.lessonType.update({
      where: { id: existingLessonType.id },
      data: { defaultDurationMin: 60, deletedAt: null, deletedByUserId: null },
    });
  } else {
    await prisma.lessonType.create({
      data: {
        tenantId: tenant.id,
        name: "Schnupperstunde",
        defaultDurationMin: 60,
      },
    });
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, displayName: "Luis Muster" },
  });
  if (existingCustomer) {
    await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: { customerSource: "manual", deletedAt: null, deletedByUserId: null },
    });
  } else {
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        displayName: "Luis Muster",
        customerSource: "manual",
        phones: {
          create: {
            tenantId: tenant.id,
            raw: "+43 660 000000",
            e164: "+43660000000",
            isPrimary: true,
          },
        },
      },
    });
  }

  const weekdays = [1, 2, 3, 4, 5];
  const existingRule = await prisma.availabilityRule.findFirst({
    where: {
      tenantId: tenant.id,
      teacherId: teacher.id,
      startTime: "08:00",
      endTime: "18:00",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
  if (existingRule) {
    await prisma.availabilityRule.update({
      where: { id: existingRule.id },
      data: {
        weekday: 1,
        weekdays,
        kind: "available",
        allDay: false,
        deletedAt: null,
        deletedByUserId: null,
      },
    });
    await prisma.availabilityRule.updateMany({
      where: {
        tenantId: tenant.id,
        teacherId: teacher.id,
        startTime: "08:00",
        endTime: "18:00",
        deletedAt: null,
        id: { not: existingRule.id },
      },
      data: { deletedAt: new Date() },
    });
  } else {
    await prisma.availabilityRule.create({
      data: {
        tenantId: tenant.id,
        teacherId: teacher.id,
        weekday: 1,
        weekdays,
        startTime: "08:00",
        endTime: "18:00",
        kind: "available",
        allDay: false,
      },
    });
  }

  console.info(`Seed OK — login: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (tenant: ${TENANT_SLUG})`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
