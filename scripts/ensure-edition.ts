#!/usr/bin/env node
/**
 * Ensure a published edition exists before building for deploy.
 *
 * Cloudflare Pages builds from a clean checkout won't have generated edition
 * data because public/data/*.json is gitignored. This script fails fast with a
 * clear message instead of letting the build produce a broken site.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const EDITION_PATH = resolve(process.cwd(), "public/data/current-edition.json");

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  console.error(
    `\nTo generate edition data, run the pipeline on a machine with the local LLM:`
  );
  console.error(`  1. npx tsx agentskills/fetch-news... (or /fetch-news via Hermes)`);
  console.error(`  2. /clean-chunks via Hermes`);
  console.error(`  3. /chunk-articles via Hermes (auto-spawns rewrite)`);
  console.error(`  4. /publish-pipeline via Hermes`);
  console.error(
    `\nOr, if you already have data locally, make sure public/data/current-edition.json exists.\n`
  );
  process.exit(1);
}

if (!existsSync(EDITION_PATH)) {
  fail(`No edition data found at ${EDITION_PATH}`);
}

let raw: string;
try {
  raw = readFileSync(EDITION_PATH, "utf-8");
} catch (error) {
  fail(`Could not read ${EDITION_PATH}: ${(error as Error).message}`);
}

try {
  const parsed = JSON.parse(raw);
  if (!parsed.editionDate || !Array.isArray(parsed.articles)) {
    fail(`${EDITION_PATH} is missing editionDate or articles array`);
  }
} catch (error) {
  fail(`${EDITION_PATH} is not valid JSON: ${(error as Error).message}`);
}

console.log(`✅ Edition data ready: ${EDITION_PATH}`);
