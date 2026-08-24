import { getRouterParam, readBody } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { patchLessonType } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);
  return patchLessonType(access.tenant.id, getRouterParam(event, "lessonTypeId"), body);
});
