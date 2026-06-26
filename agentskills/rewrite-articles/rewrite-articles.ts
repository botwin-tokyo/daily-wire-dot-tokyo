#!/usr/bin/env node
/**
 * Rewrite each article in drafts/rewrite_chunks/ by calling the local LLM
 * chat-completions endpoint directly, then write neutral wire-copy output to
 * drafts/rewrite_outputs/.
 *
 * Articles that fail validation are queued for a separate retry phase rather
 * than retried inline. This keeps the initial rewrite pass predictable and
 * avoids hammering the local LLM with retries while other articles are still
 * being processed.
 *
 * Run from the repository root:
 *   npx tsx agentskills/rewrite-articles/rewrite-articles.ts
 */

import "dotenv/config";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { validateArticle } from "./validate-article.js";

const API_URL = process.env.BRAIN_API_URL;
const API_KEY = process.env.BRAIN_API_KEY;

if (!API_URL) {
  throw new Error(
    "BRAIN_API_URL is not set. Add it to your .env file (e.g., http://localhost:5000/v1/chat/completions).",
  );
}
const MODEL =
  process.env.BRAIN_MODEL ||
  "nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-q8_0";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 100_000;
const CONCURRENCY = 1;
const SKIP_VALIDATION =
  process.env.SKIP_VALIDATION === "1" || process.env.SKIP_VALIDATION === "true";

export interface RawArticle {
  title: string;
  source: string;
  category: string;
  url: string;
  content: string;
}

export interface RewrittenArticle {
  title: string;
  source: string;
  category: string;
  url: string;
  importance: number;
  topics: string[];
  body: string;
}

interface RetryEntry {
  file: string;
  original: RawArticle;
  badRewrite: RewrittenArticle;
}

function repoPath(...parts: string[]): string {
  return resolve(process.cwd(), ...parts);
}

const LOG_DIR = repoPath("logs");
const LOG_FILE = resolve(LOG_DIR, "rewrite-articles.log");

function initLogger(): void {
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(LOG_FILE, "", "utf-8");
}

export function log(...parts: unknown[]): void {
  const line = parts.join(" ");
  console.log(line);
  appendFileSync(LOG_FILE, `${line}\n`, "utf-8");
}

export function logError(...parts: unknown[]): void {
  const line = parts.join(" ");
  console.error(line);
  appendFileSync(LOG_FILE, `[ERROR] ${line}\n`, "utf-8");
}

export function readStyleGuide(): string {
  return readFileSync(
    repoPath("agentskills/rewrite-articles/STYLE.md"),
    "utf-8",
  );
}

function readValidatorStyle(): string {
  return readFileSync(repoPath("Validator_STYLE.md"), "utf-8");
}

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function quarantineArticle(
  article: RewrittenArticle,
  index: number,
  reason: string,
): void {
  const quarantineDir = repoPath("drafts/rewrite_outputs/quarantine");
  mkdirSync(quarantineDir, { recursive: true });

  const safeTitle = sanitizeFilename(article.title) || `article-${index}`;
  const fileName = `${safeTitle}-${Date.now()}-${index}.md`;
  const filePath = resolve(quarantineDir, fileName);

  const text = [
    `# QUARANTINED REWRITE`,
    `Reason: ${reason}`,
    `Time: ${new Date().toISOString()}`,
    "",
    "## Metadata",
    `- **Source:** ${article.source}`,
    `- **URL:** ${article.url}`,
    `- **Category:** ${article.category}`,
    `- **Importance:** ${article.importance}/10`,
    `- **Topics:** ${article.topics.join(", ") || "none"}`,
    "",
    "## Title",
    article.title,
    "",
    "## Body",
    article.body,
  ].join("\n");

  writeFileSync(filePath, text, "utf-8");
}

function parseChunks(dir: string): Map<string, RawArticle[]> {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  const chunks = new Map<string, RawArticle[]>();

  for (const file of files) {
    const text = readFileSync(resolve(dir, file), "utf-8");
    const articles = parseChunkArticles(text);
    chunks.set(file, articles);
  }

  return chunks;
}

