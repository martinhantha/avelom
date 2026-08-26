<script setup lang="ts">
const { alert, dismiss, canAskNotifications, enableNotifications } = useAppointmentAlerts();

const when = computed(() => {
  if (!alert.value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(alert.value.startsAt));
});

async function openAppointments() {
  dismiss();
  await navigateTo("/appointments");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="alert"
      class="fixed inset-x-3 z-[80] flex justify-center pointer-events-none"
      style="top: max(0.75rem, var(--app-safe-top))"
    >
      <div
        class="pointer-events-auto w-full max-w-md rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-neutral-900 shadow-lg p-4"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/50 p-2">
            <UIcon name="i-lucide-calendar-plus" class="size-5 text-primary-700 dark:text-primary-200" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">Neuer Termin</p>
            <p class="mt-0.5 text-sm text-neutral-800 dark:text-neutral-100 truncate">{{ alert.title }}</p>
            <p class="mt-0.5 text-xs text-neutral-500">
              {{ when }}
              <span v-if="alert.teacherName"> · {{ alert.teacherName }}</span>
            </p>
            <div class="mt-3 flex justify-end gap-2">
              <UButton v-if="canAskNotifications" size="xs" variant="soft" color="neutral" @click="enableNotifications">
                Mitteilungen
              </UButton>
              <UButton size="xs" variant="ghost" color="neutral" @click="dismiss">Schließen</UButton>
              <UButton size="xs" color="primary" icon="i-lucide-calendar-days" @click="openAppointments">
                Ansehen
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
