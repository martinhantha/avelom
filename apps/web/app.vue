<template>
  <!-- :toaster="null" vermeidet den UToaster-Wrapper (Reka ToastProvider), der sonst
       bei toaster=undefined aktiv ist und in Kombination mit NuxtRouteAnnouncer / Slots
       zu "Cannot read properties of null (reading 'ce')" führen kann. -->
  <UApp :toaster="null">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
