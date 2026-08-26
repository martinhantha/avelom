import type { AppointmentCreatedLiveEvent } from "~/types/live-events";

type Listener = (event: AppointmentCreatedLiveEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function publishAppointmentCreated(event: AppointmentCreatedLiveEvent) {
  const tenantListeners = listeners.get(event.tenantId);
  if (!tenantListeners?.size) return;
  for (const listener of tenantListeners) {
    try {
      listener(event);
    } catch {
      // A broken subscriber must not block the others.
    }
  }
}

export function subscribeAppointmentEvents(tenantId: string, listener: Listener): () => void {
  let tenantListeners = listeners.get(tenantId);
  if (!tenantListeners) {
    tenantListeners = new Set();
    listeners.set(tenantId, tenantListeners);
  }
  tenantListeners.add(listener);
  return () => {
    tenantListeners.delete(listener);
    if (!tenantListeners.size) {
      listeners.delete(tenantId);
    }
  };
}
