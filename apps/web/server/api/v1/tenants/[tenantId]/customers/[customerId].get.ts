import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { getCustomer } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  return getCustomer(access.tenant.id, getRouterParam(event, "customerId"));
});
