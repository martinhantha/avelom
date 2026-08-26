export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  compatibilityDate: "2025-04-01",
  runtimeConfig: {
    /** HttpOnly-Session-Cookie (nur Server) */
    authCookie: process.env.AUTH_COOKIE_NAME ?? "avelom_at",
    public: {
      demoEmail: process.env.NUXT_PUBLIC_DEMO_EMAIL ?? "demo@avelom.local",
    },
  },
  nitro: {
    rollupConfig: {
      external: ["@prisma/client", ".prisma/client"],
    },
    routeRules: {
      "/api/v1/tenants/**/events": {
        headers: {
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        },
      },
    },
  },
  vite: {
    optimizeDeps: {
      include: ["@capacitor/core", "@capacitor-community/contacts", "@avelom/capacitor-call-hints"],
    },
    resolve: {
      dedupe: [
        "vue",
        "@vue/runtime-core",
        "@vue/runtime-dom",
        "@vue/server-renderer",
        "@vue/shared",
      ],
    },
  },
  // Reka (Nuxt UI) als CJS aus node_modules lädt sonst ein anderes @vue/runtime-core als der SSR-Bundle.
  ssr: {
    noExternal: ["reka-ui", "vaul-vue", "@avelom/device-capabilities", "@avelom/capacitor-call-hints"],
  },
  app: {
    head: {
      title: "Avelom",
      meta: [
        { name: "description", content: "Avelom — Prototyp Schnellerfassung & Planung" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#000000" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    },
  },
});
