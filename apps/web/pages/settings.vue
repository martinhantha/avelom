<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { $fetch } from "ofetch";
import { isCallHintsOptIn } from "@avelom/device-capabilities";
import { useWhatsAppPreference } from "../composables/useWhatsAppPreference";
import type { SuperadminOverview, TenantRole } from "../types/superadmin";

interface LessonType {
  id: string;
  name: string;
  defaultDurationMin: number | null;
}

interface TeacherOption {
  id: string;
  displayName: string;
}

interface AvailabilityRule {
  id: string;
  teacherId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  priority: number;
}

const { user, primaryTenant, refreshSession, canManageTenant } = useAuth();
const { device, setCallHintsOptIn } = useDeviceCapabilities();
const {
  isNative,
  requesting: permissionsRequesting,
  microphoneGranted,
  contactsGranted,
  allGranted,
  anyDenied,
  refreshStatus,
  requestNow,
  openAppSettings,
} = useNativePermissions();
const callHintsEnabled = ref(false);
const callHintsSaving = ref(false);
const { whatsappApp, setWhatsAppApp } = useWhatsAppPreference();

function onWhatsAppAppChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  setWhatsAppApp(value === "business" ? "business" : "whatsapp");
}

const isSuperadmin = computed(() => Boolean(user.value?.isSuperadmin));
const canEdit = canManageTenant;

const tenantSettingsSaving = ref(false);
const useDefaultDurationLocal = ref(true);
const resourcesEnabledLocal = ref(true);
const teacherLabelLocal = ref("Lehrer");
const defaultTeacherIdLocal = ref("");
const lastSavedDefaultTeacherId = ref("");
const defaultLessonTypeIdLocal = ref("");
const lastSavedDefaultLessonTypeId = ref("");
watch(
  () => primaryTenant.value?.useDefaultDuration,
  (v) => {
    useDefaultDurationLocal.value = v ?? true;
  },
  { immediate: true },
);
watch(
  () => primaryTenant.value?.resourcesEnabled,
  (v) => {
    resourcesEnabledLocal.value = v ?? true;
  },
  { immediate: true },
);
watch(
  () => primaryTenant.value?.teacherLabel,
  (v) => {
    teacherLabelLocal.value = v?.trim() || "Lehrer";
  },
  { immediate: true },
);

async function saveTenantSettings(patch: {
  useDefaultDuration?: boolean;
  defaultTeacherId?: string | null;
  defaultLessonTypeId?: string | null;
  teacherLabel?: string;
  resourcesEnabled?: boolean;
}) {
  if (!primaryTenant.value?.tenantId) return;
  tenantSettingsSaving.value = true;
  try {
    const saved = await $fetch<{
      useDefaultDuration: boolean;
      defaultTeacherId: string | null;
      defaultLessonTypeId: string | null;
      teacherLabel: string;
      resourcesEnabled: boolean;
    }>(`/api/v1/tenants/${primaryTenant.value.tenantId}/settings`, {
      method: "PATCH",
      credentials: "include",
      body: patch,
    });
    if (typeof saved.useDefaultDuration === "boolean") {
      useDefaultDurationLocal.value = saved.useDefaultDuration;
    }
    if (typeof saved.resourcesEnabled === "boolean") {
      resourcesEnabledLocal.value = saved.resourcesEnabled;
    }
    if (typeof saved.teacherLabel === "string") {
      teacherLabelLocal.value = saved.teacherLabel;
    }
    if (Object.prototype.hasOwnProperty.call(saved, "defaultTeacherId")) {
      defaultTeacherIdLocal.value = saved.defaultTeacherId ?? "";
      lastSavedDefaultTeacherId.value = defaultTeacherIdLocal.value;
    }
    if (Object.prototype.hasOwnProperty.call(saved, "defaultLessonTypeId")) {
      defaultLessonTypeIdLocal.value = saved.defaultLessonTypeId ?? "";
      lastSavedDefaultLessonTypeId.value = defaultLessonTypeIdLocal.value;
    }
    await refreshSession();
    setInfo("Mandanten-Einstellungen gespeichert");
  } catch (e: unknown) {
    const err = e as { data?: { data?: { message?: string }; message?: string }; statusMessage?: string };
    setError(err.data?.data?.message || err.data?.message || err.statusMessage || "Speichern fehlgeschlagen");
    useDefaultDurationLocal.value = primaryTenant.value?.useDefaultDuration ?? true;
    resourcesEnabledLocal.value = primaryTenant.value?.resourcesEnabled ?? true;
    teacherLabelLocal.value = primaryTenant.value?.teacherLabel?.trim() || "Lehrer";
    defaultTeacherIdLocal.value = lastSavedDefaultTeacherId.value;
    defaultLessonTypeIdLocal.value = lastSavedDefaultLessonTypeId.value;
  } finally {
    tenantSettingsSaving.value = false;
  }
}

