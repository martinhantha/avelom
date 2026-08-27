import { getRouterParam, setHeader } from "h3";
import { getActorTeacherProfileId, requireTenantAccess } from "~/server/utils/authz";
import { subscribeAppointmentEvents } from "~/server/utils/appointment-events";

export default defineEventHandler(async (event) => {
  const access = await requireTenantAccess(event, getRouterParam(event, "tenantId"));
  const staffTeacherId =
    access.role === "STAFF"
      ? await getActorTeacherProfileId(access.tenant.id, access.actorUserId)
      : null;

  setHeader(event, "Content-Type", "text/event-stream; charset=utf-8");
  setHeader(event, "Cache-Control", "no-cache, no-transform");
  setHeader(event, "Connection", "keep-alive");
  setHeader(event, "X-Accel-Buffering", "no");

  const encoder = new TextEncoder();
  let ping: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (ping) {
          clearInterval(ping);
          ping = undefined;
        }
        unsubscribe?.();
        unsubscribe = undefined;
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      write("retry: 3000\n\n");
      write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      unsubscribe = subscribeAppointmentEvents(access.tenant.id, (payload) => {
        if (access.role === "STAFF" && (!staffTeacherId || payload.teacherId !== staffTeacherId)) {
          return;
        }
        write(`data: ${JSON.stringify(payload)}\n\n`);
      });
      ping = setInterval(() => write(": ping\n\n"), 20_000);
      event.node.req.on("close", cleanup);
    },
    cancel() {
      if (ping) clearInterval(ping);
      unsubscribe?.();
    },
  });

  return stream;
});
