#!/usr/bin/env node
/**
 * Clean up leftover rewrite chunk/output directories and stale daily.md before
 * starting a new rewrite pass.
 *
 * Run from the repository root:
 *   npx tsx agentskills/clean-chunks/clean-chunks.ts
 */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = "/Users/ryokobotwin/Desktop/newsapp/the-daily-ledger";

const targets = [
  "drafts/rewrite_chunks",
  "drafts/rewrite_outputs",
  "drafts/rewrite_parts",
  "drafts/rewrite_repair_outputs",
  "drafts/rewrite_repairs",
  "drafts/daily.md",
].map((t) => resolve(REPO_ROOT, t));

const removed: string[] = [];
const missing: string[] = [];

for (const target of targets) {
  const path = target;
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    removed.push(target);
  } else {
    missing.push(target);
  }
}

console.log("--- Clean chunks complete ---");
if (removed.length > 0) {
  console.log("Removed:");
  for (const item of removed) {
    console.log(`  - ${item}`);
  }
} else {
  console.log("Nothing to remove.");
}
if (missing.length > 0) {
  console.log("Already absent:");
  for (const item of missing) {
    console.log(`  - ${item}`);
  }
}
