<script setup lang="ts">
const text = ref("");
const chips = ["Luis · 14:00", "Schnupperflug 60 Min", "Gleich wie letzter Termin"];

function applyChip(label: string) {
  text.value = label;
}
</script>

<template>
  <UContainer class="py-6 space-y-6 max-w-lg">
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/" />
      <h1 class="text-xl font-semibold">Schnellerfassung</h1>
    </div>

    <p class="text-sm text-neutral-600 dark:text-neutral-400">
      Ein Feld, große Flächen, optional Sprache (Platzhalter). Ziel: Speichern in wenigen Sekunden.
    </p>

    <UTextarea
      v-model="text"
      autoresize
      :rows="4"
      size="xl"
      placeholder="z. B. Morgen 14 Uhr Stunde mit Luis und Lehrer Martin"
      class="w-full"
    />

    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="c in chips"
        :key="c"
        size="lg"
        variant="soft"
        color="neutral"
        @click="applyChip(c)"
      >
        {{ c }}
      </UButton>
    </div>

    <div class="flex gap-3">
      <UButton icon="i-lucide-mic" size="xl" color="neutral" variant="outline" disabled>
        Sprache
      </UButton>
      <UButton size="xl" color="primary" class="flex-1" :disabled="!text">
        Übernehmen &amp; speichern
      </UButton>
    </div>
  </UContainer>
</template>
