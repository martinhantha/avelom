export interface AssistantDraft {
  contactText: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  teacherId?: string;
  resourceId?: string;
  lessonTypeId?: string;
  customerId?: string;
  customerName?: string;
  createCustomer?: boolean;
  phone?: string;
  note?: string;
}

export interface ClarifyingOption {
  value: string;
  label: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  options: ClarifyingOption[];
}

export interface ParsedAppointmentIntent {
  date?: string;
  time?: string;
  durationMinutes?: number;
  teacherId?: string;
  teacherName?: string;
  resourceId?: string;
  resourceName?: string;
  lessonTypeId?: string;
  lessonTypeName?: string;
  customerId?: string;
  customerName?: string;
  createCustomer?: boolean;
  phone?: string;
  note?: string;
  contactText?: string;
}

export interface ParseIntentResponse {
  parsed: ParsedAppointmentIntent;
  fieldConfidence: Record<string, number>;
  clarifyingQuestions: ClarifyingQuestion[];
  suggestedDefaults: Record<string, unknown>;
}
