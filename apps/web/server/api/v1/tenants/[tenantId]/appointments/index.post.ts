import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { createAppointment } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = await readBody(event);
  const appointment = await createAppointment(access.tenant.id, body);

  setResponseStatus(event, 201);
  return appointment;
});
