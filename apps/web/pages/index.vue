<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { $fetch } from "ofetch";
import { useAuth } from "../composables/useAuth";
import type { SuperadminOverview, TenantRole } from "../types/superadmin";

interface AppointmentListItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  appointmentContactText: string | null;
  teacher: { id: string; displayName: string } | null;
  resource: { id: string; name: string } | null;
  lessonType: { id: string; name: string } | null;
  customer: { id: string; displayName: string } | null;
}

const { user, primaryTenant, teacherLabel, resourcesEnabled } = useAuth();
const isSuperadmin = computed(() => Boolean(user.value?.isSuperadmin));

const overview = ref<SuperadminOverview | null>(null);
const saLoading = ref(false);
const saError = ref("");
const saInfo = ref("");
const appointments = ref<AppointmentListItem[]>([]);
const appointmentsLoading = ref(false);
const appointmentsError = ref("");
const selectedDateKey = ref("");
const assistantOpen = ref(false);
const quickOpen = ref(false);
const quickInitialContact = ref("");

const tenantForm = reactive({ name: "", slug: "" });
const userForm = reactive({
  email: "",
  name: "",
  password: "",
  isSuperadmin: false,
  tenantId: "",
  role: "ADMIN" as TenantRole,
});
const membershipForm = reactive({
  userId: "",
  tenantId: "",
  role: "STAFF" as TenantRole,
});
const userEditForm = reactive({
  userId: "",
  name: "",
  password: "",
  isSuperadmin: false,
});

const roleOptions: TenantRole[] = ["ADMIN", "STAFF", "END_CUSTOMER"];

function setInfo(msg: string) {
  saInfo.value = msg;
  saError.value = "";
}

function setError(msg: string) {
  saError.value = msg;
  saInfo.value = "";
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

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyFromIso(value: string) {
  return toDateKey(new Date(value));
}

function appointmentTitle(appointment: AppointmentListItem) {
  return appointment.customer?.displayName || appointment.appointmentContactText || "Termin ohne Kontakt";
}

const upcomingCount = computed(() => appointments.value.length);
const todayCount = computed(() => {
  const today = toDateKey(new Date());
  return appointments.value.filter((appointment) => dateKeyFromIso(appointment.startsAt) === today).length;
});
const calendarDays = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const key = toDateKey(date);
    return {
      key,
      label: formatDayLabel(date),
      count: appointments.value.filter((appointment) => dateKeyFromIso(appointment.startsAt) === key).length,
      isToday: index === 0,
    };
  });
});
const selectedDateAppointments = computed(() =>
  appointments.value.filter((appointment) => dateKeyFromIso(appointment.startsAt) === selectedDateKey.value),
);