function parseChunkArticles(text: string): RawArticle[] {
  const lines = text.split(/\r?\n/);
  const articles: RawArticle[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const articleMatch = line.match(/^##\s+Article\s+\d+:\s+(.+)$/);
    if (articleMatch) {
      const title = articleMatch[1].trim();
      i++;

      let source = "";
      let category = "";
      let url = "";
      let inContent = false;
      const contentLines: string[] = [];

      while (i < lines.length) {
        const l = lines[i];

        if (/^##\s+Article\s+\d+:/.test(l)) break;
        if (/^---\s*$/.test(l)) {
          i++;
          break;
        }

        if (!inContent) {
          const sourceMatch = l.match(/^-\s+\*\*Source:\*\*\s*(.+)$/);
          const categoryMatch = l.match(/^-\s+\*\*Category:\*\*\s*(.+)$/);
          const urlMatch = l.match(/^-\s+\*\*URL:\*\*\s*(.+)$/);
          if (sourceMatch) source = sourceMatch[1].trim();
          if (categoryMatch) category = categoryMatch[1].trim().toLowerCase();
          if (urlMatch) url = urlMatch[1].trim();

          if (/^\*\*Content:\*\*$/.test(l.trim())) {
            inContent = true;
          }
        } else {
          contentLines.push(l);
        }

        i++;
      }

      while (
        contentLines.length &&
        contentLines[contentLines.length - 1].trim() === ""
      ) {
        contentLines.pop();
      }

      const content = contentLines.join("\n").trim();
      if (title && url && content) {
        articles.push({
          title,
          source: source || "unknown",
          category: category || "general",
          url,
          content,
        });
      }
      continue;
    }

    i++;
  }

  return articles;
}

function buildPrompt(
  styleGuide: string,
  article: RawArticle,
  validationAttempt: number,
): string {
  const warning =
    validationAttempt > 0
      ? [
          "",
          "WARNING: your previous rewrite was rejected by the validator because it contained chain-of-thought, JSON/code-fences, empty content, or second-person advice. Do NOT repeat those mistakes. Produce only clean, neutral, third-person article prose.",
        ].join("\n")
      : "";

  return [
    "[STYLE GUIDE]",
    styleGuide,
    "",
    "[TASK]",
    "Rewrite the following article as neutral, factual, Pulitzer-grade wire copy.",
    warning,
    "",
    "Instructions:",
    "- Produce a JSON object with exactly these keys: title, importance, topics, body.",
    "- title: a factual, title-case headline.",
    "- importance: an integer from 1 to 10 using the scale in the style guide for this article's category.",
    "- topics: an array of 1-5 lowercase topic tags.",
    "- body: the rewritten article text only. Do not include the title, source, URL, importance, or topics here.",
    "- Do not wrap the JSON in markdown code fences.",
    "- Do not recategorize the story. The category is: " + article.category,
    "",
    "Original article:",
    `Title: ${article.title}`,
    `Source: ${article.source}`,
    `URL: ${article.url}`,
    "",
    "Content:",
    article.content,
  ].join("\n");
}

interface LlmResponse {
  content: string;
  reasoning?: string;
}

async function callLlm(prompt: string): Promise<LlmResponse> {
  if (!API_KEY) {
    throw new Error(
      "BRAIN_API_KEY environment variable is required (no default key is embedded)",
    );
  }

  const body = JSON.stringify(
    {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 65000,
    },
    null,
    2,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "BotwinMorningWireRewriter/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
          reasoning_content?: string;
        };
      }>;
    };
    const choice = data.choices[0]?.message;
    return {
      content: choice?.content || "",
      reasoning: choice?.reasoning_content || "",
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

function extractJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in response");
  }
  return text.slice(firstBrace, lastBrace + 1);
}

