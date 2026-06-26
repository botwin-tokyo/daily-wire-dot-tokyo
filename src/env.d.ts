/// <reference types="@cloudflare/workers-types" />

export interface CloudflareEnv {
  DB?: D1Database;
  KV?: KVNamespace;
  ADMIN_TOKEN?: string;
  EDITION_SCHEMA_VERSION?: string;
  SITE_URL?: string;
}

declare module "react-router" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AppLoadContext {}
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Env extends CloudflareEnv {}
}

export {};
