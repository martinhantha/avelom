import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { softDeleteAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  await softDeleteAppointment(
    access.tenant.id,
    getRouterParam(event, "appointmentId"),
    access.actorUserId,
  );

  setResponseStatus(event, 204);
  return null;
});
