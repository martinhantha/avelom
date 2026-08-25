export interface AppointmentPhone {
  e164: string | null;
  raw: string | null;
  isPrimary: boolean;
}

export interface AppointmentContactSource {
  appointmentPhoneRaw?: string | null;
  appointmentPhoneE164?: string | null;
  customer?: {
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

export function toWhatsAppHref(phone: string): string {
  let digits = phone.trim();
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `43${digits.slice(1)}`;
  }
  return `https://wa.me/${digits}`;
}
