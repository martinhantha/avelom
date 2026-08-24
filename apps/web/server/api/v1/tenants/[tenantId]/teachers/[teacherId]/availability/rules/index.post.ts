import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { createAvailabilityRule } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);
  const rule = await createAvailabilityRule(access.tenant.id, getRouterParam(event, "teacherId"), body);

  setResponseStatus(event, 201);
  return rule;
});
