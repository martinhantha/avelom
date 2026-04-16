<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { $fetch } from "ofetch";
import { useAuth } from "../composables/useAuth";
import type { SuperadminOverview, TenantRole } from "../types/superadmin";

const { user, primaryTenant } = useAuth();
const isSuperadmin = computed(() => Boolean(user.value?.isSuperadmin));

const overview = ref<SuperadminOverview | null>(null);
const saLoading = ref(false);
const saError = ref("");
const saInfo = ref("");

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
  if (isSuperadmin.value) {
    loadOverview();
  }
});
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="space-y-2">
      <p class="text-sm text-muted font-medium">Avelom · UX-Prototyp</p>
      <h1 class="text-2xl font-semibold tracking-tight">Heute</h1>
      <p class="text-neutral-600 dark:text-neutral-400 max-w-prose">
        Kernflows zum Klicken: Schnellerfassung (&lt; 5 s), Konflikt mit Alternativen, Assistenz-Klärung.
      </p>
      <p v-if="user" class="text-sm text-neutral-600 dark:text-neutral-400">
        Angemeldet als <strong>{{ user.name || user.email }}</strong>
        <template v-if="primaryTenant">
          · Mandant <strong>{{ primaryTenant.tenantName }}</strong>
        </template>
        <template v-if="user.isSuperadmin"> · <strong>Superadmin</strong></template>
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <UButton to="/quick-capture" block size="xl" color="primary" icon="i-lucide-zap">
        Schnellerfassung
      </UButton>
      <UButton to="/conflict-demo" block size="xl" variant="outline" icon="i-lucide-git-merge">
        Konflikt / Alternativen
      </UButton>
      <UButton to="/assistant-demo" block size="xl" variant="soft" icon="i-lucide-message-circle-question">
        Assistenz (Gegenfragen)
      </UButton>
    </div>

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
  </UContainer>
</template>
