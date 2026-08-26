export interface AppointmentPhone {
  e164: string | null;
  raw: string | null;
  isPrimary: boolean;
}

export interface AppointmentContactSource {
  appointmentContactText?: string | null;
  appointmentPhoneRaw?: string | null;
  appointmentPhoneE164?: string | null;
  customer?: {
    displayName?: string | null;
    phones?: AppointmentPhone[] | null;
  } | null;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function resolveAppointmentDisplayName(appointment: AppointmentContactSource): string {
  return firstNonEmpty(appointment.customer?.displayName, appointment.appointmentContactText) || "Avelom Kontakt";
}

export function resolveAppointmentPhone(appointment: AppointmentContactSource): string | null {
  const phones = appointment.customer?.phones ?? [];
  const primary = phones.find((phone) => phone.isPrimary) ?? phones[0];
  return firstNonEmpty(
    appointment.appointmentPhoneE164,
    appointment.appointmentPhoneRaw,
    primary?.e164,
    primary?.raw,
  );
}

export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
