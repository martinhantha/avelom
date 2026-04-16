declare module "nuxt/schema" {
  interface RuntimeConfig {
    authCookie: string;
  }
  interface PublicRuntimeConfig {
    demoEmail: string;
  }
  interface PageMeta {
    /** Route ohne Login (z. B. /login) */
    public?: boolean;
  }
}

export {};
