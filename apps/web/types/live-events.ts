export const APPOINTMENT_CREATED_EVENT = "avelom:appointment-created";

export interface AppointmentCreatedLiveEvent {
  type: "appointment.created";
  tenantId: string;
  appointmentId: string;
  createdByUserId: string;
  title: string;
  startsAt: string;
  teacherName: string | null;
}
