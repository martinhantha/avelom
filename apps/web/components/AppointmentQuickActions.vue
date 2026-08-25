<script setup lang="ts">
import { computed, ref } from "vue";
import { useDeviceCapabilities } from "../composables/useDeviceCapabilities";
import {
  resolveAppointmentDisplayName,
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

const { device } = useDeviceCapabilities();
const savingContact = ref(false);
const contactSaveState = ref<"idle" | "saved" | "error">("idle");

const phone = computed(() => resolveAppointmentPhone(props.appointment));
const telHref = computed(() => (phone.value ? toTelHref(phone.value) : null));
const whatsappHref = computed(() => (phone.value ? toWhatsAppHref(phone.value) : null));
const canSaveContact = computed(() => device.value.features.saveContact && Boolean(phone.value));
const canComplete = computed(
  () =>
    props.showComplete &&
    props.appointment.status !== "completed" &&
    props.appointment.status !== "cancelled",
);
const canDelete = computed(() => props.showDelete);
const hasActions = computed(
  () =>
    Boolean(
      telHref.value ||
        whatsappHref.value ||
        canSaveContact.value ||
        canComplete.value ||
        canDelete.value,
    ),
);

async function saveDeviceContact() {
  if (!phone.value) return;
  savingContact.value = true;
  contactSaveState.value = "idle";
  try {
    await device.value.saveOrUpdateDeviceContact({
      displayName: resolveAppointmentDisplayName(props.appointment),
      phoneE164: phone.value,
      note: "Avelom",
    });
    contactSaveState.value = "saved";
  } catch {
    contactSaveState.value = "error";
  } finally {
    savingContact.value = false;
  }
}
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
      v-if="canSaveContact"
      :size="compact ? 'xs' : 'sm'"
      color="neutral"
      variant="soft"
      icon="i-lucide-user-plus"
      :loading="savingContact"
      :square="compact"
      :aria-label="compact ? 'Kontakt speichern' : undefined"
      @click="saveDeviceContact"
    >
      <span v-if="!compact">
        {{ contactSaveState === "saved" ? "Gespeichert" : contactSaveState === "error" ? "Fehler" : "Kontakt" }}
      </span>
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
