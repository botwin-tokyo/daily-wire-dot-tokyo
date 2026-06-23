#!/usr/bin/env node
/**
 * Assemble rewritten chunk files from drafts/rewrite_outputs/ into a single
 * drafts/daily.md ready for review and population into deprop.db.
 *
 * Run from the repository root:
 *   npx tsx agentskills/create-daily/create-daily.ts
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

interface Article {
  category: string;
  title: string;
  source: string;
  url: string;
  importance: number;
  topics: string[];
  body: string;
}

const CHUNKS_DIR = resolve(process.cwd(), "drafts/rewrite_outputs");
const OUTPUT_PATH = resolve(process.cwd(), "drafts/daily.md");

function extractUrl(text: string): string {
  const markdownLink = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
  if (markdownLink) return markdownLink[2].trim();
  return text.trim();
}

function parseArticles(text: string): Article[] {
  const lines = text.split(/\r?\n/);
  const articles: Article[] = [];
  let currentCategory = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim().toLowerCase();
      i++;
      continue;
    }

    const titleMatch = line.match(/^###\s+(.+)$/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      i++;

      while (i < lines.length && lines[i].trim() === "") i++;

      let source = "";
      let url = "";
      let importance = 5;
      let topics: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("**")) {
        const meta = lines[i].trim();
        const sourceMatch = meta.match(/^\*\*Source:\*\*\s*(.+)$/);
        const originalMatch = meta.match(/^\*\*Original:\*\*\s*(.+)$/);
        const importanceMatch = meta.match(/^\*\*Importance:\*\*\s*(\d+)\s*\/\s*10\s*$/i);
        const topicsMatch = meta.match(/^\*\*Topics:\*\*\s*(.+)$/);
        if (sourceMatch) source = sourceMatch[1].trim();
        if (originalMatch) url = extractUrl(originalMatch[1].trim());
        if (importanceMatch) importance = Number(importanceMatch[1]);
        if (topicsMatch) topics = topicsMatch[1].split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
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

      if (title && url && body) {
        articles.push({
          category: currentCategory || "general",
          title,
          source,
          url,
          importance,
          topics,
          body,
        });
      }
      continue;
    }

    i++;
  }

  return articles;
}

function buildDailyMarkdown(articles: Article[]): string {
  const byCategory = new Map<string, Article[]>();
  for (const article of articles) {
    const list = byCategory.get(article.category) ?? [];
    list.push(article);
    byCategory.set(article.category, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "# Botwin's Daily Wire — Neutral Brief",
    "",
    `Generated: ${today}`,
    "",
    "---",
    "",
  ];

  for (const [category, list] of byCategory) {
    lines.push(`## ${category}`, "");
    for (const article of list) {
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
    console.error("Run the rewrite-articles skill first and make sure subagents write their output to drafts/rewrite_outputs/.");
    process.exit(1);
  }

  const allArticles: Article[] = [];
  for (const file of files) {
    const text = readFileSync(resolve(CHUNKS_DIR, file), "utf-8");
    const articles = parseArticles(text);
    console.log(`Parsed ${String(articles.length).padStart(2)} articles from ${file}`);
    allArticles.push(...articles);
  }

  if (allArticles.length === 0) {
    console.error("No articles could be parsed from the chunk files.");
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, buildDailyMarkdown(allArticles), "utf-8");

  console.log("\n--- Create daily complete ---");
  console.log(`Chunk files read: ${files.length}`);
  console.log(`Articles assembled: ${allArticles.length}`);
  console.log(`Categories: ${[...new Set(allArticles.map((a) => a.category))].join(", ")}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
