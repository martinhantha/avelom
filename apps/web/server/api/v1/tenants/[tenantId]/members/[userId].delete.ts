import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { removeTenantMember } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  await removeTenantMember(
    access.tenant.id,
    getRouterParam(event, "userId"),
    access.actorUserId,
  );
  setResponseStatus(event, 204);
  return null;
});
