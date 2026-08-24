import { getQuery, getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { listAppointments } from "~/server/utils/scheduling";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const query = getQuery(event);

  return listAppointments(access.tenant.id, {
    from: queryString(query.from),
    to: queryString(query.to),
    teacherId: queryString(query.teacherId),
    status: queryString(query.status),
    q: queryString(query.q),
    page: queryString(query.page),
    pageSize: queryString(query.pageSize),
    sort: queryString(query.sort),
  });
});
