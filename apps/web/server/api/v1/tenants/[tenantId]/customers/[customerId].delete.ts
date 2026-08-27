import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { softDeleteCustomer } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  await softDeleteCustomer(access.tenant.id, getRouterParam(event, "customerId"), access.actorUserId);

  setResponseStatus(event, 204);
  return null;
});
