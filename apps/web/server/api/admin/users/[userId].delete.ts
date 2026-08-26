import { getRouterParam, setResponseStatus } from "h3";
import { requireSuperadmin } from "~/server/utils/authz";
import { softDeleteUser } from "~/server/utils/members";

export default defineEventHandler(async (event) => {
  const session = await requireSuperadmin(event);
  await softDeleteUser(getRouterParam(event, "userId") ?? "", {
    id: session.user.id,
    isSuperadmin: true,
  });
  setResponseStatus(event, 204);
  return null;
});
