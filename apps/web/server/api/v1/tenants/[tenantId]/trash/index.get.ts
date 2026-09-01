import { getQuery, getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { listTenantTrash } from "~/server/utils/trash";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const query = getQuery(event);

  return listTenantTrash(access.tenant.id, {
    kind: queryString(query.kind),
    q: queryString(query.q),
    page: queryString(query.page),
    pageSize: queryString(query.pageSize),
  });
});
