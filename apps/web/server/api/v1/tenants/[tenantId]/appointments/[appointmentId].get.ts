import { getRouterParam } from "h3";
import { throwNotFound } from "~/server/utils/api-errors";
import { requireTenantAccess, staffAppointmentScope } from "~/server/utils/authz";
import { getAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const scope = await staffAppointmentScope(access);
  if (scope.empty) {
    throwNotFound("Termin nicht gefunden");
  }

  const appointment = await getAppointment(
    access.tenant.id,
    getRouterParam(event, "appointmentId"),
  );
  if (scope.forceTeacherId && appointment.teacher?.id !== scope.forceTeacherId) {
    throwNotFound("Termin nicht gefunden", { appointmentId: appointment.id });
  }
  return appointment;
});
