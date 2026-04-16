<script setup lang="ts">
const alternatives = [
  { id: "t1", title: "Anderes Zeitfenster", detail: "Heute 15:30–16:30 · Ressource frei" },
  { id: "t2", title: "Anderer Lehrer", detail: "Anna M. · gleiche Zeit · qualifiziert" },
  { id: "t3", title: "Zeit & Lehrer", detail: "Morgen 10:00 · Martin" },
];
const selected = ref<string | null>(null);
</script>

<template>
  <UContainer class="py-6 space-y-6 max-w-lg">
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/" />
      <h1 class="text-xl font-semibold">Konflikt</h1>
    </div>

    <UAlert
      color="warning"
      variant="subtle"
      title="Ressource / Lehrer nicht verfügbar"
      description="14:00–15:00 kollidiert mit bestehendem Termin. Wähle eine Alternative:"
    />

    <div class="space-y-3">
      <button
        v-for="a in alternatives"
        :key="a.id"
        type="button"
        class="w-full text-left rounded-xl border p-4 transition hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        :class="selected === a.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-neutral-200 dark:border-neutral-800'"
        @click="selected = a.id"
      >
        <p class="font-medium">{{ a.title }}</p>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{{ a.detail }}</p>
      </button>
    </div>

    <UButton size="xl" block color="primary" :disabled="!selected">
      Auswahl übernehmen
    </UButton>
  </UContainer>
</template>
