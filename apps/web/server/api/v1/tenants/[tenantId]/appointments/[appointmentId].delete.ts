import { getRouterParam, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { publishAppointmentLive, toAppointmentLiveEvent } from "~/server/utils/appointment-events";
import { getAppointment, softDeleteAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const appointmentId = getRouterParam(event, "appointmentId");
  const existing = await getAppointment(access.tenant.id, appointmentId);

  await softDeleteAppointment(access.tenant.id, appointmentId, access.actorUserId);

  publishAppointmentLive(
    toAppointmentLiveEvent("appointment.deleted", access.tenant.id, access.actorUserId, existing),
  );

  setResponseStatus(event, 204);
  return null;
});
