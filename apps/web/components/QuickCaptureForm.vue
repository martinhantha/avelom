<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { $fetch } from "ofetch";
import { useAuth } from "../composables/useAuth";

type WebSpeechRecognitionEventResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type WebSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<WebSpeechRecognitionEventResult>;
};
type WebSpeechRecognitionErrorEvent = { error?: string; message?: string };
interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type WebSpeechCtor = new () => WebSpeechRecognition;

interface TeacherOption {
  id: string;
  displayName: string;
}
interface ResourceOption {
  id: string;
  name: string;
  capacity: number;
}
interface LessonTypeOption {
  id: string;
  name: string;
  defaultDurationMin: number | null;
}
interface CustomerOption {
  id: string;
  displayName: string;
}
interface SchedulingOptions {
  teachers: TeacherOption[];
  resources: ResourceOption[];
  lessonTypes: LessonTypeOption[];
  customers: CustomerOption[];
  defaultTeacherId: string | null;
  defaultLessonTypeId: string | null;
  teacherLabel: string;
  resourcesEnabled: boolean;
  businessTimeZone: string;
}
interface AppointmentDto {
  id: string;
  startsAt: string;
  endsAt: string;
  appointmentContactText: string | null;
  teacher: TeacherOption | null;
  resource: ResourceOption | null;
  lessonType: LessonTypeOption | null;
  customer: CustomerOption | null;
}

const props = defineProps<{
  initialContactText?: string;
  initialTeacherId?: string;
  initialLessonTypeId?: string;
}>();

const emit = defineEmits<{
  saved: [appointment: AppointmentDto];
  cancel: [];
}>();

const { primaryTenant } = useAuth();

const teacherLabel = computed(
  () => options.value?.teacherLabel || primaryTenant.value?.teacherLabel || "Lehrer",
);
const resourcesEnabled = computed(
  () => options.value?.resourcesEnabled ?? primaryTenant.value?.resourcesEnabled ?? true,
);

const text = ref(props.initialContactText ?? "");
const options = ref<SchedulingOptions | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const conflictType = ref("");
const saved = ref<AppointmentDto | null>(null);
const initialStart = nextFullHour();

const speechSupported = ref(false);
const speechListening = ref(false);
const speechInterim = ref("");
const speechError = ref("");
let recognition: WebSpeechRecognition | null = null;
let speechTextBase = "";

function getSpeechCtor(): WebSpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechCtor;
    webkitSpeechRecognition?: WebSpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function setupSpeech() {
  const Ctor = getSpeechCtor();
  if (!Ctor) {
    speechSupported.value = false;
    return;
  }
  speechSupported.value = true;
  recognition = new Ctor();
  recognition.lang = "de-DE";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let finalChunk = "";
    let interimChunk = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalChunk += transcript;
      } else {
        interimChunk += transcript;
      }
    }
    if (finalChunk) {
      speechTextBase = (speechTextBase ? `${speechTextBase} ` : "") + finalChunk.trim();
      text.value = speechTextBase;
      speechInterim.value = "";
    } else {
      speechInterim.value = interimChunk;
      text.value = speechTextBase
        ? `${speechTextBase} ${interimChunk}`.trim()
        : interimChunk;
    }
  };
  recognition.onerror = (event) => {
    speechError.value =
      event.error === "not-allowed"
        ? "Mikrofon-Zugriff verweigert – bitte im Browser erlauben."
        : event.error === "no-speech"
          ? "Keine Sprache erkannt."
          : event.message || event.error || "Sprachaufnahme fehlgeschlagen.";
  };
  recognition.onend = () => {
    speechListening.value = false;
    speechInterim.value = "";
  };
}

function toggleSpeech() {
  if (!recognition) return;
  speechError.value = "";
  if (speechListening.value) {
    recognition.stop();
    return;
  }
  speechTextBase = text.value.trim();
  speechInterim.value = "";
  try {
    recognition.start();
    speechListening.value = true;
  } catch (e) {
    const err = e as { message?: string };
    speechError.value = err.message || "Sprachaufnahme konnte nicht gestartet werden.";
    speechListening.value = false;
  }
}

onBeforeUnmount(() => {
  if (recognition && speechListening.value) {
    try {
      recognition.abort();
    } catch {
      // ignore
    }
  }
});

const form = reactive({
  date: toDateInput(initialStart),
  time: toTimeInput(initialStart),
  durationMinutes: 60,
  teacherId: props.initialTeacherId ?? "",
  resourceId: "",
  lessonTypeId: props.initialLessonTypeId ?? "",
  customerId: "",
  phone: "",
  note: "",
});

