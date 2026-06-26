#!/usr/bin/env node
/**
 * Read articles from the latest fetch run in backend/db/news.db, split them into
 * manageable chunks, and write each chunk as a markdown file in
 * drafts/rewrite_chunks/.
 *
 * Run from the repository root:
 *   npx tsx agentskills/chunk-articles/chunk-articles.ts
 *
 * Articles already present in backend/db/deprop.db are skipped so they are not
 * rewritten twice.
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

interface Article {
  id: number;
  source: string;
  category: string;
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  author: string | null;
  imageUrl: string | null;
  language: string | null;
}

const DEFAULT_OUT_DIR = resolve(process.cwd(), "drafts/rewrite_chunks");
const DEFAULT_MAX_ARTICLES = 20;
const DEFAULT_MAX_WORDS = 16_000;

function openNewsDb(): DatabaseSync {
  const path = resolve(process.cwd(), "backend/db/news.db");
  if (!existsSync(path)) {
    throw new Error(`News database not found at ${path}. Run the fetch-news skill first.`);
  }
  return new DatabaseSync(path);
}

function getRewrittenUrls(): Set<string> {
  const path = resolve(process.cwd(), "backend/db/deprop.db");
  if (!existsSync(path)) return new Set();
  const db = new DatabaseSync(path);
  try {
    const stmt = db.prepare("SELECT url FROM articles");
    const rows = stmt.all() as Array<{ url: string }>;
    return new Set(rows.map((r) => r.url));
  } finally {
    db.close();
  }
}

function getLatestRunId(db: DatabaseSync): number {
  const stmt = db.prepare("SELECT id FROM runs ORDER BY startedAt DESC LIMIT 1");
  const row = stmt.get() as { id: number } | undefined;
  if (!row) {
    throw new Error("No fetch runs found in news.db. Run the fetch-news skill first.");
  }
  return row.id;
}

function fetchLatestRunArticles(): Article[] {
  const db = openNewsDb();
  try {
    const runId = getLatestRunId(db);
    const stmt = db.prepare(`
      SELECT *
      FROM articles
      WHERE runId = ?
      ORDER BY category, datetime(COALESCE(publishedAt, fetchedAt)) DESC
    `);
    return stmt.all(runId) as Article[];
  } finally {
    db.close();
  }
}

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function articleWords(a: Article): number {
  return wordCount(a.content) || wordCount(a.summary);
}

function chunkByCategory(articles: Article[]): Article[][] {
  const byCategory = new Map<string, Article[]>();
  for (const article of articles) {
    const cat = (article.category || "general").toLowerCase();
    const list = byCategory.get(cat) ?? [];
    list.push(article);
    byCategory.set(cat, list);
  }

  const chunks: Article[][] = [];
  for (const [, list] of byCategory) {
    let current: Article[] = [];
    let currentWords = 0;

    for (const article of list) {
      const words = articleWords(article);
      const wouldExceedWords =
        currentWords > 0 && currentWords + words > DEFAULT_MAX_WORDS;
      const wouldExceedCount = current.length >= DEFAULT_MAX_ARTICLES;

      if ((wouldExceedWords || wouldExceedCount) && current.length > 0) {
        chunks.push(current);
        current = [];
        currentWords = 0;
      }

      current.push(article);
      currentWords += words;
    }

    if (current.length > 0) chunks.push(current);
  }

  return chunks;
}

function sanitizeFilename(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function launchRewriteArticles(): void {
  const scriptPath = resolve(process.cwd(), "agentskills/rewrite-articles/rewrite-articles.ts");
  console.log("\n--- Launching rewrite-articles in background ---");
  console.log(`Script: ${scriptPath}`);

  const child = spawn("npx", ["tsx", scriptPath], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
  });

  child.on("error", (err) => {
    console.error(`Failed to spawn rewrite-articles: ${err.message}`);
  });

  child.unref();
  console.log(`Spawned rewrite-articles (pid ${child.pid}). It will run independently.`);
  console.log("Progress log: logs/rewrite-articles.log");
}

function formatChunk(
  chunk: Article[],
  chunkNumber: number,
  totalChunks: number,
  category: string,
): string {
  const header = `# Chunk ${chunkNumber} of ${totalChunks} — ${category}\n\n`;
  const body = chunk
    .map((article, index) => {
      const lines = [
        `## Article ${index + 1}: ${article.title}`,
        "",
        `- **Source:** ${article.source || "unknown"}`,
        `- **Category:** ${(article.category || "general").toLowerCase()}`,
        `- **URL:** ${article.url}`,
        `- **Published:** ${article.publishedAt || article.fetchedAt}`,
      ];
      if (article.author) lines.push(`- **Author:** ${article.author}`);
      if (article.language) lines.push(`- **Language:** ${article.language}`);
      lines.push("");
      if (article.summary) {
        lines.push(`**Summary:** ${article.summary}`);
        lines.push("");
      }
      lines.push("**Content:**");
      lines.push("");
      lines.push(article.content || article.summary || "(no content)");
      lines.push("");
      lines.push("---");
      return lines.join("\n");
    })
    .join("\n\n");

  return `${header}${body}\n`;
}

function main(): void {
  const outDir = DEFAULT_OUT_DIR;
  mkdirSync(outDir, { recursive: true });

  // Clear any existing chunk files from a previous run.
  for (const entry of readdirSync(outDir)) {
    rmSync(resolve(outDir, entry), { recursive: true, force: true });
  }

  const rewrittenUrls = getRewrittenUrls();
  const articles = fetchLatestRunArticles().filter(
    (a) => !rewrittenUrls.has(a.url),
  );

  if (articles.length === 0) {
    console.log("No new articles to chunk. Either fetch-news has not run yet or every article in the latest run has already been rewritten.");
    return;
  }

  const chunks = chunkByCategory(articles);
  const categoryCounts = new Map<string, number>();
  const categoryTotals = new Map<string, number>();

  for (const chunk of chunks) {
    const category = (chunk[0].category || "general").toLowerCase();
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + 1);
  }

  for (const chunk of chunks) {
    const category = (chunk[0].category || "general").toLowerCase();
    const current = (categoryCounts.get(category) ?? 0) + 1;
    categoryCounts.set(category, current);

    const total = categoryTotals.get(category) ?? 1;
    const fileName = `${sanitizeFilename(category)}-${current}of${total}.md`;
    const filePath = resolve(outDir, fileName);
    const markdown = formatChunk(chunk, current, total, category);
    writeFileSync(filePath, markdown, "utf-8");
  }

  console.log("--- Chunk articles complete ---");
  console.log(`Articles from latest fetch run: ${articles.length}`);
  console.log(`Chunks written: ${chunks.length}`);
  console.log(`Output: ${outDir}`);
  for (const [category, total] of categoryTotals) {
    console.log(`  ${category}: ${total} chunk(s)`);
  }

  launchRewriteArticles();
}

main();
