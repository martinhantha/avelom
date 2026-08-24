<script setup lang="ts">
import { computed, ref } from "vue";

const emit = defineEmits<{
  close: [];
  pickedContext: [text: string];
}>();

const step = ref(0);
const answers = ref<string[]>([]);
const note = ref("");

const questions = [
  {
    prompt: "Welcher „Martin“ ist gemeint?",
    options: ["Martin Keller (Fluglehrer)", "Martin Huber (Skilehrer)"],
  },
  {
    prompt: "Dauer der Stunde?",
    options: ["60 Minuten", "90 Minuten"],
  },
];

const isDone = computed(() => step.value >= questions.length);

function pick(option: string) {
  answers.value[step.value] = option;
  if (step.value < questions.length - 1) {
    step.value += 1;
  } else {
    step.value = questions.length;
  }
}

function reset() {
  step.value = 0;
  answers.value = [];
  note.value = "";
}

function takeOver() {
  const lines = questions
    .map((q, i) => (answers.value[i] ? `${q.prompt} → ${answers.value[i]}` : null))
    .filter(Boolean) as string[];
  if (note.value.trim()) lines.push(note.value.trim());
  emit("pickedContext", lines.join("\n"));
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-neutral-600 dark:text-neutral-400">
      Der Assistent stellt Gegenfragen, um den Kontext zu klären, bevor du den Termin erfasst.
    </p>

    <div v-if="!isDone" class="space-y-3">
      <div class="text-xs uppercase tracking-wide text-neutral-500">
        Frage {{ step + 1 }} / {{ questions.length }}
      </div>
      <p class="font-medium">{{ questions[step].prompt }}</p>
      <div class="flex flex-col gap-2">
        <UButton
          v-for="o in questions[step].options"
          :key="o"
          size="lg"
          block
          color="neutral"
          variant="soft"
          @click="pick(o)"
        >
          {{ o }}
        </UButton>
      </div>
      <UButton variant="link" color="neutral" size="sm" @click="step = questions.length">
        Später klären
      </UButton>
    </div>

    <div v-else class="space-y-3">
      <UAlert
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        title="Kontext vollständig"
        description="Alle Antworten wurden erfasst – jetzt als Kontakttext übernehmen oder erweitern."
      />
      <ul class="space-y-1 text-sm">
        <li
          v-for="(q, idx) in questions"
          :key="q.prompt"
          class="flex items-start gap-2"
        >
          <UIcon name="i-lucide-corner-down-right" class="size-4 mt-0.5 text-neutral-400" />
          <span class="text-neutral-600 dark:text-neutral-400 flex-1">
            <span class="text-neutral-500">{{ q.prompt }}</span>
            <span class="ml-1 font-medium text-neutral-900 dark:text-neutral-100">
              {{ answers[idx] || "—" }}
            </span>
          </span>
        </li>
      </ul>
      <UFormField label="Zusätzliche Notiz (optional)">
        <UTextarea v-model="note" autoresize :rows="2" placeholder="z. B. Kunde ruft um 16 Uhr zurück" />
      </UFormField>
    </div>

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <UButton variant="ghost" color="neutral" @click="reset">Neu starten</UButton>
      <UButton variant="ghost" color="neutral" @click="emit('close')">Schließen</UButton>
      <UButton
        color="primary"
        icon="i-lucide-arrow-right"
        :disabled="!isDone"
        @click="takeOver"
      >
        In Termin übernehmen
      </UButton>
    </div>
  </div>
</template>
