import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { publishAppointmentLive, toAppointmentLiveEvent } from "~/server/utils/appointment-events";
import { createAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);
  const appointment = await createAppointment(access.tenant.id, body);

  publishAppointmentLive(
    toAppointmentLiveEvent("appointment.created", access.tenant.id, access.actorUserId, appointment),
  );

  setResponseStatus(event, 201);
  return appointment;
});
