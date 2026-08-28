export const APPOINTMENT_LIVE_EVENT = "avelom:appointment-live";
/** @deprecated Use APPOINTMENT_LIVE_EVENT */
export const APPOINTMENT_CREATED_EVENT = APPOINTMENT_LIVE_EVENT;

export type AppointmentLiveEventType =
  | "appointment.created"
  | "appointment.moved"
  | "appointment.deleted";

export interface AppointmentLiveEvent {
  type: AppointmentLiveEventType;
  tenantId: string;
  appointmentId: string;
  actorUserId: string;
  createdByUserId: string | null;
  teacherUserId: string | null;
  title: string;
  startsAt: string;
  previousStartsAt?: string | null;
  teacherName: string | null;
  teacherId: string | null;
}

export type AppointmentCreatedLiveEvent = AppointmentLiveEvent;
