import "./load-root-env";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Recreate the client on HMR so schema fields like defaultLessonTypeId are picked up. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void globalForPrisma.prisma?.$disconnect();
    globalForPrisma.prisma = undefined;
  });
}
