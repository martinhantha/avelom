import { getQuery, getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { getSchedulingOptions } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const query = getQuery(event);

  return getSchedulingOptions(access.tenant.id, {
    q: typeof query.q === "string" ? query.q : undefined,
  });
});
