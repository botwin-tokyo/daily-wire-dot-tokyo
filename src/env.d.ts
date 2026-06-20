/// <reference types="@cloudflare/workers-types" />

export interface CloudflareEnv {
  DB?: D1Database;
  KV?: KVNamespace;
  ADMIN_TOKEN?: string;
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
