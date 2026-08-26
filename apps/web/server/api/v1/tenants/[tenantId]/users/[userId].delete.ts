import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { softDeleteUser } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  await softDeleteUser(
    getRouterParam(event, "userId") ?? "",
    { id: access.actorUserId, isSuperadmin: access.session.user.isSuperadmin },
    access.tenant.id,
  );
  setResponseStatus(event, 204);
  return null;
});
