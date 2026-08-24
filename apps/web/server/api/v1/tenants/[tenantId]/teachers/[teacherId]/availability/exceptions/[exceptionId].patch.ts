import { getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { patchAvailabilityException } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = await readBody(event);

  return patchAvailabilityException(
    access.tenant.id,
    getRouterParam(event, "teacherId"),
    getRouterParam(event, "exceptionId"),
    body,
  );
});
