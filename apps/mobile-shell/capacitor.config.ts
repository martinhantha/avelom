import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "at.avelom.app",
  appName: "Avelom",
  webDir: "www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        androidScheme: "https",
      }
    : {
        androidScheme: "https",
      },
  android: {
    allowMixedContent: Boolean(serverUrl?.startsWith("http://")),
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
