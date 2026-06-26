#!/usr/bin/env node
/**
 * Populate backend/db/deprop.db with rewritten articles from drafts/daily.md.
 *
 * Run from the repository root:
 *   npx tsx agentskills/populate-depropdb/populate-depropdb.ts
 *
 * The script parses the markdown produced by the rewrite-articles skill and
 * inserts each article into the deprop database.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { initSchema, startRun, finishRun, insertArticles } from "../../backend/scripts/lib/db";
import { openDepropDb } from "../../backend/scripts/lib/deprop-db";

const DEFAULT_INPUT_PATH = resolve(process.cwd(), "drafts/daily.md");

const articleSchema = z.object({
  source: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  content: z.string().min(1),
  importance: z.number().min(1).max(10).default(5),
  topics: z.string().default(""),
});

type ParsedArticle = z.infer<typeof articleSchema>;

function extractUrl(text: string): string {
  const markdownLink = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
  if (markdownLink) return markdownLink[2].trim();
  return text.trim();
}

function parseDailyMarkdown(text: string): ParsedArticle[] {
  const lines = text.split(/\r?\n/);
  const articles: ParsedArticle[] = [];
  let currentCategory = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      i++;
      continue;
    }

    const titleMatch = line.match(/^###\s+(.+)$/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      i++;

      // Skip blank lines after the title.
      while (i < lines.length && lines[i].trim() === "") i++;

      let source = "";
      let url = "";
      let importance = 5;
      let topics = "";
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        if (!lines[i].trim().startsWith("**")) break;
        const meta = lines[i].trim();
        const sourceMatch = meta.match(/^\*\*Source:\*\*\s*(.+)$/);
        const originalMatch = meta.match(/^\*\*Original:\*\*\s*(.+)$/);
        const importanceMatch = meta.match(/^\*\*Importance:\*\*\s*(\d+)\s*\/\s*10\s*$/i);
        const topicsMatch = meta.match(/^\*\*Topics:\*\*\s*(.+)$/);
        if (sourceMatch) source = sourceMatch[1].trim();
        if (originalMatch) url = extractUrl(originalMatch[1].trim());
        if (importanceMatch) importance = Number(importanceMatch[1]);
        if (topicsMatch) topics = topicsMatch[1].trim();
        i++;
      }

      // Skip blank lines between metadata and body.
      while (i < lines.length && lines[i].trim() === "") i++;

      const bodyLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (/^(#{1,3}\s|---\s*$)/.test(l)) break;
        bodyLines.push(l);
        i++;
      }

      while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === "") {
        bodyLines.pop();
      }

      const content = bodyLines.join("\n").trim();

      if (title && url && content) {
        articles.push({
          source: source || "unknown",
          category: currentCategory || "general",
          title,
          url,
          content,
          importance,
          topics,
        });
      }
      continue;
    }

    i++;
  }

  return articles;
}

function main(): void {
  const inputPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_INPUT_PATH;

  let text: string;
  try {
    text = readFileSync(inputPath, "utf-8");
  } catch (err) {
    console.error(`Could not read ${inputPath}: ${(err as Error).message}`);
    process.exit(1);
  }

  const parsed = parseDailyMarkdown(text);

  if (parsed.length === 0) {
    console.log(`No articles found in ${inputPath}.`);
    return;
  }

  const validated: ParsedArticle[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const result = articleSchema.safeParse(parsed[i]);
    if (!result.success) {
      console.error(`❌ Article ${i + 1} is invalid:`);
      for (const issue of result.error.issues) {
        console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    validated.push(result.data);
  }

  const db = openDepropDb();
  initSchema(db);

  const existingUrls = new Set(
    (db.prepare("SELECT url FROM articles").all() as { url: string }[]).map((row) => row.url),
  );

  const articlesToInsert = validated.filter((article) => {
    if (existingUrls.has(article.url)) {
      console.log(`⏭️  Skipping already-stored URL: ${article.url}`);
      return false;
    }
    return true;
  });

  if (articlesToInsert.length === 0) {
    console.log("All parsed articles are already in deprop.db.");
    db.close();
    return;
  }

  const runId = startRun(db);
  const { inserted, duplicates } = insertArticles(
    db,
    runId,
    articlesToInsert.map((a) => ({
      source: a.source,
      category: a.category.toLowerCase(),
      title: a.title,
      url: a.url,
      summary: null,
      content: a.content,
      publishedAt: null,
      imageUrl: null,
      author: null,
      language: "en",
      fetchedAt: new Date().toISOString(),
      importance: a.importance,
    })),
  );

  finishRun(db, runId, {
    total: validated.length,
    ok: inserted,
    missingKey: 0,
    skipped: validated.length - articlesToInsert.length + duplicates,
    error: validated.length - inserted - (validated.length - articlesToInsert.length) - duplicates,
  });

  console.log("\n--- Populate complete ---");
  console.log(`Run #${runId}`);
  console.log(`Parsed from daily.md: ${validated.length}`);
  console.log(`Already in DB: ${validated.length - articlesToInsert.length}`);
  console.log(`Inserted: ${inserted}`);

  db.close();
}

main();
