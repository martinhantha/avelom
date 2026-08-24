import { getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { updateTenantMember } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);
  return updateTenantMember(access.tenant.id, getRouterParam(event, "userId"), body);
});
