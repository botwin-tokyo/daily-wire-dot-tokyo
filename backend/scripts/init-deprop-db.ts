#!/usr/bin/env node
/**
 * Initialize the de-propagation database.
 *
 * Creates backend/db/deprop.db with the same schema as the main news database.
 */

import { initDepropDb, DEPROP_DB_PATH } from "./lib/deprop-db";

const db = initDepropDb();
db.close();
console.log(`Initialized deprop database at ${DEPROP_DB_PATH}`);
