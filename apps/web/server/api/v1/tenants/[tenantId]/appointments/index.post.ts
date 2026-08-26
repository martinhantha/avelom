import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { publishAppointmentCreated } from "~/server/utils/appointment-events";
import { createAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = await readBody(event);
  const appointment = await createAppointment(access.tenant.id, body);

  publishAppointmentCreated({
    type: "appointment.created",
    tenantId: access.tenant.id,
    appointmentId: appointment.id,
    createdByUserId: access.actorUserId,
    title:
      appointment.customer?.displayName ||
      appointment.appointmentContactText ||
      appointment.lessonType?.name ||
      "Neuer Termin",
    startsAt: appointment.startsAt,
    teacherName: appointment.teacher?.displayName ?? null,
  });

  setResponseStatus(event, 201);
  return appointment;
});
