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
import { initSchema } from "./db";

export const DEPROP_DB_PATH = resolve(process.cwd(), "backend/db/deprop.db");

export function openDepropDb(path = DEPROP_DB_PATH): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  return new DatabaseSync(path);
}

export function initDepropDb(db = openDepropDb()): DatabaseSync {
  initSchema(db);
  return db;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = initDepropDb();
  db.close();
  console.error(`Initialized deprop database at ${DEPROP_DB_PATH}`);
}
