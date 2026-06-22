#!/usr/bin/env node
/**
 * Populate the deprop database with agent-written neutral rewrites.
 *
 * The agent performs the rewrites manually. After the agent saves the rewritten
 * articles as JSON, run this script from the repository root to insert them into
 * backend/db/deprop.db.
 *
 * Usage:
 *   npx tsx agentskills/rewrite-articles/populate-deprop.ts path/to/rewrites.json
 *
 * Each JSON file must contain either a single article object or an array of
 * article objects. Articles already present in deprop.db (matched by url) are
 * skipped.
 */

import { readFileSync } from "node:fs";
import { z } from "zod";
import { openDepropDb } from "../../backend/scripts/lib/deprop-db";
import { initSchema, startRun, finishRun, insertArticles } from "../../backend/scripts/lib/db";

const articleSchema = z.object({
  source: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  fetchedAt: z.string().default(() => new Date().toISOString()),
});

type ArticleInput = z.infer<typeof articleSchema>;

function loadArticlesFromFile(path: string): ArticleInput[] {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const items = Array.isArray(raw) ? raw : [raw];
  const articles: ArticleInput[] = [];

  for (let i = 0; i < items.length; i++) {
    const parsed = articleSchema.safeParse(items[i]);
    if (!parsed.success) {
      console.error(`❌ ${path}: item ${i + 1} is invalid:`);
      for (const issue of parsed.error.issues) {
        console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    articles.push(parsed.data);
  }

  return articles;
}

function main(): void {
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

  if (files.length === 0) {
    console.error("Usage: npx tsx agentskills/rewrite-articles/populate-deprop.ts <rewrites.json> [more.json ...]");
    console.error("");
    console.error("Each JSON file must contain either one article object or an array of article objects.");
    process.exit(1);
  }

  const db = openDepropDb();
  initSchema(db);

  const existingUrls = new Set(
    (db.prepare("SELECT url FROM articles").all() as { url: string }[]).map((row) => row.url),
  );

  let loaded = 0;
  const articles: ArticleInput[] = [];
  const seenUrls = new Set<string>();

  for (const file of files) {
    const batch = loadArticlesFromFile(file);
    loaded += batch.length;

    for (const article of batch) {
      if (existingUrls.has(article.url)) {
        console.log(`⏭️  Skipping existing URL from ${file}: ${article.url}`);
        continue;
      }
      if (seenUrls.has(article.url)) {
        console.log(`⏭️  Skipping duplicate URL within batch from ${file}: ${article.url}`);
        continue;
      }
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  if (articles.length === 0) {
    console.log("No new articles to insert.");
    db.close();
    return;
  }

  const runId = startRun(db);
  const { inserted, duplicates } = insertArticles(
    db,
    runId,
    articles.map((a) => ({
      ...a,
      summary: a.summary ?? null,
      content: a.content ?? null,
      publishedAt: a.publishedAt ?? null,
      imageUrl: a.imageUrl ?? null,
      author: a.author ?? null,
      language: a.language ?? null,
    })),
  );

  finishRun(db, runId, {
    total: loaded,
    ok: inserted,
    missingKey: 0,
    skipped: duplicates + (loaded - articles.length),
    error: loaded - inserted - duplicates - (loaded - articles.length),
  });

  console.log("\n--- Populate complete ---");
  console.log(`Run #${runId}`);
  console.log(`Loaded from JSON: ${loaded}`);
  console.log(`Skipped (already in DB or duplicate): ${loaded - articles.length}`);
  console.log(`Inserted: ${inserted}`);

  db.close();
}

main();
