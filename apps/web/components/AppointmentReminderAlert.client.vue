<script setup lang="ts">
const { reminder, minutesLeft, teacherLabel, dismiss } = useAppointmentReminders();

const open = computed({
  get: () => Boolean(reminder.value),
  set: (value) => {
    if (!value) dismiss();
  },
});

const when = computed(() => {
  if (!reminder.value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(reminder.value.startsAt));
});

async function openAppointment() {
  dismiss();
  await navigateTo("/appointments");
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template v-if="reminder">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bell-ring" class="size-5 text-primary-600" />
          <h2 class="font-semibold">Terminerinnerung</h2>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Dein Termin beginnt in {{ minutesLeft }} Minuten.
        </p>
        <p class="mt-3 text-lg font-semibold">{{ reminder.title }}</p>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {{ when }}
          <span v-if="reminder.teacherName"> · {{ teacherLabel }}: {{ reminder.teacherName }}</span>
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="dismiss">Später</UButton>
          <UButton color="primary" icon="i-lucide-calendar-days" @click="openAppointment">
            Ansehen
          </UButton>
        </div>
      </template>
    </template>
  </UModal>
</template>
