import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { listLessonTypes } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  return listLessonTypes(access.tenant.id);
});