function saveTeacherLabel() {
  const next = teacherLabelLocal.value.trim() || "Lehrer";
  teacherLabelLocal.value = next;
  if (next === (primaryTenant.value?.teacherLabel?.trim() || "Lehrer")) return;
  saveTenantSettings({ teacherLabel: next });
}

const tabs = computed(() => {
  const t = [{ id: "account", label: "Account", icon: "i-lucide-user" }];
  if (canEdit.value) {
    t.push(
      { id: "lesson-types", label: "Termintypen", icon: "i-lucide-tag" },
      { id: "availability", label: "Standard-Uhrzeiten", icon: "i-lucide-clock" },
    );
  }
  if (isSuperadmin.value) {
    t.push({ id: "users", label: "Benutzer", icon: "i-lucide-users" });
  }
  return t;
});
const activeTab = ref("account");

const info = ref("");
const error = ref("");

function setInfo(msg: string) {
  info.value = msg;
  error.value = "";
}
function setError(msg: string) {
  error.value = msg;
  info.value = "";
}
async function toggleCallHints(enabled: boolean) {
  callHintsSaving.value = true;
  try {
    await setCallHintsOptIn(enabled);
    callHintsEnabled.value = enabled && isCallHintsOptIn();
    setInfo(
      callHintsEnabled.value
        ? "Letzte Anrufe werden nur lokal als Vorschlag genutzt — nicht an den Server gesendet."
        : "Vorschläge aus der Anrufliste sind deaktiviert.",
    );
  } catch (e: unknown) {
    callHintsEnabled.value = false;
    setError(e instanceof Error ? e.message : "Anrufliste konnte nicht aktiviert werden");
  } finally {
    callHintsSaving.value = false;
  }
}
function apiMessage(e: unknown, fallback: string) {
  const err = e as { data?: { data?: { message?: string }; message?: string }; statusMessage?: string };
  return err.data?.data?.message || err.data?.message || err.statusMessage || fallback;
}

const lessonTypes = ref<LessonType[]>([]);
const lessonTypeForm = reactive({ id: "", name: "", defaultDurationMin: 60 as number | "" });
const lessonTypeLoading = ref(false);

async function loadLessonTypes() {
  if (!primaryTenant.value?.tenantId) return;
  lessonTypeLoading.value = true;
  try {
    const response = await $fetch<{ data: LessonType[] }>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/lesson-types`,
      { credentials: "include" },
    );
    lessonTypes.value = response.data;
  } catch (e: unknown) {
    setError(apiMessage(e, "Termintypen konnten nicht geladen werden"));
  } finally {
    lessonTypeLoading.value = false;
  }
}

function selectLessonType(item: LessonType) {
  lessonTypeForm.id = item.id;
  lessonTypeForm.name = item.name;
  lessonTypeForm.defaultDurationMin = item.defaultDurationMin ?? "";
}
function resetLessonTypeForm() {
  lessonTypeForm.id = "";
  lessonTypeForm.name = "";
  lessonTypeForm.defaultDurationMin = 60;
}

async function saveLessonType() {
  if (!primaryTenant.value?.tenantId) return;
  if (!lessonTypeForm.name.trim()) {
    setError("Name ist erforderlich");
    return;
  }
  lessonTypeLoading.value = true;
  try {
    const body = {
      name: lessonTypeForm.name,
      defaultDurationMin:
        lessonTypeForm.defaultDurationMin === "" ? null : Number(lessonTypeForm.defaultDurationMin),
    };
    if (lessonTypeForm.id) {
      await $fetch(`/api/v1/tenants/${primaryTenant.value.tenantId}/lesson-types/${lessonTypeForm.id}`, {
        method: "PATCH",
        credentials: "include",
        body,
      });
      setInfo("Termintyp aktualisiert");
    } else {
      await $fetch(`/api/v1/tenants/${primaryTenant.value.tenantId}/lesson-types`, {
        method: "POST",
        credentials: "include",
        body,
      });
      setInfo("Termintyp angelegt");
    }
    resetLessonTypeForm();
    await loadLessonTypes();
  } catch (e: unknown) {
    setError(apiMessage(e, "Termintyp konnte nicht gespeichert werden"));
  } finally {
    lessonTypeLoading.value = false;
  }
}

async function deleteLessonType(item: LessonType) {
  if (!primaryTenant.value?.tenantId) return;
  if (!confirm(`Termintyp „${item.name}“ löschen?`)) return;
  try {
    await $fetch(`/api/v1/tenants/${primaryTenant.value.tenantId}/lesson-types/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setInfo("Termintyp gelöscht");
    if (lessonTypeForm.id === item.id) resetLessonTypeForm();
    await loadLessonTypes();
  } catch (e: unknown) {
    setError(apiMessage(e, "Termintyp konnte nicht gelöscht werden"));
  }
}

