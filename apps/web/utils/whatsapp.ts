import type { DevicePlatform } from "@avelom/device-capabilities";

export type WhatsAppApp = "whatsapp" | "business";

export const WHATSAPP_APP_STORAGE_KEY = "avelom.device.whatsappApp";

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

export function toWhatsAppHref(
  phone: string,
  options?: { app?: WhatsAppApp; platform?: DevicePlatform },
): string {
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

  const app = options?.app ?? "whatsapp";
  const platform = options?.platform ?? "web";

  if (app === "business") {
    if (platform === "android") {
      return `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    }
    if (platform === "ios") {
      return `whatsapp-business://send?phone=${digits}`;
    }
  }

  return `https://wa.me/${digits}`;
}

export function openWhatsAppUrl(href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  const link = document.createElement("a");
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