function parseTopics(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function fallbackParseMarkdown(
  raw: string,
  original: RawArticle,
): RewrittenArticle {
  const titleMatch = raw.match(/^###\s+(.+)$/m);
  const importanceMatch = raw.match(/\*\*Importance:\*\*\s*(\d+)\s*\/\s*10/m);
  const topicsMatch = raw.match(/\*\*Topics:\*\*\s*(.+)$/m);
  const sourceMatch = raw.match(/\*\*Source:\*\*\s*(.+)$/m);
  const originalMatch = raw.match(/\*\*Original:\*\*\s*(.+)$/m);

  const bodyMatch = raw.match(/\*\*Topics:\*\*[\s\S]*?\n\n([\s\S]+?)(?:\n---|\n\n##\s|$)/);

  const title = titleMatch?.[1].trim() || original.title;
  const body = bodyMatch?.[1].trim() || raw.trim();
  const importance = importanceMatch ? Number(importanceMatch[1]) : 5;

  if (!title || !body) {
    throw new Error("Fallback parser could not find title or body");
  }

  return {
    title,
    source: sourceMatch?.[1].trim() || original.source,
    category: original.category,
    url: originalMatch ? extractUrl(originalMatch[1].trim()) : original.url,
    importance: Math.max(1, Math.min(10, importance)),
    topics: topicsMatch ? parseTopics(topicsMatch[1]) : [],
    body,
  };
}

function extractUrl(text: string): string {
  const markdownLink = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
  if (markdownLink) return markdownLink[2].trim();
  return text.trim();
}

function parseRewritten(
  raw: string,
  original: RawArticle,
): RewrittenArticle {
  const combined = stripCodeFences(raw);

  try {
    const jsonText = extractJson(combined || raw);
    const parsed = JSON.parse(jsonText) as {
      title?: string;
      importance?: number;
      topics?: string | string[];
      body?: string;
    };

    const title = (parsed.title || original.title).trim();
    const body = (parsed.body || "").trim();
    const importance =
      typeof parsed.importance === "number"
        ? Math.max(1, Math.min(10, Math.round(parsed.importance)))
        : 5;

    if (!title || !body) {
      throw new Error("JSON missing title or body");
    }

    return {
      title,
      source: original.source,
      category: original.category,
      url: original.url,
      importance,
      topics: parseTopics(parsed.topics),
      body,
    };
  } catch {
    return fallbackParseMarkdown(raw, original);
  }
}

export async function rewriteArticle(
  styleGuide: string,
  article: RawArticle,
  validationAttempt = 0,
): Promise<{ ok: true; article: RewrittenArticle } | { ok: false; error: string }> {
  const prompt = buildPrompt(styleGuide, article, validationAttempt);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callLlm(prompt);
      const raw = response.content || response.reasoning || "";
      if (!raw.trim()) {
        throw new Error("Empty response from model");
      }
      const rewritten = parseRewritten(raw, article);
      return { ok: true, article: rewritten };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) {
        return { ok: false, error: message };
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return { ok: false, error: "Unexpected retry exhaustion" };
}

export function buildChunkMarkdown(articles: RewrittenArticle[]): string {
  const lines: string[] = [];

  for (const article of articles) {
    lines.push(`## ${article.category}`, "");
    lines.push(`### ${article.title}`, "");
    lines.push(`**Source:** ${article.source}`, "");
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

function writeRetryQueue(queue: RetryEntry[]): void {
  if (queue.length === 0) return;
  const retryDir = repoPath("drafts/rewrite_outputs/retry");
  mkdirSync(retryDir, { recursive: true });
  writeFileSync(
    resolve(retryDir, "retry-queue.json"),
    JSON.stringify({ queue }, null, 2),
    "utf-8",
  );
}

function spawnRetryPhase(): void {
  const scriptPath = repoPath(
    "agentskills/rewrite-articles/retry-invalid.ts",
  );
  log("\n🔄 Validation complete. Spawning retry phase...");
  log(`   npx tsx ${scriptPath}`);

  const child = spawn("npx", ["tsx", scriptPath], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
  });

  child.on("error", (err) => {
    logError(`Retry phase failed to spawn: ${err.message}`);
  });

  child.unref();
}

async function main(): Promise<void> {
  initLogger();

  const chunksDir = repoPath("drafts/rewrite_chunks");
  const outputsDir = repoPath("drafts/rewrite_outputs");

  mkdirSync(outputsDir, { recursive: true });

  log(`Progress log: ${LOG_FILE}`);

  const chunks = parseChunks(chunksDir);
  if (chunks.size === 0) {
    logError(`No chunk files found in ${chunksDir}. Run chunk-articles first.`);
    process.exit(1);
  }

  const styleGuide = readStyleGuide();
  const validatorStyle = SKIP_VALIDATION ? "" : readValidatorStyle();
  const successes: string[] = [];
  const failures: { file: string; title: string; error: string }[] = [];
  const retryQueue: RetryEntry[] = [];

  log(`--- Rewriting ${chunks.size} chunk(s) via direct LLM calls ---\n`);
  log(`Endpoint: ${API_URL}`);
  log(`Model: ${MODEL}`);
  log(`Concurrency: ${CONCURRENCY}\n`);

  for (const [file, articles] of chunks) {
    const start = Date.now();
    const rewritten: RewrittenArticle[] = [];

    for (let index = 0; index < articles.length; index++) {
      const article = articles[index];
      log(`[${file}] ${index + 1}/${articles.length}: ${article.title.slice(0, 60)}...`);

      const result = await rewriteArticle(styleGuide, article);

      if (!result.ok) {
        failures.push({
          file,
          title: article.title,
          error: result.error,
        });
        logError(`  ❌ failed: ${result.error}`);
        continue;
      }

      const rewrittenArticle = result.article;

      if (SKIP_VALIDATION) {
        rewritten.push(rewrittenArticle);
        continue;
      }

      const isValid = await validateArticle(
        {
          title: rewrittenArticle.title,
          source: rewrittenArticle.source,
          url: rewrittenArticle.url,
          body: rewrittenArticle.body,
        },
        validatorStyle,
      );

      if (isValid) {
        rewritten.push(rewrittenArticle);
      } else {
        retryQueue.push({
          file,
          original: article,
          badRewrite: rewrittenArticle,
        });
        log(`  ⚠️ validation failed; queued for retry phase`);
      }
    }

    const outputPath = resolve(outputsDir, file);
    if (rewritten.length > 0) {
      writeFileSync(outputPath, buildChunkMarkdown(rewritten), "utf-8");
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    successes.push(file);
    log(`✅ ${file} — ${rewritten.length}/${articles.length} articles passed validation (${elapsed}s)\n`);
  }

  log("--- Rewrite/validation phase complete ---");
  log(`Chunks processed: ${chunks.size}`);
  log(`Articles valid on first pass: ${retryQueue.length > 0 ? "see per-chunk counts" : "all"}`);
  log(`Articles queued for retry: ${retryQueue.length}`);
  log(`Articles failed to rewrite: ${failures.length}`);

  if (failures.length > 0) {
    log(`\n⚠️  Skipped ${failures.length} article(s) after ${MAX_RETRIES} LLM retries:`);
    for (const f of failures) {
      log(`  - [${f.file}] ${f.title}: ${f.error}`);
    }
  }

  writeRetryQueue(retryQueue);

  if (retryQueue.length > 0) {
    spawnRetryPhase();
  } else {
    log("\nNo articles queued for retry. Run finished.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logError(err);
    process.exit(1);
  });
}