const teachers = ref<TeacherOption[]>([]);
const selectedTeacherId = ref("");
const rules = ref<AvailabilityRule[]>([]);
const ruleForm = reactive({
  id: "",
  weekdays: [1, 2, 3, 4, 5] as number[],
  originalWeekday: null as number | null,
  startTime: "09:00",
  endTime: "17:00",
  priority: 0,
});
const rulesLoading = ref(false);
const weekdayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
const weekdayPresets = [
  { label: "Mo–Fr", days: [1, 2, 3, 4, 5] },
  { label: "Wochenende", days: [6, 0] },
  { label: "Alle", days: [1, 2, 3, 4, 5, 6, 0] },
];

function toggleWeekday(day: number) {
  const index = ruleForm.weekdays.indexOf(day);
  if (index >= 0) {
    ruleForm.weekdays.splice(index, 1);
  } else {
    ruleForm.weekdays.push(day);
  }
}

function setWeekdays(days: number[]) {
  ruleForm.weekdays = [...days];
}

function selectedWeekdays(): number[] {
  return [...new Set(ruleForm.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
    (a, b) => a - b,
  );
}

async function loadTeachers() {
  if (!primaryTenant.value?.tenantId) return;
  try {
    const response = await $fetch<{
      teachers: TeacherOption[];
      defaultTeacherId?: string | null;
      defaultLessonTypeId?: string | null;
    }>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/scheduling/options`,
      { credentials: "include" },
    );
    teachers.value = response.teachers;
    defaultTeacherIdLocal.value = response.defaultTeacherId ?? "";
    lastSavedDefaultTeacherId.value = defaultTeacherIdLocal.value;
    defaultLessonTypeIdLocal.value = response.defaultLessonTypeId ?? "";
    lastSavedDefaultLessonTypeId.value = defaultLessonTypeIdLocal.value;
    if (!selectedTeacherId.value && teachers.value[0]) {
      selectedTeacherId.value = teachers.value[0].id;
    }
  } catch (e: unknown) {
    setError(apiMessage(e, `${teacherLabelLocal.value} konnten nicht geladen werden`));
  }
}

async function loadRules() {
  if (!primaryTenant.value?.tenantId || !selectedTeacherId.value) {
    rules.value = [];
    return;
  }
  rulesLoading.value = true;
  try {
    const response = await $fetch<{ data: AvailabilityRule[] }>(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/teachers/${selectedTeacherId.value}/availability/rules`,
      { credentials: "include" },
    );
    rules.value = response.data;
  } catch (e: unknown) {
    setError(apiMessage(e, "Verfügbarkeit konnte nicht geladen werden"));
  } finally {
    rulesLoading.value = false;
  }
}

function selectRule(item: AvailabilityRule) {
  ruleForm.id = item.id;
  ruleForm.weekdays = [item.weekday];
  ruleForm.originalWeekday = item.weekday;
  ruleForm.startTime = item.startTime;
  ruleForm.endTime = item.endTime;
  ruleForm.priority = item.priority;
}
function resetRuleForm() {
  ruleForm.id = "";
  ruleForm.weekdays = [1, 2, 3, 4, 5];
  ruleForm.originalWeekday = null;
  ruleForm.startTime = "09:00";
  ruleForm.endTime = "17:00";
  ruleForm.priority = 0;
}

