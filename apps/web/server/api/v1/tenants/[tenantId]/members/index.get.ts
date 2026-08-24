import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { listTenantMembers } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  return listTenantMembers(access.tenant.id);
});
