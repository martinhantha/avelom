import { getRequestHeader, getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { patchCustomer } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = await readBody(event);

  return patchCustomer(
    access.tenant.id,
    getRouterParam(event, "customerId"),
    body,
    getRequestHeader(event, "if-match"),
  );
});