async function saveRule() {
  if (!primaryTenant.value?.tenantId || !selectedTeacherId.value) return;
  const days = selectedWeekdays();
  if (!days.length) {
    setError("Mindestens einen Wochentag wählen");
    return;
  }
  rulesLoading.value = true;
  try {
    const base = `/api/v1/tenants/${primaryTenant.value.tenantId}/teachers/${selectedTeacherId.value}/availability/rules`;
    const times = {
      startTime: ruleForm.startTime,
      endTime: ruleForm.endTime,
      priority: Number(ruleForm.priority) || 0,
    };
    if (ruleForm.id) {
      const original = ruleForm.originalWeekday;
      const patchDay = original !== null && days.includes(original) ? original : days[0];
      await $fetch(`${base}/${ruleForm.id}`, {
        method: "PATCH",
        credentials: "include",
        body: { weekday: patchDay, ...times },
      });
      const extraDays = days.filter((day) => day !== patchDay);
      if (extraDays.length) {
        await $fetch(base, {
          method: "POST",
          credentials: "include",
          body: { weekdays: extraDays, ...times },
        });
      }
      setInfo(extraDays.length ? "Regel aktualisiert und weitere Tage angelegt" : "Regel aktualisiert");
    } else {
      await $fetch(base, {
        method: "POST",
        credentials: "include",
        body: { weekdays: days, ...times },
      });
      setInfo(days.length > 1 ? `Regel für ${days.length} Tage angelegt` : "Regel angelegt");
    }
    resetRuleForm();
    await loadRules();
  } catch (e: unknown) {
    setError(apiMessage(e, "Regel konnte nicht gespeichert werden"));
  } finally {
    rulesLoading.value = false;
  }
}

async function deleteRule(item: AvailabilityRule) {
  if (!primaryTenant.value?.tenantId || !selectedTeacherId.value) return;
  if (!confirm(`Regel ${weekdayLabels[item.weekday]} ${item.startTime}–${item.endTime} löschen?`)) return;
  try {
    await $fetch(
      `/api/v1/tenants/${primaryTenant.value.tenantId}/teachers/${selectedTeacherId.value}/availability/rules/${item.id}`,
      { method: "DELETE", credentials: "include" },
    );
    setInfo("Regel gelöscht");
    if (ruleForm.id === item.id) resetRuleForm();
    await loadRules();
  } catch (e: unknown) {
    setError(apiMessage(e, "Regel konnte nicht gelöscht werden"));
  }
}

const overview = ref<SuperadminOverview | null>(null);
const overviewLoading = ref(false);
const tenantForm = reactive({ name: "", slug: "" });
const userForm = reactive({
  email: "",
  name: "",
  password: "",
  isSuperadmin: false,
  tenantId: "",
  role: "ADMIN" as TenantRole,
});
const membershipForm = reactive({ userId: "", tenantId: "", role: "STAFF" as TenantRole });
const userEditForm = reactive({ userId: "", name: "", password: "", isSuperadmin: false });
const roleOptions: TenantRole[] = ["ADMIN", "STAFF", "END_CUSTOMER"];

async function loadOverview() {
  if (!isSuperadmin.value) return;
  overviewLoading.value = true;
  try {
    overview.value = await $fetch<SuperadminOverview>("/api/admin/overview", { credentials: "include" });
  } catch (e: unknown) {
    setError(apiMessage(e, "Daten konnten nicht geladen werden"));
  } finally {
    overviewLoading.value = false;
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
    setError(apiMessage(e, "Mandant konnte nicht angelegt werden"));
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
    setError(apiMessage(e, "Benutzer konnte nicht angelegt werden"));
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
    setError(apiMessage(e, "Mitgliedschaft konnte nicht gesetzt werden"));
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
    setError(apiMessage(e, "Benutzer konnte nicht aktualisiert werden"));
  }
}

watch(activeTab, async (tab) => {
  info.value = "";
  error.value = "";
  if (tab === "lesson-types") await loadLessonTypes();
  if (tab === "availability") {
    await loadTeachers();
    await loadRules();
  }
  if (tab === "users") await loadOverview();
});

watch(selectedTeacherId, () => {
  resetRuleForm();
  loadRules();
});

