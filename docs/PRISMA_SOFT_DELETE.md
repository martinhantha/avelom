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

## Admin-Papierkorb

Tenant-Admins (`Membership.role = ADMIN`) und Superadmins können gelöschte Datensätze listen und wiederherstellen:

- UI: `/trash`
- `GET /api/v1/tenants/{tenantId}/trash`
- `POST /api/v1/tenants/{tenantId}/trash/{kind}/{id}/restore`

Aktuell: Termine, Kunden (+ Telefonnummern), Termintypen, entfernte Mitgliedschaften.
Beim Wiederherstellen eines Termins wird ein mitgelöschter Kunde mit zurückgeholt.
