import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { listAvailabilityRules } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  return listAvailabilityRules(access.tenant.id, getRouterParam(event, "teacherId"));
});
