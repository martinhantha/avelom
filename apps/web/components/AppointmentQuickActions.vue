<script setup lang="ts">
import { computed } from "vue";
import {
  resolveAppointmentPhone,
  toTelHref,
  toWhatsAppHref,
  type AppointmentContactSource,
} from "../utils/appointment-contact";

const props = withDefaults(
  defineProps<{
    appointment: AppointmentContactSource & { status: string };
    loading?: boolean;
    compact?: boolean;
    showComplete?: boolean;
    showDelete?: boolean;
  }>(),
  {
    loading: false,
    compact: false,
    showComplete: true,
    showDelete: true,
  },
);

const emit = defineEmits<{
  complete: [];
  delete: [];
}>();

const phone = computed(() => resolveAppointmentPhone(props.appointment));
const telHref = computed(() => (phone.value ? toTelHref(phone.value) : null));
const whatsappHref = computed(() => (phone.value ? toWhatsAppHref(phone.value) : null));
const canComplete = computed(
  () =>
    props.showComplete &&
    props.appointment.status !== "completed" &&
    props.appointment.status !== "cancelled",
);
const canDelete = computed(() => props.showDelete);
const hasActions = computed(
  () => Boolean(telHref.value || whatsappHref.value || canComplete.value || canDelete.value),
);
</script>

<template>
  <div v-if="hasActions" class="flex flex-wrap items-center justify-end gap-1.5">
    <UButton
      v-if="telHref"
      :href="telHref"
      :size="compact ? 'xs' : 'sm'"
      color="neutral"
      variant="soft"
      icon="i-lucide-phone"
      :square="compact"
      :aria-label="compact ? 'Anrufen' : undefined"
    >
      <span v-if="!compact">Anrufen</span>
    </UButton>
    <UButton
      v-if="whatsappHref"
      :href="whatsappHref"
      target="_blank"
      rel="noopener noreferrer"
      :size="compact ? 'xs' : 'sm'"
      color="success"
      variant="soft"
      icon="i-lucide-message-circle"
      :square="compact"
      :aria-label="compact ? 'WhatsApp öffnen' : undefined"
    >
      <span v-if="!compact">WhatsApp</span>
    </UButton>
    <UButton
      v-if="canComplete"
      :size="compact ? 'xs' : 'sm'"
      color="success"
      :variant="compact ? 'ghost' : 'soft'"
      icon="i-lucide-check"
      :loading="loading"
      :square="compact"
      :aria-label="compact ? 'Als erledigt markieren' : undefined"
      @click="emit('complete')"
    >
      <span v-if="!compact">Erledigt</span>
    </UButton>
    <UButton
      v-if="canDelete"
      :size="compact ? 'xs' : 'sm'"
      color="error"
      :variant="compact ? 'ghost' : 'soft'"
      icon="i-lucide-trash-2"
      :loading="loading"
      :square="compact"
      :aria-label="compact ? 'Termin löschen' : undefined"
      @click="emit('delete')"
    >
      <span v-if="!compact">Löschen</span>
    </UButton>
  </div>
</template>