watch(canEdit, (ok) => {
  if (!ok && (activeTab.value === "lesson-types" || activeTab.value === "availability")) {
    activeTab.value = "account";
  }
});

onMounted(() => {
  if (canEdit.value) {
    loadLessonTypes();
    loadTeachers();
  }
  callHintsEnabled.value = isCallHintsOptIn();
  void refreshStatus();
});
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="space-y-2">
      <p class="text-sm text-muted font-medium">Avelom · Settings</p>
      <h1 class="text-2xl font-semibold tracking-tight">Einstellungen</h1>
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        Account und Gerät
        <template v-if="canEdit">
          · Mandanten-Optionen
          <UBadge color="primary" variant="subtle" class="ml-1">
            {{ isSuperadmin ? "Superadmin" : "Admin" }}
          </UBadge>
        </template>
      </p>
    </div>

    <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :title="error" />
    <UAlert v-if="info" color="success" variant="soft" icon="i-lucide-circle-check" :title="info" />

    <div class="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
      <UButton
        v-for="tab in tabs"
        :key="tab.id"
        size="sm"
        :variant="activeTab === tab.id ? 'soft' : 'ghost'"
        :color="activeTab === tab.id ? 'primary' : 'neutral'"
        :icon="tab.icon"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </UButton>
    </div>

    <section v-if="activeTab === 'account'" class="grid gap-4 lg:grid-cols-2">
      <UCard class="lg:col-span-2">
        <template #header><h2 class="font-medium">Dieses Gerät</h2></template>
        <div class="space-y-4 text-sm">
          <p>
            <span class="text-neutral-500">Umgebung:</span>
            {{
              device.platform === "android"
                ? "Android-App"
                : device.platform === "ios"
                  ? "iOS-App"
                  : "Browser"
            }}
          </p>
          <div class="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <p class="font-medium">WhatsApp-App</p>
            <p class="text-xs text-neutral-500">
              Welche App beim Tippen auf WhatsApp geöffnet wird. Nützlich, wenn WhatsApp und WhatsApp Business
              installiert sind.
            </p>
            <select
              class="w-full max-w-md rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              :value="whatsappApp"
              @change="onWhatsAppAppChange"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="business">WhatsApp Business</option>
            </select>
          </div>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">Letzte Anrufe als Telefon-Vorschlag</p>
              <p class="text-xs text-neutral-500 mt-1">
                Nur in der Android-App, nur nach Opt-in. Nummern bleiben auf dem Gerät und werden nicht an den Server
                geschickt. Unter iOS und im Browser nicht verfügbar.
              </p>
            </div>
            <label class="relative inline-flex items-center shrink-0 mt-1" :class="device.features.callHints ? 'cursor-pointer' : 'opacity-50'">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="callHintsEnabled"
                :disabled="!device.features.callHints || callHintsSaving"
                @change="toggleCallHints(!callHintsEnabled)"
              />
              <div class="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 dark:bg-neutral-700 dark:after:bg-neutral-200" />
            </label>
          </div>
          <div v-if="isNative" class="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <p class="font-medium">Mikrofon & Kontakte</p>
            <p class="text-xs text-neutral-500">
              Spracheingabe und Adressbuch. Kontakte werden lokal unter „Avelom“ gespeichert, nicht im Google-Konto.
            </p>
            <ul class="text-sm space-y-1">
              <li class="flex items-center justify-between gap-3">
                <span>Mikrofon</span>
                <UBadge :color="microphoneGranted ? 'success' : 'neutral'" variant="subtle">
                  {{ microphoneGranted ? "Erlaubt" : "Nicht erlaubt" }}
                </UBadge>
              </li>
              <li class="flex items-center justify-between gap-3">
                <span>Kontakte</span>
                <UBadge :color="contactsGranted ? 'success' : 'neutral'" variant="subtle">
                  {{ contactsGranted ? "Erlaubt" : "Nicht erlaubt" }}
                </UBadge>
              </li>
            </ul>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="sm"
                color="primary"
                icon="i-lucide-shield-check"
                :loading="permissionsRequesting"
                :disabled="allGranted"
                @click="requestNow"
              >
                Jetzt erlauben
              </UButton>
              <UButton
                v-if="anyDenied || !allGranted"
                size="sm"
                variant="soft"
                color="neutral"
                icon="i-lucide-settings-2"
                @click="openAppSettings"
              >
                App-Einstellungen
              </UButton>
            </div>
          </div>
          <p v-else class="text-xs text-neutral-500">
            Kontakte speichern: in der App direkt ins Adressbuch, im Browser als vCard-Download.
          </p>
        </div>
      </UCard>
      <UCard>
        <template #header><h2 class="font-medium">Account</h2></template>
        <div class="space-y-2 text-sm">
          <p><span class="text-neutral-500">Name:</span> {{ user?.name || "—" }}</p>
          <p><span class="text-neutral-500">E-Mail:</span> {{ user?.email || "—" }}</p>
          <p>
            <span class="text-neutral-500">Rolle:</span>
            {{ user?.isSuperadmin ? "Superadmin" : "Standard" }}
          </p>
        </div>
      </UCard>
      <UCard>
        <template #header><h2 class="font-medium">Mandant</h2></template>
        <div class="space-y-2 text-sm">
          <p><span class="text-neutral-500">Aktiver Mandant:</span> {{ primaryTenant?.tenantName || "—" }}</p>
          <p><span class="text-neutral-500">Slug:</span> {{ primaryTenant?.tenantSlug || "—" }}</p>
          <p><span class="text-neutral-500">Rolle:</span> {{ primaryTenant?.role || "—" }}</p>
        </div>
      </UCard>

      <UCard v-if="canEdit" class="lg:col-span-2">
        <template #header><h2 class="font-medium">Mandanten-Optionen</h2></template>
        <div class="flex items-start justify-between gap-4">
          <div class="text-sm">
            <p class="font-medium">Standard-Dauer für Termintypen verwenden</p>
            <p class="text-xs text-neutral-500 mt-1">
              Wenn deaktiviert, hat ein Termintyp keine Standard-Dauer. Die Termin-Dauer wird pro Termin manuell gesetzt.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="useDefaultDurationLocal"
              :disabled="!canEdit || tenantSettingsSaving"
              @change="
                () => {
                  useDefaultDurationLocal = !useDefaultDurationLocal;
                  saveTenantSettings({ useDefaultDuration: useDefaultDurationLocal });
                }
              "
            />
            <div class="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 dark:bg-neutral-700 dark:after:bg-neutral-200" />
          </label>
        </div>

        <div class="flex items-start justify-between gap-4 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div class="text-sm">
            <p class="font-medium">Ressource bei Terminen verwenden</p>
            <p class="text-xs text-neutral-500 mt-1">
              Wenn deaktiviert, wird bei Terminen keine Ressource zugeordnet (z. B. Raum oder Flugzeug).
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="resourcesEnabledLocal"
              :disabled="!canEdit || tenantSettingsSaving"
              @change="
                () => {
                  resourcesEnabledLocal = !resourcesEnabledLocal;
                  saveTenantSettings({ resourcesEnabled: resourcesEnabledLocal });
                }
              "
            />
            <div class="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 dark:bg-neutral-700 dark:after:bg-neutral-200" />
          </label>
        </div>

        <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <p class="font-medium text-sm">Bezeichnung der Rolle</p>
          <p class="text-xs text-neutral-500">
            Wird in der Schnellerfassung und bei Terminen angezeigt. z. B. Lehrer, Pilot, Trainer.
          </p>
          <UInput
            v-model="teacherLabelLocal"
            class="max-w-md"
            maxlength="40"
            placeholder="Lehrer"
            :disabled="!canEdit || tenantSettingsSaving"
            @blur="saveTeacherLabel"
            @keydown.enter.prevent="saveTeacherLabel"
          />
        </div>

        <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <p class="font-medium text-sm">Standard-{{ teacherLabelLocal }} für Schnellerfassung</p>
          <p class="text-xs text-neutral-500">
            Wird beim Anlegen eines Termins über die Schnellerfassung vorausgewählt. Ohne Auswahl bleibt der erste
            {{ teacherLabelLocal }} vorausgewählt.
          </p>
          <select
            v-model="defaultTeacherIdLocal"
            class="w-full max-w-md rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            :disabled="!canEdit || tenantSettingsSaving"
            @change="saveTenantSettings({ defaultTeacherId: defaultTeacherIdLocal || null })"
          >
            <option value="">Kein Standard (erster {{ teacherLabelLocal }})</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.displayName }}</option>
          </select>
        </div>

        <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <p class="font-medium text-sm">Standard-Terminart für Schnellerfassung</p>
          <p class="text-xs text-neutral-500">
            Wird beim Anlegen eines Termins über die Schnellerfassung vorausgewählt. Ohne Auswahl bleibt die erste
            Terminart vorausgewählt.
          </p>
          <select
            v-model="defaultLessonTypeIdLocal"
            class="w-full max-w-md rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            :disabled="!canEdit || tenantSettingsSaving"
            @change="saveTenantSettings({ defaultLessonTypeId: defaultLessonTypeIdLocal || null })"
          >
            <option value="">Kein Standard (erste Terminart)</option>
            <option v-for="item in lessonTypes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </div>
      </UCard>
    </section>

    <section v-else-if="activeTab === 'lesson-types' && canEdit" class="grid gap-4 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-medium">Termintypen ({{ lessonTypes.length }})</h2>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" :loading="lessonTypeLoading" @click="loadLessonTypes" />
          </div>
        </template>
        <div v-if="!lessonTypes.length" class="text-sm text-neutral-500">Noch keine Termintypen angelegt.</div>
        <div v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
          <div v-for="item in lessonTypes" :key="item.id" class="flex items-center justify-between py-2 gap-3">
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p v-if="useDefaultDurationLocal" class="text-xs text-neutral-500">
                Standard-Dauer: {{ item.defaultDurationMin ? `${item.defaultDurationMin} Min` : "—" }}
              </p>
            </div>
            <div class="flex gap-1">
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" :disabled="!canEdit" @click="selectLessonType(item)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" :disabled="!canEdit" @click="deleteLessonType(item)" />
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-medium">{{ lessonTypeForm.id ? "Termintyp bearbeiten" : "Neuer Termintyp" }}</h2>
        </template>
        <form class="space-y-3" @submit.prevent="saveLessonType">
          <UFormField label="Name">
            <UInput v-model="lessonTypeForm.name" placeholder="z. B. Einzelstunde" :disabled="!canEdit" />
          </UFormField>
          <UFormField v-if="useDefaultDurationLocal" label="Standard-Dauer (Minuten)" hint="leer = keine Vorgabe">
            <UInput v-model.number="lessonTypeForm.defaultDurationMin" type="number" min="5" max="1440" :disabled="!canEdit" />
          </UFormField>
          <p v-else class="text-xs text-neutral-500">
            Dauer ist für diesen Mandanten deaktiviert (Tab „Account" → Mandanten-Optionen).
          </p>
          <div class="flex gap-2">
            <UButton type="submit" color="primary" :loading="lessonTypeLoading" :disabled="!canEdit">
              {{ lessonTypeForm.id ? "Speichern" : "Anlegen" }}
            </UButton>
            <UButton v-if="lessonTypeForm.id" variant="ghost" color="neutral" @click="resetLessonTypeForm">
              Abbrechen
            </UButton>
          </div>
        </form>
      </UCard>
    </section>

    <section v-else-if="activeTab === 'availability' && canEdit" class="space-y-4">
      <UCard>
        <template #header><h2 class="font-medium">{{ teacherLabelLocal }} wählen</h2></template>
        <div v-if="!teachers.length" class="text-sm text-neutral-500">Noch keine {{ teacherLabelLocal }} hinterlegt.</div>
        <select
          v-else
          v-model="selectedTeacherId"
          class="w-full max-w-md rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        >
          <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.displayName }}</option>
        </select>
      </UCard>

      <div class="grid gap-4 lg:grid-cols-3">
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-medium">Standard-Uhrzeiten ({{ rules.length }})</h2>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" :loading="rulesLoading" @click="loadRules" />
            </div>
          </template>
          <div v-if="!rules.length" class="text-sm text-neutral-500">
            Noch keine Standard-Uhrzeiten für diesen {{ teacherLabelLocal }}.
          </div>
          <div v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <div v-for="item in rules" :key="item.id" class="flex items-center justify-between py-2 gap-3">
              <div>
                <p class="font-medium">
                  {{ weekdayLabels[item.weekday] }} · {{ item.startTime }}–{{ item.endTime }}
                </p>
                <p class="text-xs text-neutral-500">Priorität: {{ item.priority }}</p>
              </div>
              <div class="flex gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" :disabled="!canEdit" @click="selectRule(item)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" :disabled="!canEdit" @click="deleteRule(item)" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-medium">{{ ruleForm.id ? "Regel bearbeiten" : "Neue Regel" }}</h2>
          </template>
          <form class="space-y-3" @submit.prevent="saveRule">
            <UFormField label="Wochentage">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="day in weekdayOrder"
                  :key="day"
                  type="button"
                  class="min-w-10 rounded-md border px-2 py-1.5 text-sm font-medium transition"
                  :class="
                    ruleForm.weekdays.includes(day)
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
                  "
                  :disabled="!canEdit"
                  @click="toggleWeekday(day)"
                >
                  {{ weekdayLabels[day] }}
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-1">
                <UButton
                  v-for="preset in weekdayPresets"
                  :key="preset.label"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :disabled="!canEdit"
                  @click="setWeekdays(preset.days)"
                >
                  {{ preset.label }}
                </UButton>
              </div>
            </UFormField>
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Von">
                <UInput v-model="ruleForm.startTime" type="time" :disabled="!canEdit" />
              </UFormField>
              <UFormField label="Bis">
                <UInput v-model="ruleForm.endTime" type="time" :disabled="!canEdit" />
              </UFormField>
            </div>
            <UFormField label="Priorität">
              <UInput v-model.number="ruleForm.priority" type="number" :disabled="!canEdit" />
            </UFormField>
            <div class="flex gap-2">
              <UButton type="submit" color="primary" :loading="rulesLoading" :disabled="!canEdit || !selectedTeacherId">
                {{ ruleForm.id ? "Speichern" : "Anlegen" }}
              </UButton>
              <UButton v-if="ruleForm.id" variant="ghost" color="neutral" @click="resetRuleForm">
                Abbrechen
              </UButton>
            </div>
          </form>
        </UCard>
      </div>
    </section>

    <section v-else-if="activeTab === 'users' && isSuperadmin" class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Benutzer & Mandanten</h2>
        <UButton size="sm" variant="outline" color="neutral" icon="i-lucide-refresh-cw" :loading="overviewLoading" @click="loadOverview">
          Neu laden
        </UButton>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header><h3 class="font-medium">Mandant anlegen</h3></template>
          <form class="space-y-3" @submit.prevent="createTenant">
            <UInput v-model="tenantForm.name" placeholder="Tenant Name" />
            <UInput v-model="tenantForm.slug" placeholder="tenant-slug" />
            <UButton type="submit" color="primary" :loading="overviewLoading">Mandant erstellen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header><h3 class="font-medium">Benutzer anlegen</h3></template>
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
            <UButton type="submit" color="primary" :loading="overviewLoading">Benutzer erstellen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header><h3 class="font-medium">Mitgliedschaft zuweisen</h3></template>
          <form class="space-y-3" @submit.prevent="grantMembership">
            <select
              v-model="membershipForm.userId"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Benutzer wählen</option>
              <option v-for="u in overview?.users || []" :key="u.id" :value="u.id">{{ u.email }}</option>
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
            <UButton type="submit" color="primary" :loading="overviewLoading">Zuweisen</UButton>
          </form>
        </UCard>

        <UCard>
          <template #header><h3 class="font-medium">Benutzer bearbeiten</h3></template>
          <form class="space-y-3" @submit.prevent="updateUser">
            <select
              v-model="userEditForm.userId"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="">Benutzer wählen</option>
              <option v-for="u in overview?.users || []" :key="u.id" :value="u.id">{{ u.email }}</option>
            </select>
            <UInput v-model="userEditForm.name" placeholder="Anzeigename (leer = null)" />
            <UInput v-model="userEditForm.password" type="password" placeholder="Neues Passwort (optional)" />
            <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input v-model="userEditForm.isSuperadmin" type="checkbox" />
              Superadmin-Rechte
            </label>
            <UButton type="submit" color="secondary" :loading="overviewLoading">Speichern</UButton>
          </form>
        </UCard>
      </div>

      <UCard>
        <template #header><h3 class="font-medium">Benutzer & Rechte</h3></template>
        <div v-if="!overview?.users?.length" class="text-sm text-neutral-500">Noch keine Benutzerdaten geladen.</div>
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
  </UContainer>
</template>
