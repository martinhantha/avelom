import { getQuery, getRouterParam } from "h3";
import { requireTenantAccess, staffAppointmentScope } from "~/server/utils/authz";
import { getSchedulingOptions } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const query = getQuery(event);
  const options = await getSchedulingOptions(access.tenant.id, {
    q: typeof query.q === "string" ? query.q : undefined,
  });
  const scope = await staffAppointmentScope(access);
  if (scope.forceTeacherId) {
    options.teachers = options.teachers.filter((teacher) => teacher.id === scope.forceTeacherId);
    options.defaultTeacherId = scope.forceTeacherId;
  }
  return options;
});
