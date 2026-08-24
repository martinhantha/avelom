import { getRouterParam, readBody, setResponseStatus } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { addTenantMember } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const body = await readBody(event);
  const member = await addTenantMember(access.tenant.id, body);
  setResponseStatus(event, 201);
  return member;
});
