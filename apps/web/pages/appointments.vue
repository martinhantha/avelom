<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { $fetch } from "ofetch";

interface AppointmentListItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "draft" | "confirmed" | "completed" | "cancelled";
  version: number;
  appointmentContactText: string | null;
  teacher: { id: string; displayName: string } | null;
  resource: { id: string; name: string } | null;
  lessonType: { id: string; name: string } | null;
  customer: { id: string; displayName: string } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SchedulingOptions {
  teachers: { id: string; displayName: string }[];
}

const { primaryTenant, teacherLabel, resourcesEnabled } = useAuth();

const appointments = ref<AppointmentListItem[]>([]);
const pagination = ref<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
const options = ref<SchedulingOptions | null>(null);
const loading = ref(false);
const error = ref("");
const savingId = ref("");
const filterOpen = ref(false);
const quickOpen = ref(false);
const assistantOpen = ref(false);
const quickInitialContact = ref("");
const view = ref<"list" | "calendar">("list");
const calendarMode = ref<"week" | "month">("week");
const weekStart = ref<Date>(getMondayOf(new Date()));
const monthAnchor = ref<Date>(firstOfMonth(new Date()));

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function firstOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

const filters = reactive({
  q: "",
  teacherId: "",
  status: "draft,confirmed",
  from: "",
  to: "",
});
const page = ref(1);
const pageSize = ref(25);

const statusOptions = [
  { value: "draft,confirmed", label: "Offen" },
  { value: "draft", label: "Entwurf" },
  { value: "confirmed", label: "Bestätigt" },
  { value: "completed", label: "Erledigt" },
  { value: "cancelled", label: "Storniert" },
  { value: "", label: "Alle" },
];

const canLoad = computed(() => Boolean(primaryTenant.value?.tenantId));

const activeFilterCount = computed(() => {
  let n = 0;
  if (filters.q) n += 1;
  if (filters.teacherId) n += 1;
  if (filters.status !== "draft,confirmed") n += 1;
  if (filters.from) n += 1;
  if (filters.to) n += 1;
  return n;
});

const rangeLabel = computed(() => {
  if (!pagination.value.total) return "0 Termine";
  const start = (pagination.value.page - 1) * pagination.value.pageSize + 1;
  const end = Math.min(pagination.value.page * pagination.value.pageSize, pagination.value.total);
  return `${start}–${end} von ${pagination.value.total}`;
});

function appointmentTitle(appointment: AppointmentListItem) {
  return appointment.customer?.displayName || appointment.appointmentContactText || "Termin ohne Kontakt";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toIsoDateStart(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

function toIsoDateEndExclusive(dateValue: string) {
  const end = new Date(`${dateValue}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

async function loadAppointments() {
  if (!primaryTenant.value?.tenantId) {
    appointments.value = [];
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const isCalendar = view.value === "calendar";
    const range = isCalendar ? calendarRange.value : null;
    const fromIso = range
      ? range.from.toISOString()
      : filters.from
        ? toIsoDateStart(filters.from)
        : undefined;
    const toIso = range
      ? range.to.toISOString()
      : filters.to
        ? toIsoDateEndExclusive(filters.to)
        : undefined;
    const response = await $fetch<{ data: AppointmentListItem[]; pagination: Pagination }>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/appointments`,
      {
        credentials: "include",
        query: {
          q: filters.q || undefined,
          teacherId: filters.teacherId || undefined,
          status: filters.status || undefined,
          from: fromIso,
          to: toIso,
          page: isCalendar ? 1 : page.value,
          pageSize: isCalendar ? 500 : pageSize.value,
          sort: isCalendar ? "asc" : "desc",
        },
      },
    );
    appointments.value = response.data;
    pagination.value = response.pagination;
  } catch (e: unknown) {
    const err = e as { data?: { data?: { message?: string }; message?: string }; statusMessage?: string };
    error.value = err.data?.data?.message || err.data?.message || err.statusMessage || "Termine konnten nicht geladen werden";
  } finally {
    loading.value = false;
  }
}

const calendarRange = computed(() => {
  if (calendarMode.value === "week") {
    return { from: weekStart.value, to: addDays(weekStart.value, 7) };
  }
  const gridStart = getMondayOf(monthAnchor.value);
  return { from: gridStart, to: addDays(gridStart, 42) };
});

const weekDays = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart.value, i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key };
  });
});

