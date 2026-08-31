export type WhatsAppApp = "whatsapp" | "business";

export const WHATSAPP_APP_STORAGE_KEY = "alpiplan.device.whatsappApp";

export function readWhatsAppApp(): WhatsAppApp {
  if (typeof localStorage === "undefined") return "whatsapp";
  return localStorage.getItem(WHATSAPP_APP_STORAGE_KEY) === "business" ? "business" : "whatsapp";
}

export function persistWhatsAppApp(app: WhatsAppApp): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(WHATSAPP_APP_STORAGE_KEY, app);
}

export function whatsappAppLabel(app: WhatsAppApp): string {
  return app === "business" ? "WhatsApp Business" : "WhatsApp";
}

export function toWhatsAppHref(phone: string): string {
  let digits = phone.trim();
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `43${digits.slice(1)}`;
  }
  return `https://wa.me/${digits}`;
}
