import {
  persistWhatsAppApp,
  readWhatsAppApp,
  type WhatsAppApp,
} from "../utils/whatsapp";

const sharedApp = ref<WhatsAppApp>("whatsapp");
let hydrated = false;

export function useWhatsAppPreference() {
  if (import.meta.client && !hydrated) {
    sharedApp.value = readWhatsAppApp();
    hydrated = true;
  }

  onMounted(() => {
    sharedApp.value = readWhatsAppApp();
    hydrated = true;
  });

  function setWhatsAppApp(app: WhatsAppApp) {
    sharedApp.value = app;
    persistWhatsAppApp(app);
  }

  return { whatsappApp: sharedApp, setWhatsAppApp };
}
