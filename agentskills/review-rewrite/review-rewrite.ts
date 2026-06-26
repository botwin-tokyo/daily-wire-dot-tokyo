#!/usr/bin/env node
/**
 * Review and correct each rewritten chunk file in drafts/rewrite_outputs/ before
 * the chunks are assembled into drafts/daily.md.
 *
 * Run from the repository root:
 *   npx tsx agentskills/review-rewrite/review-rewrite.ts
 *
 * It checks formatting, removes duplicate articles, bumps importance when multiple
 * sources cover the same topic, and rewrites the chunk files in place.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

interface Article {
  file: string;
  category: string;
  title: string;
  source: string;
  url: string;
  importance: number;
  topics: string[];
  body: string;
  rawTitleLine: string;
}

const CHUNKS_DIR = resolve(process.cwd(), "drafts/rewrite_outputs");
const MIN_BODY_WORDS = 30;
const SAME_TOPIC_THRESHOLD = 4;
const SAME_TOPIC_BUMP = 2;

function extractUrl(text: string): string {
  const markdownLink = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
  if (markdownLink) return markdownLink[2].trim();
  return text.trim();
}

function parseImportance(text: string): number {
  const match = text.match(/(\d+)\s*\/\s*10/);
  if (!match) return 5;
  const n = Number(match[1]);
  if (Number.isNaN(n)) return 5;
  return Math.max(1, Math.min(10, n));
}

function parseTopics(text: string): string[] {
  return text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function parseArticles(text: string, file: string): Article[] {
  const lines = text.split(/\r?\n/);
  const articles: Article[] = [];
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
      const rawTitleLine = titleMatch[1].trim();
      const title = rawTitleLine;
      i++;

      while (i < lines.length && lines[i].trim() === "") i++;

      let source = "";
      let url = "";
      let importance = 5;
      let topics: string[] = [];
      while (i < lines.length) {
        const meta = lines[i].trim();
        if (meta === "") {
          i++;
          continue;
        }
        if (!meta.startsWith("**")) break;
        const sourceMatch = meta.match(/^\*\*Source:\*\*\s*(.+)$/);
        const originalMatch = meta.match(/^\*\*Original:\*\*\s*(.+)$/);
        const importanceMatch = meta.match(/^\*\*Importance:\*\*\s*(.+)$/);
        const topicsMatch = meta.match(/^\*\*Topics:\*\*\s*(.+)$/);
        if (sourceMatch) source = sourceMatch[1].trim();
        if (originalMatch) url = extractUrl(originalMatch[1].trim());
        if (importanceMatch) importance = parseImportance(importanceMatch[1].trim());
        if (topicsMatch) topics = parseTopics(topicsMatch[1].trim());
        i++;
      }

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

      const body = bodyLines.join("\n").trim();

      articles.push({
        file,
        category: currentCategory,
        title,
        source,
        url,
        importance,
        topics,
        body,
        rawTitleLine,
      });
      continue;
    }

    i++;
  }

  return articles;
}

function cleanTitle(title: string): string {
  return title
    .replace(/[*\[\]#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCategory(category: string): string {
  return category.toLowerCase().trim();
}

function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function reviewArticle(article: Article): {
  article: Article;
  fixed: string[];
  failed: string[];
} {
  const fixed: string[] = [];
  const failed: string[] = [];

  const cleanedCategory = cleanCategory(article.category);
  if (cleanedCategory !== article.category) {
    article.category = cleanedCategory;
    fixed.push("lowercased category heading");
  }

  const cleanedTitle = cleanTitle(article.title);
  if (cleanedTitle !== article.title) {
    article.title = cleanedTitle;
    fixed.push("cleaned title of markup/symbols");
  }
  if (!article.title || article.title.length < 3) {
    failed.push("title is missing or too short after cleaning");
  }

  if (!article.source) {
    failed.push("source is missing");
  }

  if (!article.url) {
    failed.push("original URL is missing");
  } else if (!isValidUrl(article.url)) {
    failed.push(`original URL is invalid: ${article.url}`);
  }

  if (!article.body) {
    failed.push("body is missing");
  } else if (wordCount(article.body) < MIN_BODY_WORDS) {
    failed.push(`body is too short (${wordCount(article.body)} words)`);
  }

  return { article, fixed, failed };
}

function buildChunkMarkdown(articles: Article[]): string {
  if (articles.length === 0) return "";

  const lines: string[] = [];
  for (const article of articles) {
    lines.push(`## ${article.category}`, "");
    lines.push(`### ${article.title}`, "");
    lines.push(`**Source:** ${article.source || "unknown"}`, "");
    lines.push(`**Original:** ${article.url}`, "");
    lines.push(`**Importance:** ${article.importance}/10`, "");
    if (article.topics.length > 0) {
      lines.push(`**Topics:** ${article.topics.join(", ")}`, "");
    }
    lines.push(article.body, "");
    lines.push("---", "");
  }

  return lines.join("\n").trim() + "\n";
}

function main(): void {
  mkdirSync(CHUNKS_DIR, { recursive: true });

  const files = readdirSync(CHUNKS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.error(`No rewritten chunk files found in ${CHUNKS_DIR}.`);
    process.exit(1);
  }

  const allArticles: Article[] = [];
  for (const file of files) {
    const filePath = resolve(CHUNKS_DIR, file);
    const text = readFileSync(filePath, "utf-8");
    const articles = parseArticles(text, file);
    allArticles.push(...articles);
  }

  // Remove exact duplicates by URL or normalized title. Keep the first occurrence.
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: Article[] = [];
  const duplicates: Article[] = [];

  for (const article of allArticles) {
    const normTitle = normalizeTitle(article.title);
    if (seenUrls.has(article.url) || seenTitles.has(normTitle)) {
      duplicates.push(article);
      continue;
    }
    seenUrls.add(article.url);
    seenTitles.add(normTitle);
    deduped.push(article);
  }

  // Count topic frequency across unique articles.
  const topicCounts = new Map<string, number>();
  for (const article of deduped) {
    for (const topic of article.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  // Bump importance for articles covering topics reported by multiple sources.
  let bumpedCount = 0;
  for (const article of deduped) {
    const hasTrendingTopic = article.topics.some(
      (topic) => (topicCounts.get(topic) ?? 0) >= SAME_TOPIC_THRESHOLD,
    );
    if (hasTrendingTopic && article.importance < 10) {
      article.importance = Math.min(10, article.importance + SAME_TOPIC_BUMP);
      bumpedCount++;
    }
  }

  // Run formatting/structural review.
  const reviewed: Article[] = [];
  const removed: Article[] = [];
  let formattingFixes = 0;

  for (const article of deduped) {
    const { article: fixedArticle, fixed, failed } = reviewArticle(article);
    if (failed.length > 0) {
      console.log(`❌ Removing article: "${fixedArticle.rawTitleLine}"`);
      for (const reason of failed) {
        console.log(`   - ${reason}`);
      }
      removed.push(fixedArticle);
      continue;
    }
    if (fixed.length > 0) {
      formattingFixes += fixed.length;
      console.log(`✅ Fixed "${fixedArticle.title}": ${fixed.join(", ")}`);
    }
    reviewed.push(fixedArticle);
  }

  // Group reviewed articles back into their original files and rewrite.
  const byFile = new Map<string, Article[]>();
  for (const article of reviewed) {
    const list = byFile.get(article.file) ?? [];
    list.push(article);
    byFile.set(article.file, list);
  }

  for (const file of files) {
    const filePath = resolve(CHUNKS_DIR, file);
    const articles = byFile.get(file) ?? [];
    writeFileSync(filePath, buildChunkMarkdown(articles), "utf-8");
  }

  console.log("\n--- Review complete ---");
  console.log(`Chunk files reviewed: ${files.length}`);
  console.log(`Articles parsed: ${allArticles.length}`);
  console.log(`Exact duplicates removed: ${duplicates.length}`);
  console.log(`Articles boosted by trending topic: ${bumpedCount}`);
  console.log(`Articles removed for structural issues: ${removed.length}`);
  console.log(`Formatting fixes applied: ${formattingFixes}`);
  console.log(`Articles kept: ${reviewed.length}`);
}

main();
