import { getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { patchAvailabilityRule } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);

  return patchAvailabilityRule(
    access.tenant.id,
    getRouterParam(event, "teacherId"),
    getRouterParam(event, "ruleId"),
    body,
  );
});
