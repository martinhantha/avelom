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

export function formatAppointmentTeachers(appointment: {
  teachers?: Array<{ displayName: string }> | null;
  teacher?: { displayName: string } | null;
}): string {
  const names = (appointment.teachers ?? []).map((item) => item.displayName).filter(Boolean);
  if (names.length) return names.join(", ");
  return appointment.teacher?.displayName ?? "";
}

export function isAssignedTeacher(
  appointment: {
    teachers?: Array<{ id: string }> | null;
    teacher?: { id: string } | null;
  },
  teacherId: string | null | undefined,
): boolean {
  if (!teacherId) return false;
  if (appointment.teachers?.some((item) => item.id === teacherId)) return true;
  return appointment.teacher?.id === teacherId;
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
