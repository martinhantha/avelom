<script setup lang="ts">
const step = ref(0);
const lastAnswer = ref<string | null>(null);
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
function pick(option: string) {
  lastAnswer.value = option;
  if (step.value < questions.length - 1) step.value += 1;
  else step.value = questions.length;
}
</script>

<template>
  <UContainer class="py-6 space-y-6 max-w-lg">
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/" />
      <h1 class="text-xl font-semibold">Assistenz</h1>
    </div>

    <template v-if="step < questions.length">
      <p class="font-medium">{{ questions[step].prompt }}</p>
      <div class="flex flex-col gap-3">
        <UButton
          v-for="o in questions[step].options"
          :key="o"
          size="xl"
          block
          color="neutral"
          variant="soft"
          @click="pick(o)"
        >
          {{ o }}
        </UButton>
      </div>
      <UButton variant="link" color="neutral" size="sm">Später klären</UButton>
    </template>

    <template v-else>
      <UAlert
        color="success"
        variant="subtle"
        title="Kontext vollständig"
        :description="lastAnswer ? `Letzte Antwort: ${lastAnswer}` : 'Weiter zum Termin (Mock).'"
      />
      <UButton to="/quick-capture" block size="xl" color="primary">Zur Schnellerfassung</UButton>
    </template>
  </UContainer>
</template>
