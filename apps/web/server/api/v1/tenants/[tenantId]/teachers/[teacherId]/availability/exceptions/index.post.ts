import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { createAvailabilityException } from "~/server/utils/scheduling";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const body = await readBody(event);
  const exception = await createAvailabilityException(
    access.tenant.id,
    getRouterParam(event, "teacherId"),
    body,
  );

  setResponseStatus(event, 201);
  return exception;
});
