#!/usr/bin/env node
/**
 * Deploy helper for Botwin's Morning Wire.
 *
 * Usage:
 *   CLOUDFLARE_PAGES_PROJECT=my-project npm run deploy
 *
 * This script exists so the Cloudflare Pages project name can be kept out of
 * package.json and source control. Set CLOUDFLARE_PAGES_PROJECT in your .env
 * file or shell environment.
 */

import "dotenv/config";
import { execSync } from "node:child_process";

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT;

if (!projectName) {
  console.error(
    "Error: CLOUDFLARE_PAGES_PROJECT is not set.",
    "Add it to your .env file (e.g., CLOUDFLARE_PAGES_PROJECT=my-project).",
  );
  process.exit(1);
}

execSync(`npx wrangler pages deploy .output --project-name=${projectName}`, {
  stdio: "inherit",
});