const durationOptions = [30, 45, 60, 90, 120];
const useTypeDuration = computed(() => primaryTenant.value?.useDefaultDuration ?? true);

const selectedLessonType = computed(() =>
  options.value?.lessonTypes.find((item) => item.id === form.lessonTypeId) ?? null,
);

const effectiveDuration = computed(() => {
  if (useTypeDuration.value) {
    return selectedLessonType.value?.defaultDurationMin ?? 60;
  }
  return form.durationMinutes;
});

const canSave = computed(() => Boolean(primaryTenant.value && form.date && form.time && text.value.trim()));

function nextFullHour() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function apiErrorMessage(e: unknown) {
  const err = e as {
    data?: { message?: string; statusMessage?: string; data?: { message?: string; details?: Record<string, unknown> } };
    statusMessage?: string;
  };
  const details = err.data?.data?.details;
  conflictType.value = typeof details?.conflictType === "string" ? details.conflictType : "";
  return (
    err.data?.data?.message ||
    err.data?.message ||
    err.data?.statusMessage ||
    err.statusMessage ||
    "Aktion fehlgeschlagen"
  );
}

async function loadOptions() {
  if (!primaryTenant.value) return;
  loading.value = true;
  error.value = "";
  try {
    options.value = await $fetch<SchedulingOptions>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/scheduling/options`,
      { credentials: "include" },
    );
    if (!form.teacherId) {
      const preferred = options.value.defaultTeacherId;
      form.teacherId =
        preferred && options.value.teachers.some((teacher) => teacher.id === preferred)
          ? preferred
          : (options.value.teachers[0]?.id ?? "");
    }
    if (resourcesEnabled.value) {
      form.resourceId ||= options.value.resources[0]?.id ?? "";
    } else {
      form.resourceId = "";
    }
    if (!form.lessonTypeId) {
      const preferred = options.value.defaultLessonTypeId;
      form.lessonTypeId =
        preferred && options.value.lessonTypes.some((lessonType) => lessonType.id === preferred)
          ? preferred
          : (options.value.lessonTypes[0]?.id ?? "");
    }
  } catch (e: unknown) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => form.lessonTypeId,
  (lessonTypeId) => {
    if (!useTypeDuration.value) {
      const lessonType = options.value?.lessonTypes.find((item) => item.id === lessonTypeId);
      if (lessonType?.defaultDurationMin) {
        form.durationMinutes = lessonType.defaultDurationMin;
      }
    }
  },
);

watch(
  () => primaryTenant.value?.tenantId,
  () => {
    loadOptions();
  },
);

async function saveAppointment() {
  if (!primaryTenant.value || !canSave.value) return;

  const startsAt = localDateTime(form.date, form.time);
  const endsAt = new Date(startsAt.getTime() + effectiveDuration.value * 60_000);
  saving.value = true;
  error.value = "";
  conflictType.value = "";
  saved.value = null;

  try {
    const result = await $fetch<AppointmentDto>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/appointments`,
      {
        method: "POST",
        credentials: "include",
        body: {
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status: "confirmed",
          lessonTypeId: form.lessonTypeId || undefined,
          teacherId: form.teacherId || undefined,
          resourceId: resourcesEnabled.value ? form.resourceId || undefined : undefined,
          customerId: form.customerId || undefined,
          appointmentContactText: text.value,
          appointmentPhoneRaw: form.phone || undefined,
          unstructuredNote: form.note || undefined,
        },
      },
    );
    saved.value = result;
    emit("saved", result);
  } catch (e: unknown) {
    error.value = apiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  setupSpeech();
  loadOptions();
});
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="!primaryTenant"
      color="warning"
      variant="soft"
      title="Kein Mandant verfügbar"
      description="Für echte Termine brauchst du eine aktive Mandanten-Mitgliedschaft."
    />

    <UAlert
      v-if="saved"
      color="success"
      variant="soft"
      icon="i-lucide-circle-check"
      title="Termin gespeichert"
      :description="`${formatDateTime(saved.startsAt)} · ${saved.appointmentContactText || 'ohne Kontakttext'}`"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Termin konnte nicht gespeichert werden"
      :description="conflictType ? `${error} (${conflictType})` : error"
    />

    <UFormField
      label="Kontakt oder Notiz"
      required
      :hint="speechSupported ? 'Mikrofon nutzen für Diktat (de-DE)' : undefined"
    >
      <div class="relative">
        <UTextarea
          v-model="text"
          autoresize
          :rows="3"
          :placeholder="`z. B. Morgen 14 Uhr Stunde mit Luis und ${teacherLabel} Martin`"
          class="w-full pr-12"
        />
        <UButton
          v-if="speechSupported"
          type="button"
          size="sm"
          :color="speechListening ? 'error' : 'primary'"
          :variant="speechListening ? 'solid' : 'soft'"
          :icon="speechListening ? 'i-lucide-mic-off' : 'i-lucide-mic'"
          :title="speechListening ? 'Aufnahme stoppen' : 'Sprachaufnahme starten'"
          class="absolute top-1.5 right-1.5"
          @click="toggleSpeech"
        />
      </div>
      <template v-if="speechListening" #help>
        <span class="flex items-center gap-2 text-xs text-primary-700 dark:text-primary-300">
          <span class="inline-block size-2 rounded-full bg-red-500 animate-pulse" />
          Aufnahme läuft…
          <span v-if="speechInterim" class="italic text-neutral-500 truncate">„{{ speechInterim }}"</span>
        </span>
      </template>
    </UFormField>
    <UAlert
      v-if="speechError"
      color="warning"
      variant="subtle"
      icon="i-lucide-mic-off"
      :title="speechError"
      :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link' }"
      @close="speechError = ''"
    />
    <UAlert
      v-if="!speechSupported"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="Sprachassistent nicht verfügbar"
      description="Dieser Browser unterstützt die Web-Speech-API nicht. In Chrome/Edge (Desktop, Android) oder Safari (iOS 14+) funktioniert die Diktierfunktion."
    />

    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Datum">
        <UInput v-model="form.date" type="date" />
      </UFormField>
      <UFormField label="Start">
        <UInput v-model="form.time" type="time" />
      </UFormField>
    </div>

    <div v-if="!useTypeDuration" class="space-y-2">
      <span class="text-sm font-medium">Dauer</span>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="minutes in durationOptions"
          :key="minutes"
          size="sm"
          :variant="form.durationMinutes === minutes ? 'solid' : 'soft'"
          color="primary"
          @click="form.durationMinutes = minutes"
        >
          {{ minutes }} Min
        </UButton>
      </div>
    </div>
    <div
      v-else
      class="rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
    >
      <UIcon name="i-lucide-clock" class="size-4" />
      <span>
        Dauer aus Terminart:
        <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ effectiveDuration }} Min</span>
        <span v-if="!selectedLessonType?.defaultDurationMin" class="ml-1 text-xs">(Standard 60 Min)</span>
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="teacherLabel">
        <select
          v-model="form.teacherId"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">Ohne {{ teacherLabel }}</option>
          <option v-for="teacher in options?.teachers || []" :key="teacher.id" :value="teacher.id">
            {{ teacher.displayName }}
          </option>
        </select>
      </UFormField>

      <UFormField v-if="resourcesEnabled" label="Ressource">
        <select
          v-model="form.resourceId"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">Ohne Ressource</option>
          <option v-for="resource in options?.resources || []" :key="resource.id" :value="resource.id">
            {{ resource.name }} · Kapazität {{ resource.capacity }}
          </option>
        </select>
      </UFormField>

      <UFormField label="Terminart">
        <select
          v-model="form.lessonTypeId"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">Ohne Terminart</option>
          <option v-for="lessonType in options?.lessonTypes || []" :key="lessonType.id" :value="lessonType.id">
            {{ lessonType.name }}
          </option>
        </select>
      </UFormField>

      <UFormField label="Kunde (optional)">
        <select
          v-model="form.customerId"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">Nur freien Kontakttext speichern</option>
          <option v-for="customer in options?.customers || []" :key="customer.id" :value="customer.id">
            {{ customer.displayName }}
          </option>
        </select>
      </UFormField>

      <UFormField label="Telefon (optional)" class="sm:col-span-2">
        <UInput v-model="form.phone" type="tel" placeholder="+43 ..." />
      </UFormField>
    </div>

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <UButton variant="ghost" color="neutral" @click="emit('cancel')">Schließen</UButton>
      <UButton
        color="primary"
        icon="i-lucide-save"
        :disabled="!canSave || loading"
        :loading="saving"
        @click="saveAppointment"
      >
        Übernehmen &amp; speichern
      </UButton>
    </div>
  </div>
</template>
