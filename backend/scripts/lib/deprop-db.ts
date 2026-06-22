/**
 * De-propagation database.
 *
 * Mirrors the schema of the main news aggregation database and stores
 * agent-rewritten, neutral versions of source articles.
 */

import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { initSchema, ensureDbFromTemplate } from "./db";

export const DEPROP_DB_PATH = resolve(process.cwd(), "backend/db/deprop.db");
export const DEPROP_TEMPLATE_PATH = resolve(process.cwd(), "backend/db/deprop.db.template");

export function openDepropDb(path = DEPROP_DB_PATH): DatabaseSync {
  ensureDbFromTemplate(path, DEPROP_TEMPLATE_PATH);
  return new DatabaseSync(path);
}

export function initDepropDb(db = openDepropDb()): DatabaseSync {
  initSchema(db);
  return db;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = initDepropDb();
  db.close();
  console.error(`Initialized deprop database at ${DEPROP_DB_PATH}`);
}
