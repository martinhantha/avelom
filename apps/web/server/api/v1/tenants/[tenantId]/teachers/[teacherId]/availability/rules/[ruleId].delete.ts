import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { softDeleteAvailabilityRule } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  await softDeleteAvailabilityRule(
    access.tenant.id,
    getRouterParam(event, "teacherId"),
    getRouterParam(event, "ruleId"),
    access.actorUserId,
  );

  setResponseStatus(event, 204);
  return null;
});
