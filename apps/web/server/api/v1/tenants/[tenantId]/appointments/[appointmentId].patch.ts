import { getRequestHeader, getRouterParam, readBody } from "h3";
import { throwNotFound } from "~/server/utils/api-errors";
import { requireTenantAccess, staffAppointmentScope } from "~/server/utils/authz";
import { getAppointment, patchAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const scope = await staffAppointmentScope(access);
  if (scope.empty) {
    throwNotFound("Termin nicht gefunden");
  }

  const appointmentId = getRouterParam(event, "appointmentId");
  const body = ((await readBody(event)) ?? {}) as Record<string, unknown>;

  if (scope.forceTeacherId) {
    const existing = await getAppointment(access.tenant.id, appointmentId);
    if (existing.teacher?.id !== scope.forceTeacherId) {
      throwNotFound("Termin nicht gefunden", { appointmentId: existing.id });
    }
    body.teacherId = scope.forceTeacherId;
  }

  return patchAppointment(
    access.tenant.id,
    appointmentId,
    body,
    getRequestHeader(event, "if-match"),
  );
});
