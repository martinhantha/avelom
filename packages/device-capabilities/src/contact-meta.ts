import type { ContactWritePayload } from "./types.js";

export const ALPIPLAN_CONTACT_ORGANIZATION = "Alpiplan";
export const ALPIPLAN_CONTACT_NOTE = "Gespeichert aus der Alpiplan-App";

export function withAlpiplanContactMeta(payload: ContactWritePayload): ContactWritePayload {
  const existing = payload.note?.trim();
  const noteParts = new Set<string>();
  if (existing && existing !== ALPIPLAN_CONTACT_ORGANIZATION && existing !== ALPIPLAN_CONTACT_NOTE) {
    noteParts.add(existing);
  }
  noteParts.add(ALPIPLAN_CONTACT_NOTE);
  return {
    ...payload,
    organization: payload.organization?.trim() || ALPIPLAN_CONTACT_ORGANIZATION,
    note: [...noteParts].join("\n"),
  };
}
