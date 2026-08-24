import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { getAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  return getAppointment(access.tenant.id, getRouterParam(event, "appointmentId"));
});
