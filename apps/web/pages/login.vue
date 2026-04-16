<script setup lang="ts">
definePageMeta({
  public: true,
  layout: false,
});

const config = useRuntimeConfig().public;
const { login } = useAuth();

const email = ref(config.demoEmail);
const password = ref("");
const pending = ref(false);
const errorMsg = ref("");

const route = useRoute();

async function onSubmit() {
  errorMsg.value = "";
  pending.value = true;
  try {
    await login(email.value.trim(), password.value);
    const raw = route.query.redirect;
    const redirect = typeof raw === "string" ? raw : null;
    const safe =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    await navigateTo(safe);
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string };
    errorMsg.value = err?.data?.message || err?.statusMessage || "Anmeldung fehlgeschlagen";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-dvh flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50"
  >
    <div class="w-full max-w-md space-y-6">
      <div class="text-center space-y-1">
        <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Avelom</p>
        <h1 class="text-2xl font-semibold tracking-tight">Anmelden</h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Mitorganisation und Nutzerkontext für die Prototyp-Seiten.
        </p>
      </div>

      <UCard>
        <template #header>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            E-Mail und Passwort wie in der API / Datenbank hinterlegt.
          </p>
        </template>

        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          :title="errorMsg"
          class="mb-4"
          icon="i-lucide-circle-alert"
        />

        <form class="space-y-4" @submit.prevent="onSubmit">
          <UFormField label="E-Mail" name="email">
            <UInput
              v-model="email"
              type="email"
              autocomplete="username"
              size="lg"
              class="w-full"
              placeholder="name@beispiel.de"
            />
          </UFormField>
          <UFormField label="Passwort" name="password">
            <UInput
              v-model="password"
              type="password"
              autocomplete="current-password"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="pending" :disabled="pending">
            Anmelden
          </UButton>
        </form>

        <template #footer>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Nach
            <code class="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-[0.7rem]">pnpm db:seed</code>
            gibt es den Demo-Nutzer
            <strong>{{ config.demoEmail }}</strong>
            mit Standardpasswort
            <code class="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-[0.7rem]">demo123</code>
            (oder dem Wert von <code class="text-[0.65rem]">SEED_DEMO_PASSWORD</code>).
          </p>
        </template>
      </UCard>
    </div>
  </div>
</template>
