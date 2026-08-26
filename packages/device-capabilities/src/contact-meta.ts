import type { ContactWritePayload } from "./types.js";

export const AVELOM_CONTACT_ORGANIZATION = "Avelom";
export const AVELOM_CONTACT_NOTE = "Gespeichert aus der Avelom-App";

export function withAvelomContactMeta(payload: ContactWritePayload): ContactWritePayload {
  const existing = payload.note?.trim();
  const noteParts = new Set<string>();
  if (existing && existing !== AVELOM_CONTACT_ORGANIZATION && existing !== AVELOM_CONTACT_NOTE) {
    noteParts.add(existing);
  }
  noteParts.add(AVELOM_CONTACT_NOTE);
  return {
    ...payload,
    organization: payload.organization?.trim() || AVELOM_CONTACT_ORGANIZATION,
    note: [...noteParts].join("\n"),
  };
}
