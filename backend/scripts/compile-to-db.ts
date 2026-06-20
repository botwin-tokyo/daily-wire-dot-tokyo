#!/usr/bin/env node
/**
 * Data compiler: runs every aggregation script sequentially, takes the
 * normalized articles they return, and stores them in the local SQLite database
 * at `backend/db/news.db`.
 *
 * Run with:
 *   npx tsx backend/scripts/compile-to-db.ts
 *   npm run ingest:articles
 *
 * The AI publishing agent can then query the database to browse the latest
 * articles and assemble an edition.
 */

import { listScriptFiles, runScript } from "./lib/runner";
import { openDb, initSchema, startRun, finishRun, insertArticles, getRunStats } from "./lib/db";
import { normalizeCategory } from "./lib/normalize";
import { pathToFileURL } from "node:url";
import { ensureLadder } from "../../scripts/ensure-ladder";

async function main(): Promise<void> {
  await ensureLadder();

  const db = openDb();
  initSchema(db);

  const runId = startRun(db);
  const files = listScriptFiles();

  console.error(`Starting ingest run #${runId} for ${files.length} scripts...\n`);

  let ok = 0;
  let missingKey = 0;
  let error = 0;
  let totalInserted = 0;

  for (const file of files) {
    const result = await runScript(file);
    const label = `${result.source}/${result.category}`;

    if (result.status === "ok" && result.result) {
      const articles = (result.result.articles ?? []).map((article) => ({
        source: article.source ?? result.source,
        category: normalizeCategory(article.category, result.category),
        title: article.title ?? "Untitled",
        url: article.url ?? "",
        summary: article.summary,
        content: article.content,
        publishedAt: article.publishedAt,
        imageUrl: article.imageUrl,
        author: article.author,
        language: article.language,
        fetchedAt: result.result.fetchedAt,
      }));

      const { inserted, duplicates } = insertArticles(db, runId, articles);
      totalInserted += inserted;
      ok++;
      console.log(
        `✅ ${label}: ${articles.length} fetched, ${inserted} inserted (${duplicates} dupes) — ${result.durationMs}ms`,
      );
    } else if (result.status === "missing-key") {
      missingKey++;
      console.log(`⏸️ ${label}: missing API key — ${result.durationMs}ms`);
    } else {
      error++;
      const message = result.status !== "ok" ? (result.error ?? "unknown error") : "unknown error";
      console.log(`❌ ${label}: ${message} — ${result.durationMs}ms`);
    }
  }

  finishRun(db, runId, { total: files.length, ok, missingKey, error });
  const stats = getRunStats(db);

  console.log("\n--- Ingest complete ---");
  console.log(`Run #${runId}: ${ok} ok, ${missingKey} missing key, ${error} error`);
  console.log(`Articles inserted this run: ${totalInserted}`);
  console.log(`Database totals: ${stats.runCount} runs, ${stats.articleCount} articles`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