const monthGrid = computed(() => {
  const gridStart = getMondayOf(monthAnchor.value);
  const month = monthAnchor.value.getMonth();
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, inMonth: date.getMonth() === month };
  });
});

const weekdayHeaders = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function dateKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function appointmentsByDay(key: string) {
  return appointments.value
    .filter((a) => dateKey(a.startsAt) === key)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function formatDayHeader(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const calendarRangeLabel = computed(() => {
  if (calendarMode.value === "week") {
    const start = weekStart.value;
    const end = addDays(start, 6);
    const fmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  }
  const fmt = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
  return fmt.format(monthAnchor.value);
});

function shiftCalendar(direction: 1 | -1) {
  if (calendarMode.value === "week") {
    weekStart.value = addDays(weekStart.value, direction * 7);
  } else {
    monthAnchor.value = addMonths(monthAnchor.value, direction);
  }
  loadAppointments();
}

function goToToday() {
  const today = new Date();
  weekStart.value = getMondayOf(today);
  monthAnchor.value = firstOfMonth(today);
  loadAppointments();
}

function setCalendarMode(next: "week" | "month") {
  if (calendarMode.value === next) return;
  calendarMode.value = next;
  if (next === "week") {
    weekStart.value = getMondayOf(monthAnchor.value);
  } else {
    monthAnchor.value = firstOfMonth(weekStart.value);
  }
  loadAppointments();
}

function setView(next: "list" | "calendar") {
  if (view.value === next) return;
  view.value = next;
  if (next === "calendar") {
    const today = new Date();
    weekStart.value = getMondayOf(today);
    monthAnchor.value = firstOfMonth(today);
  } else {
    page.value = 1;
  }
  loadAppointments();
}

function isToday(date: Date) {
  const t = new Date();
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  );
}

function statusColor(status: AppointmentListItem["status"]): "primary" | "success" | "warning" | "neutral" {
  switch (status) {
    case "confirmed":
      return "primary";
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    default:
      return "warning";
  }
}

async function loadOptions() {
  if (!primaryTenant.value?.tenantId) return;
  options.value = await $fetch<SchedulingOptions>(
    `/api/v1/tenants/${primaryTenant.value.tenantId}/scheduling/options`,
    { credentials: "include" },
  );
}

function openQuickCapture() {
  quickInitialContact.value = "";
  quickOpen.value = true;
}

function openAssistant() {
  assistantOpen.value = true;
}

function onAssistantContext(text: string) {
  assistantOpen.value = false;
  quickInitialContact.value = text;
  quickOpen.value = true;
}

async function onAppointmentSaved() {
  await loadAppointments();
}

function applyFilters() {
  page.value = 1;
  loadAppointments();
}

function resetFilters() {
  filters.q = "";
  filters.teacherId = "";
  filters.status = "draft,confirmed";
  filters.from = "";
  filters.to = "";
  page.value = 1;
  loadAppointments();
}

async function markCompleted(appointment: AppointmentListItem) {
  if (!primaryTenant.value?.tenantId) return;
  savingId.value = appointment.id;
  error.value = "";
  try {
    await $fetch(`/api/v1/tenants/${primaryTenant.value.tenantId}/appointments/${appointment.id}`, {
      method: "PATCH",
      credentials: "include",
      body: { status: "completed" },
      headers: { "If-Match": String(appointment.version) },
    });
    await loadAppointments();
  } catch (e: unknown) {
    const err = e as { data?: { data?: { message?: string }; message?: string }; statusMessage?: string };
    error.value =
      err.data?.data?.message || err.data?.message || err.statusMessage || "Termin konnte nicht abgehakt werden";
  } finally {
    savingId.value = "";
  }
}

function goToPage(target: number) {
  const next = Math.max(1, Math.min(pagination.value.totalPages, target));
  if (next === page.value) return;
  page.value = next;
  loadAppointments();
}

watch(pageSize, () => {
  page.value = 1;
  loadAppointments();
});

onMounted(async () => {
  await loadOptions();
  await loadAppointments();
});

watch(
  () => primaryTenant.value?.tenantId,
  async () => {
    page.value = 1;
    await loadOptions();
    await loadAppointments();
  },
);
</script>

<template>
  <UContainer class="py-8 space-y-5">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p class="text-sm text-muted font-medium">Avelom · Termine</p>
        <h1 class="text-2xl font-semibold tracking-tight">
          Termine
          <span class="ml-2 text-sm font-normal text-neutral-500">({{ pagination.total }})</span>
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden">
          <button
            type="button"
            class="px-3 py-1.5 text-sm flex items-center gap-1 transition"
            :class="
              view === 'list'
                ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            "
            @click="setView('list')"
          >
            <UIcon name="i-lucide-list" class="size-4" />
            <span>Liste</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm flex items-center gap-1 border-l border-neutral-300 dark:border-neutral-700 transition"
            :class="
              view === 'calendar'
                ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            "
            @click="setView('calendar')"
          >
            <UIcon name="i-lucide-calendar-range" class="size-4" />
            <span>Kalender</span>
          </button>
        </div>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-filter"
          @click="filterOpen = !filterOpen"
        >
          Filter
          <UBadge v-if="activeFilterCount" color="primary" variant="subtle" class="ml-1">
            {{ activeFilterCount }}
          </UBadge>
          <UIcon
            :name="filterOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="ml-1 size-4"
          />
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-message-circle-question"
          @click="openAssistant"
        >
          Assistent
        </UButton>
        <UButton icon="i-lucide-plus" color="primary" @click="openQuickCapture">Neuer Termin</UButton>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="error"
    />

    <UCard v-if="filterOpen">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-medium">Filter</h2>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="filterOpen = false" />
        </div>
      </template>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <UInput v-model="filters.q" placeholder="Suche Kunde oder Kontakttext" />
        <select
          v-model="filters.teacherId"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option value="">Alle {{ teacherLabel }}</option>
          <option v-for="teacher in options?.teachers || []" :key="teacher.id" :value="teacher.id">
            {{ teacher.displayName }}
          </option>
        </select>
        <select
          v-model="filters.status"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option v-for="status in statusOptions" :key="status.label" :value="status.value">
            {{ status.label }}
          </option>
        </select>
        <UInput v-model="filters.from" type="date" />
        <UInput v-model="filters.to" type="date" />
      </div>

      <template #footer>
        <div class="flex gap-2">
          <UButton :disabled="!canLoad" :loading="loading" icon="i-lucide-search" @click="applyFilters">
            Anwenden
          </UButton>
          <UButton variant="ghost" color="neutral" @click="resetFilters">
            Zurücksetzen
          </UButton>
        </div>
      </template>
    </UCard>

    <template v-if="view === 'list'">
      <div class="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-400">
        <span>{{ rangeLabel }}</span>
        <div class="flex items-center gap-2">
          <span>Pro Seite</span>
          <select
            v-model.number="pageSize"
            class="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>

      <div v-if="!primaryTenant" class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-600 dark:text-neutral-400">
        Für Termine brauchst du eine Mandanten-Mitgliedschaft.
      </div>
      <div v-else-if="!appointments.length && !loading" class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-600 dark:text-neutral-400">
        Keine Termine passend zu den Filtern.
      </div>
      <div v-else class="space-y-3">
        <UCard v-for="appointment in appointments" :key="appointment.id">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ appointmentTitle(appointment) }}</p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ formatDateTime(appointment.startsAt) }}–{{ formatDateTime(appointment.endsAt).split(', ').pop() }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="statusColor(appointment.status)" variant="subtle">{{ appointment.status }}</UBadge>
              <UButton
                v-if="appointment.status !== 'completed' && appointment.status !== 'cancelled'"
                size="sm"
                color="success"
                variant="soft"
                icon="i-lucide-check"
                :loading="savingId === appointment.id"
                @click="markCompleted(appointment)"
              >
               Erledigt
              </UButton>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span v-if="appointment.teacher">{{ teacherLabel }}: {{ appointment.teacher.displayName }}</span>
            <span v-if="resourcesEnabled && appointment.resource">Ressource: {{ appointment.resource.name }}</span>
            <span v-if="appointment.lessonType">Art: {{ appointment.lessonType.name }}</span>
          </div>
        </UCard>
      </div>

      <div
        v-if="pagination.totalPages > 1"
        class="flex items-center justify-between gap-3 pt-2"
      >
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-left"
          :disabled="pagination.page <= 1 || loading"
          @click="goToPage(pagination.page - 1)"
        >
          Zurück
        </UButton>
        <span class="text-sm text-neutral-600 dark:text-neutral-400">
          Seite {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          trailing-icon="i-lucide-chevron-right"
          :disabled="pagination.page >= pagination.totalPages || loading"
          @click="goToPage(pagination.page + 1)"
        >
          Weiter
        </UButton>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden">
            <button
              type="button"
              class="px-3 py-1.5 text-sm transition"
              :class="
                calendarMode === 'week'
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              "
              @click="setCalendarMode('week')"
            >
              Woche
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm border-l border-neutral-300 dark:border-neutral-700 transition"
              :class="
                calendarMode === 'month'
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              "
              @click="setCalendarMode('month')"
            >
              Monat
            </button>
          </div>
          <div class="flex items-center gap-1">
            <UButton size="sm" variant="outline" color="neutral" icon="i-lucide-chevron-left" @click="shiftCalendar(-1)" />
            <UButton size="sm" variant="ghost" color="neutral" @click="goToToday">Heute</UButton>
            <UButton size="sm" variant="outline" color="neutral" icon="i-lucide-chevron-right" @click="shiftCalendar(1)" />
          </div>
        </div>
        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200 capitalize">
          {{ calendarRangeLabel }}
        </span>
      </div>

      <div v-if="!primaryTenant" class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-600 dark:text-neutral-400">
        Für Termine brauchst du eine Mandanten-Mitgliedschaft.
      </div>

      <div v-else-if="calendarMode === 'week'" class="grid grid-cols-1 md:grid-cols-7 gap-2">
        <div
          v-for="day in weekDays"
          :key="day.key"
          class="rounded-lg border bg-white dark:bg-neutral-950 min-h-[140px] p-2 flex flex-col gap-2"
          :class="
            isToday(day.date)
              ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-900/40'
              : 'border-neutral-200 dark:border-neutral-800'
          "
        >
          <div class="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {{ formatDayHeader(day.date) }}
          </div>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="appointment in appointmentsByDay(day.key)"
              :key="appointment.id"
              class="rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 text-xs leading-tight bg-neutral-50 dark:bg-neutral-900"
            >
              <div class="flex items-center justify-between gap-1">
                <span class="font-medium tabular-nums">{{ formatTime(appointment.startsAt) }}</span>
                <UBadge :color="statusColor(appointment.status)" variant="subtle" size="xs">
                  {{ appointment.status }}
                </UBadge>
              </div>
              <p class="mt-0.5 truncate font-medium">{{ appointmentTitle(appointment) }}</p>
              <p v-if="appointment.teacher" class="truncate text-neutral-500">
                {{ appointment.teacher.displayName }}
              </p>
              <div
                v-if="appointment.status !== 'completed' && appointment.status !== 'cancelled'"
                class="mt-1"
              >
                <UButton
                  size="xs"
                  color="success"
                  variant="ghost"
                  icon="i-lucide-check"
                  :loading="savingId === appointment.id"
                  @click="markCompleted(appointment)"
                >
                  Erledigt
                </UButton>
              </div>
            </div>
            <p
              v-if="!appointmentsByDay(day.key).length"
              class="text-xs text-neutral-400 italic"
            >
              Keine Termine
            </p>
          </div>
        </div>
      </div>

      <div v-else class="space-y-1">
        <div class="hidden md:grid grid-cols-7 gap-1 px-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <div v-for="header in weekdayHeaders" :key="header" class="px-2 py-1">{{ header }}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-7 gap-1">
          <div
            v-for="day in monthGrid"
            :key="day.key"
            class="rounded-md border min-h-[110px] p-1.5 flex flex-col gap-1 transition"
            :class="[
              day.inMonth
                ? 'bg-white dark:bg-neutral-950'
                : 'bg-neutral-50 dark:bg-neutral-900/50 text-neutral-400',
              isToday(day.date)
                ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-900/40'
                : 'border-neutral-200 dark:border-neutral-800',
            ]"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="md:hidden text-neutral-500">{{ weekdayHeaders[(day.date.getDay() + 6) % 7] }}</span>
              <span
                class="font-medium tabular-nums"
                :class="isToday(day.date) ? 'text-primary-700 dark:text-primary-200' : ''"
              >
                {{ day.date.getDate() }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <div
                v-for="appointment in appointmentsByDay(day.key).slice(0, 3)"
                :key="appointment.id"
                class="rounded px-1.5 py-0.5 text-[11px] leading-tight border truncate"
                :class="{
                  'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-100':
                    appointment.status === 'confirmed',
                  'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100':
                    appointment.status === 'completed',
                  'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100':
                    appointment.status === 'draft',
                  'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 line-through':
                    appointment.status === 'cancelled',
                }"
                :title="`${formatTime(appointment.startsAt)} ${appointmentTitle(appointment)}`"
              >
                <span class="font-medium tabular-nums">{{ formatTime(appointment.startsAt) }}</span>
                <span class="ml-1">{{ appointmentTitle(appointment) }}</span>
              </div>
              <button
                v-if="appointmentsByDay(day.key).length > 3"
                type="button"
                class="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 text-left"
                @click="
                  () => {
                    weekStart = getMondayOf(day.date);
                    setCalendarMode('week');
                  }
                "
              >
                + {{ appointmentsByDay(day.key).length - 3 }} weitere
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <UModal v-model:open="quickOpen" :ui="{ content: 'max-w-2xl' }">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="min-w-0">
            <h2 class="font-medium">Neuer Termin · Schnellerfassung</h2>
            <p class="text-xs text-neutral-500">
              Kontakt erfassen, {{ teacherLabel }}<template v-if="resourcesEnabled">/Ressource</template> zuordnen, speichern.
            </p>
          </div>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="quickOpen = false" />
        </div>
      </template>
      <template #body>
        <QuickCaptureForm
          :key="quickInitialContact || 'empty'"
          :initial-contact-text="quickInitialContact"
          @saved="onAppointmentSaved"
          @cancel="quickOpen = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="assistantOpen" :ui="{ content: 'max-w-xl' }">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="min-w-0">
            <h2 class="font-medium">Assistent · Gegenfragen</h2>
            <p class="text-xs text-neutral-500">Kontext klären, dann in den Termin übernehmen.</p>
          </div>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="assistantOpen = false" />
        </div>
      </template>
      <template #body>
        <AssistantPanel @close="assistantOpen = false" @picked-context="onAssistantContext" />
      </template>
    </UModal>
  </UContainer>
</template>
