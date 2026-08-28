import { getRequestHeader, getRouterParam, readBody } from "h3";
import { throwNotFound } from "~/server/utils/api-errors";
import { requireTenantAccess, staffAppointmentScope } from "~/server/utils/authz";
import { publishAppointmentLive, toAppointmentLiveEvent } from "~/server/utils/appointment-events";
import { getAppointment, patchAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const scope = await staffAppointmentScope(access);
  if (scope.empty) {
    throwNotFound("Termin nicht gefunden");
  }

  const appointmentId = getRouterParam(event, "appointmentId");
  const body = ((await readBody(event)) ?? {}) as Record<string, unknown>;
  const existing = await getAppointment(access.tenant.id, appointmentId);

  if (scope.forceTeacherId && existing.teacher?.id !== scope.forceTeacherId) {
    throwNotFound("Termin nicht gefunden", { appointmentId: existing.id });
  }
  if (scope.forceTeacherId) {
    body.teacherId = scope.forceTeacherId;
  }

  const updated = await patchAppointment(
    access.tenant.id,
    appointmentId,
    body,
    getRequestHeader(event, "if-match"),
  );

  if (existing.startsAt !== updated.startsAt || existing.endsAt !== updated.endsAt) {
    publishAppointmentLive(
      toAppointmentLiveEvent("appointment.moved", access.tenant.id, access.actorUserId, updated, {
        previousStartsAt: existing.startsAt,
      }),
    );
  }

  return updated;
});
