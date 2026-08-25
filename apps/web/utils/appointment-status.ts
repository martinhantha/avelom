export type AppointmentStatus = "draft" | "confirmed" | "completed" | "cancelled";

export function appointmentStatusLabel(status: string): string | null {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "completed":
      return "Erledigt";
    case "cancelled":
      return "Storniert";
    default:
      return null;
  }
}

export function appointmentStatusColor(
  status: string,
): "primary" | "success" | "warning" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    case "draft":
      return "warning";
    default:
      return "primary";
  }
}
