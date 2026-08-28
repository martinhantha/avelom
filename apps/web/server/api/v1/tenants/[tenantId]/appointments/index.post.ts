import { getRouterParam, readBody, setResponseStatus } from "h3";
import { throwApiError } from "~/server/utils/api-errors";
import { requireTenantAccess, staffAppointmentScope } from "~/server/utils/authz";
import { publishAppointmentLive, toAppointmentLiveEvent } from "~/server/utils/appointment-events";
import { createAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const scope = await staffAppointmentScope(access);
  if (scope.empty) {
    throwApiError(403, "FORBIDDEN", "Kein Lehrerprofil – eigene Termine können nicht angelegt werden");
  }

  const body = ((await readBody(event)) ?? {}) as Record<string, unknown>;
  if (scope.forceTeacherId) {
    body.teacherId = scope.forceTeacherId;
  }

  const appointment = await createAppointment(access.tenant.id, body, access.actorUserId);

  publishAppointmentLive(
    await toAppointmentLiveEvent("appointment.created", access.tenant.id, access.actorUserId, appointment),
  );

  setResponseStatus(event, 201);
  return appointment;
});
