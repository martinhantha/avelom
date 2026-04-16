# Prisma: Soft-Delete-Konvention

Alle Domänenmodelle in `prisma/schema.prisma` nutzen `deletedAt` / optional `deletedByUserId`.

## Empfohlene Client-Extension (Skizze)

```typescript
import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          if (shouldFilterSoftDeleted(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          if (shouldFilterSoftDeleted(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
      },
    },
  });
}

/** Exclude AuditLog, AutomationRun, etc. */
function shouldFilterSoftDeleted(model: string) {
  return !["AuditLog", "AutomationRun"].includes(model);
}
```

Produktionscode: pro Modell feinjustieren oder explizite Repositories statt globalem `$allModels`, um Edge Cases (Admin-Papierkorb) nicht zu verstecken.
