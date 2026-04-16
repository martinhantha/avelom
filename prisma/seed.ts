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

  await prisma.membership.upsert({
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
