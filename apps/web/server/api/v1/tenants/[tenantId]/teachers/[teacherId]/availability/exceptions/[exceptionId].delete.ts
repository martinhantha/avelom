import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { softDeleteAvailabilityException } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  await softDeleteAvailabilityException(
    access.tenant.id,
    getRouterParam(event, "teacherId"),
    getRouterParam(event, "exceptionId"),
    access.actorUserId,
  );

  setResponseStatus(event, 204);
  return null;
});