async function loadAppointments() {
  if (!primaryTenant.value) {
    appointments.value = [];
    return;
  }
  appointmentsLoading.value = true;
  appointmentsError.value = "";
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  try {
    const response = await $fetch<{ data: AppointmentListItem[] }>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/appointments`,
      {
        credentials: "include",
        query: {
          from: from.toISOString(),
          to: to.toISOString(),
          sort: "asc",
        },
      },
    );
    appointments.value = response.data;
  } catch (e: unknown) {
    const err = e as { data?: { data?: { message?: string }; message?: string }; statusMessage?: string };
    appointmentsError.value =
      err.data?.data?.message || err.data?.message || err.statusMessage || "Termine konnten nicht geladen werden";
  } finally {
    appointmentsLoading.value = false;
  }
}

async function loadOverview() {
  if (!isSuperadmin.value) return;
  saLoading.value = true;
  try {
    overview.value = await $fetch<SuperadminOverview>("/api/admin/overview", {
      credentials: "include",
    });
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    setError(err.data?.message || err.statusMessage || "Superadmin-Daten konnten nicht geladen werden");
  } finally {
    saLoading.value = false;
  }
}

async function createTenant() {
  try {
    await $fetch("/api/admin/tenants", {
      method: "POST",
      credentials: "include",
      body: { name: tenantForm.name, slug: tenantForm.slug },
    });
    tenantForm.name = "";
    tenantForm.slug = "";
    setInfo("Mandant angelegt");
    await loadOverview();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    setError(err.data?.message || err.statusMessage || "Mandant konnte nicht angelegt werden");
  }
}

async function createUser() {
  try {
    await $fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      body: {
        email: userForm.email,
        name: userForm.name,
        password: userForm.password,
        isSuperadmin: userForm.isSuperadmin,
        tenantId: userForm.tenantId || undefined,
        role: userForm.tenantId ? userForm.role : undefined,
      },
    });
    userForm.email = "";
    userForm.name = "";
    userForm.password = "";
    userForm.isSuperadmin = false;
    userForm.tenantId = "";
    userForm.role = "ADMIN";
    setInfo("Benutzer angelegt");
    await loadOverview();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    setError(err.data?.message || err.statusMessage || "Benutzer konnte nicht angelegt werden");
  }
}

async function grantMembership() {
  try {
    await $fetch("/api/admin/memberships", {
      method: "POST",
      credentials: "include",
      body: membershipForm,
    });
    membershipForm.userId = "";
    membershipForm.tenantId = "";
    membershipForm.role = "STAFF";
    setInfo("Mitgliedschaft gesetzt");
    await loadOverview();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    setError(err.data?.message || err.statusMessage || "Mitgliedschaft konnte nicht gesetzt werden");
  }
}

function selectUserForEdit(id: string, name: string | null, superadmin: boolean) {
  userEditForm.userId = id;
  userEditForm.name = name ?? "";
  userEditForm.password = "";
  userEditForm.isSuperadmin = superadmin;
}

async function updateUser() {
  if (!userEditForm.userId) {
    setError("Bitte zuerst Benutzer aus der Liste auswählen");
    return;
  }
  try {
    await $fetch(`/api/admin/users/${userEditForm.userId}`, {
      method: "PATCH",
      credentials: "include",
      body: {
        name: userEditForm.name,
        password: userEditForm.password || undefined,
        isSuperadmin: userEditForm.isSuperadmin,
      },
    });
    userEditForm.password = "";
    setInfo("Benutzer aktualisiert");
    await loadOverview();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    setError(err.data?.message || err.statusMessage || "Benutzer konnte nicht aktualisiert werden");
  }
}

onMounted(() => {
  selectedDateKey.value = toDateKey(new Date());
  if (isSuperadmin.value) {
    loadOverview();
  }
  loadAppointments();
});

watch(
  () => primaryTenant.value?.tenantId,
  () => {
    loadAppointments();
  },
);

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
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="space-y-2">
      <p class="text-sm text-muted font-medium">Avelom · Dashboard</p>
      <h1 class="text-2xl font-semibold tracking-tight">Übersicht</h1>
      <p class="text-neutral-600 dark:text-neutral-400 max-w-prose">
        Schneller Überblick über Termine, Tagesplan und wichtige Kernflows.
      </p>
      <p v-if="user" class="text-sm text-neutral-600 dark:text-neutral-400">
        Angemeldet als <strong>{{ user.name || user.email }}</strong>
        <template v-if="primaryTenant">
          · Mandant <strong>{{ primaryTenant.tenantName }}</strong>
        </template>
        <template v-if="user.isSuperadmin"> · <strong>Superadmin</strong></template>
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <p class="text-xs uppercase tracking-wide text-neutral-500">Termine (14 Tage)</p>
        <p class="mt-2 text-2xl font-semibold">{{ upcomingCount }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-neutral-500">Heute</p>
        <p class="mt-2 text-2xl font-semibold">{{ todayCount }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-neutral-500">Gewählter Tag</p>
        <p class="mt-2 text-2xl font-semibold">{{ selectedDateAppointments.length }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-neutral-500">Status</p>
        <p class="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {{ primaryTenant ? "Mandant aktiv" : "Kein Mandant" }}
        </p>
      </UCard>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <UButton to="/appointments" block size="xl" variant="soft" color="primary" icon="i-lucide-calendar-days">
        Termine
      </UButton>
      <UButton to="/archive" block size="xl" variant="outline" color="neutral" icon="i-lucide-archive">
        Archiv
      </UButton>
      <UButton block size="xl" color="primary" icon="i-lucide-zap" @click="openAssistant">
        Schnellerfassung &amp; Assistent
      </UButton>
      <UButton to="/conflict-demo" block size="xl" variant="outline" icon="i-lucide-git-merge">
        Konflikt / Alternativen
      </UButton>
      <UButton size="xl" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" :loading="appointmentsLoading" @click="loadAppointments">
        Termine neu laden
      </UButton>
    </div>

    <UAlert
      v-if="appointmentsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="appointmentsError"
    />

    <section class="grid gap-4 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">Termine am gewählten Tag</h2>
            <span class="text-sm text-neutral-500">{{ selectedDateKey }}</span>
          </div>
        </template>

        <div v-if="!primaryTenant" class="text-sm text-neutral-600 dark:text-neutral-400">
          Für Termine brauchst du eine Mandanten-Mitgliedschaft.
        </div>
        <div v-else-if="!selectedDateAppointments.length && !appointmentsLoading" class="text-sm text-neutral-600 dark:text-neutral-400">
          Keine Termine für diesen Tag.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="appointment in selectedDateAppointments"
            :key="appointment.id"
            class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-medium">{{ appointmentTitle(appointment) }}</p>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  {{ formatDateTime(appointment.startsAt) }}–{{ formatDateTime(appointment.endsAt).split(', ').pop() }}
                </p>
              </div>
              <UBadge color="primary" variant="subtle">{{ appointment.status }}</UBadge>
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span v-if="appointment.teacher">{{ teacherLabel }}: {{ appointment.teacher.displayName }}</span>
              <span v-if="resourcesEnabled && appointment.resource">Ressource: {{ appointment.resource.name }}</span>
              <span v-if="appointment.lessonType">Art: {{ appointment.lessonType.name }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Kalender</h2>
        </template>
        <div class="space-y-3">
          <UInput v-model="selectedDateKey" type="date" />
          <div class="grid grid-cols-2 gap-2">
            <UButton
              v-for="day in calendarDays"
              :key="day.key"
              size="sm"
              :color="day.key === selectedDateKey ? 'primary' : 'neutral'"
              :variant="day.key === selectedDateKey ? 'soft' : 'outline'"
              class="justify-between"
              @click="selectedDateKey = day.key"
            >
              <span>{{ day.label }}</span>
              <UBadge :color="day.count ? 'primary' : 'neutral'" variant="subtle">{{ day.count }}</UBadge>
            </UButton>
          </div>
          <p class="text-xs text-neutral-500">
            14-Tage-Ansicht. Wähle einen Tag, um rechts die Termine zu sehen.
          </p>
        </div>
      </UCard>
    </section>

    <section
      v-if="isSuperadmin"
      id="superadmin"
      class="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Superadmin-Verwaltung (gleiche App)</h2>
        <UButton size="sm" variant="outline" color="neutral" icon="i-lucide-refresh-cw" @click="loadOverview">
          Neu laden
        </UButton>
      </div>

      <UAlert
        v-if="saError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="saError"
      />
      <UAlert
        v-if="saInfo"
        color="success"
        variant="soft"
        icon="i-lucide-circle-check"
        :title="saInfo"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <h3 class="font-medium">Mandant anlegen</h3>
          </template>
          <form class="space-y-3" @submit.prevent="createTenant">
            <UInput v-model="tenantForm.name" placeholder="Tenant Name" />
            <UInput v-model="tenantForm.slug" placeholder="tenant-slug" />
            <UButton type="submit" color="primary" :loading="saLoading">Mandant erstellen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">Benutzer anlegen</h3>
          </template>
          <form class="space-y-3" @submit.prevent="createUser">
            <UInput v-model="userForm.email" type="email" placeholder="email@domain.tld" />
            <UInput v-model="userForm.name" placeholder="Name (optional)" />
            <UInput v-model="userForm.password" type="password" placeholder="Passwort" />
            <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input v-model="userForm.isSuperadmin" type="checkbox" />
              Superadmin-Rechte
            </label>
            <div class="grid gap-2 sm:grid-cols-2">
              <select
                v-model="userForm.tenantId"
                class="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option value="">Ohne Mandant</option>
                <option v-for="t in overview?.tenants || []" :key="t.id" :value="t.id">
                  {{ t.name }} ({{ t.slug }})
                </option>
              </select>
              <select
                v-model="userForm.role"
                class="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <UButton type="submit" color="primary" :loading="saLoading">Benutzer erstellen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">Mitgliedschaft zuweisen</h3>
          </template>
          <form class="space-y-3" @submit.prevent="grantMembership">
            <select
              v-model="membershipForm.userId"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Benutzer wählen</option>
              <option v-for="u in overview?.users || []" :key="u.id" :value="u.id">
                {{ u.email }}
              </option>
            </select>
            <select
              v-model="membershipForm.tenantId"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Mandant wählen</option>
              <option v-for="t in overview?.tenants || []" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.slug }})
              </option>
            </select>
            <select
              v-model="membershipForm.role"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
            </select>
            <UButton type="submit" color="primary" :loading="saLoading">Zuweisen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">Benutzer bearbeiten</h3>
          </template>
          <form class="space-y-3" @submit.prevent="updateUser">
            <select
              v-model="userEditForm.userId"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Benutzer wählen</option>
              <option v-for="u in overview?.users || []" :key="u.id" :value="u.id">
                {{ u.email }}
              </option>
            </select>
            <UInput v-model="userEditForm.name" placeholder="Anzeigename (leer = null)" />
            <UInput v-model="userEditForm.password" type="password" placeholder="Neues Passwort (optional)" />
            <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input v-model="userEditForm.isSuperadmin" type="checkbox" />
              Superadmin-Rechte
            </label>
            <UButton type="submit" color="secondary" :loading="saLoading">Speichern</UButton>
          </form>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h3 class="font-medium">Benutzer & Rechte</h3>
        </template>
        <div v-if="!overview?.users?.length" class="text-sm text-neutral-500">
          Noch keine Benutzerdaten geladen.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="u in overview.users"
            :key="u.id"
            class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-2"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-medium">{{ u.name || u.email }}</p>
                <p class="text-xs text-neutral-500">{{ u.email }}</p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge v-if="u.isSuperadmin" color="secondary" variant="soft">SUPERADMIN</UBadge>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  @click="selectUserForEdit(u.id, u.name, u.isSuperadmin)"
                >
                  Bearbeiten
                </UButton>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="m in u.memberships"
                :key="`${u.id}:${m.tenantId}:${m.role}`"
                color="primary"
                variant="subtle"
              >
                {{ m.tenantSlug }} · {{ m.role }}
              </UBadge>
              <span v-if="u.memberships.length === 0" class="text-xs text-neutral-500">keine Membership</span>
            </div>
          </div>
        </div>
      </UCard>
    </section>

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
  </UContainer>
</template>
