/**
 * Loads environment variables from the project root `.env` file.
 *
 * News API keys are stored in `.env` and read by each script. The `.env`
 * file is gitignored; never commit keys.
 */

import { config } from "dotenv";
import { resolve } from "node:path";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  config({ path: resolve(".env") });
  loaded = true;
}

export function getEnv(key: string): string | undefined {
  loadEnv();
  return process.env[key];
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}
