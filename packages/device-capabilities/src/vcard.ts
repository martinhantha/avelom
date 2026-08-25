import type { ContactWritePayload } from "./types.js";

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function toVCard(payload: ContactWritePayload): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(payload.displayName)}`,
  ];
  if (payload.phoneE164?.trim()) {
    lines.push(`TEL;TYPE=CELL:${escapeVCard(payload.phoneE164.trim())}`);
  }
  if (payload.note?.trim()) {
    lines.push(`NOTE:${escapeVCard(payload.note.trim())}`);
  }
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadVCard(payload: ContactWritePayload): void {
  if (typeof document === "undefined") {
    throw new Error("vCard download is only available in the browser.");
  }
  const blob = new Blob([toVCard(payload)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = payload.displayName.replace(/[^\w\- ]+/g, "").trim() || "kontakt";
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.vcf`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
