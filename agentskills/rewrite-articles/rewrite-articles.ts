#!/usr/bin/env node
/**
 * Rewrite recent articles from backend/db/news.db into neutral, propaganda-free
 * copy and store them in backend/db/deprop.db.
 *
 * Run from the repository root:
 *   npx tsx agentskills/rewrite-articles/rewrite-articles.ts
 *
 * Requires OPENAI_API_KEY (or a compatible key) in the environment.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, initSchema, startRun, finishRun, insertArticles } from "../../backend/scripts/lib/db";
import { openDepropDb } from "../../backend/scripts/lib/deprop-db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BATCH_SIZE = Number(process.env.REWRITE_BATCH_SIZE ?? "50");

const STYLE_PATH = resolve(__dirname, "STYLE.md");

interface SourceArticle {
  id: number;
  source: string;
  category: string;
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  author: string | null;
  language: string | null;
  fetchedAt: string;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error("OPENAI_API_KEY is required. Set it in your environment and try again.");
    process.exit(1);
  }

  const styleGuide = readFileSync(STYLE_PATH, "utf-8");
  const sourceDb = openDb();
  initSchema(sourceDb);

  const rows = sourceDb
    .prepare(
      `
      SELECT DISTINCT *
      FROM articles
      WHERE datetime(publishedAt) > datetime('now', '-1 day')
      ORDER BY publishedAt DESC
      LIMIT ?
    `,
    )
    .all(BATCH_SIZE) as SourceArticle[];

  if (rows.length === 0) {
    console.log("No articles from the last 24 hours to rewrite.");
    sourceDb.close();
    return;
  }

  const depropDb = openDepropDb();
  initSchema(depropDb);

  const existingUrls = new Set(
    (depropDb.prepare("SELECT url FROM articles").all() as { url: string }[]).map((r) => r.url),
  );

  const toRewrite = rows.filter((row) => !existingUrls.has(row.url));
  const skippedDuplicates = rows.length - toRewrite.length;

  if (toRewrite.length === 0) {
    console.log(`All ${rows.length} recent articles are already in deprop.db.`);
    sourceDb.close();
    depropDb.close();
    return;
  }

  console.log(`Rewriting ${toRewrite.length} articles (${skippedDuplicates} already in deprop.db)...\n`);

  const runId = startRun(depropDb);
  let ok = 0;
  let error = 0;
  const rewrites = [];

  for (let i = 0; i < toRewrite.length; i++) {
    const row = toRewrite[i];
    const label = `${row.source}/${row.category}: ${row.title}`;
    try {
      const title = await rewriteHeadline(row.title, row, styleGuide);
      const summary = await rewriteBody(row.summary ?? "", row, styleGuide, "summary");
      const content = await rewriteBody(row.content ?? summary, row, styleGuide, "article");

      rewrites.push({
        source: row.source,
        category: row.category,
        title,
        url: row.url,
        summary,
        content,
        publishedAt: row.publishedAt,
        imageUrl: row.imageUrl,
        author: row.author,
        language: row.language,
        fetchedAt: new Date().toISOString(),
      });

      ok++;
      console.log(`✅ [${i + 1}/${toRewrite.length}] ${label}`);
    } catch (err) {
      error++;
      console.log(`❌ [${i + 1}/${toRewrite.length}] ${label} — ${(err as Error).message}`);
    }
  }

  const { inserted, duplicates } = insertArticles(depropDb, runId, rewrites);
  finishRun(depropDb, runId, {
    total: toRewrite.length,
    ok,
    missingKey: 0,
    skipped: skippedDuplicates + duplicates,
    error,
  });

  console.log(`\n--- Rewrite complete ---`);
  console.log(`Run #${runId}: ${ok} rewritten, ${error} errors, ${skippedDuplicates} pre-existing duplicates`);
  console.log(`Inserted into deprop.db: ${inserted}`);

  sourceDb.close();
  depropDb.close();
}

async function rewriteHeadline(
  headline: string,
  article: SourceArticle,
  styleGuide: string,
): Promise<string> {
  const prompt = `Rewrite the following news headline so it is neutral, factual, and free of propaganda or partisan framing.

Source: ${article.source}
Category: ${article.category}
Original headline: ${headline}

Return ONLY the rewritten headline, with no quotation marks or extra commentary.`;

  return callLLM(prompt, styleGuide);
}

async function rewriteBody(
  text: string,
  article: SourceArticle,
  styleGuide: string,
  mode: "summary" | "article",
): Promise<string> {
  if (!text.trim()) {
    return "";
  }

  const label = mode === "summary" ? "short summary" : "full article";
  const prompt = `Rewrite the following ${label} in a neutral, propaganda-free, Pulitzer-grade wire-service style.

Source: ${article.source}
Category: ${article.category}
Title: ${article.title}
URL: ${article.url}

Original text:
---
${text}
---

Return ONLY the rewritten ${label}, with no extra commentary.`;

  return callLLM(prompt, styleGuide);
}

async function callLLM(prompt: string, styleGuide: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are an elite wire-service editor. Follow this style guide exactly:\n\n${styleGuide}`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (json.error?.message) {
    throw new Error(`LLM API error: ${json.error.message}`);
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  return content;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
