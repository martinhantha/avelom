import { getRouterParam } from "h3";
import { requireTenantAccess } from "~/server/utils/authz";
import { publishAppointmentLive, toAppointmentLiveEvent } from "~/server/utils/appointment-events";
import { restoreTrashItem } from "~/server/utils/trash";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"), ["ADMIN"]);
  const restored = await restoreTrashItem(
    access.tenant.id,
    getRouterParam(event, "kind"),
    getRouterParam(event, "id"),
  );

  if (restored.kind === "appointment") {
    publishAppointmentLive(
      await toAppointmentLiveEvent(
        "appointment.created",
        access.tenant.id,
        access.actorUserId,
        restored.data,
      ),
    );
  }

  return restored;
});
