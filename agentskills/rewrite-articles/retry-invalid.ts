#!/usr/bin/env node
/**
 * Retry phase for articles that failed validation during the initial rewrite.
 *
 * Reads the retry queue written by rewrite-articles.ts, rewrites each queued
 * article with a warning prompt, validates the result, and either appends the
 * recovered article to the chunk output or quarantines it.
 *
 * Run from the repository root:
 *   npx tsx agentskills/rewrite-articles/retry-invalid.ts
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { validateArticle } from "./validate-article.js";
import {
  rewriteArticle,
  buildChunkMarkdown,
  quarantineArticle,
  readStyleGuide,
  type RawArticle,
  type RewrittenArticle,
} from "./rewrite-articles.js";

const LOG_DIR = resolve(process.cwd(), "logs");
const LOG_FILE = resolve(LOG_DIR, "retry-invalid.log");
const RETRY_QUEUE_FILE = resolve(
  process.cwd(),
  "drafts/rewrite_outputs/retry/retry-queue.json",
);

interface RetryEntry {
  file: string;
  original: RawArticle;
  badRewrite: RewrittenArticle;
}

function initLogger(): void {
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(LOG_FILE, "", "utf-8");
}

function log(...parts: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${parts.join(" ")}`;
  console.log(line);
  appendFileSync(LOG_FILE, `${line}\n`, "utf-8");
}

function logError(...parts: unknown[]): void {
  const line = `[${new Date().toISOString()}] [ERROR] ${parts.join(" ")}`;
  console.error(line);
  appendFileSync(LOG_FILE, `${line}\n`, "utf-8");
}

function readRetryQueue(): RetryEntry[] {
  if (!existsSync(RETRY_QUEUE_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(RETRY_QUEUE_FILE, "utf-8")) as {
      queue: RetryEntry[];
    };
    return Array.isArray(data.queue) ? data.queue : [];
  } catch {
    return [];
  }
}

function appendToChunkOutput(file: string, article: RewrittenArticle): void {
  const outputsDir = resolve(process.cwd(), "drafts/rewrite_outputs");
  mkdirSync(outputsDir, { recursive: true });
  const outputPath = resolve(outputsDir, file);
  const markdown = buildChunkMarkdown([article]);

  if (existsSync(outputPath)) {
    appendFileSync(outputPath, `\n${markdown}`, "utf-8");
  } else {
    writeFileSync(outputPath, markdown, "utf-8");
  }
}

async function main(): Promise<void> {
  initLogger();

  const queue = readRetryQueue();
  if (queue.length === 0) {
    log("No invalid articles queued for retry.");
    return;
  }

  log(`--- Retry phase started ---`);
  log(`Articles queued for retry: ${queue.length}\n`);

  const styleGuide = readStyleGuide();
  const validatorStyle = readFileSync(
    resolve(process.cwd(), "Validator_STYLE.md"),
    "utf-8",
  );

  let recovered = 0;
  let quarantined = 0;
  let failed = 0;

  for (let index = 0; index < queue.length; index++) {
    const entry = queue[index];
    log(
      `[${index + 1}/${queue.length}] Retrying: ${entry.original.title.slice(0, 60)}...`,
    );

    const result = await rewriteArticle(styleGuide, entry.original, 1);

    if (!result.ok) {
      logError(`  ❌ rewrite failed: ${result.error}`);
      quarantineArticle(
        entry.badRewrite,
        index,
        `Retry rewrite failed: ${result.error}`,
      );
      failed++;
      continue;
    }

    const rewritten = result.article;
    const isValid = await validateArticle(
      {
        title: rewritten.title,
        source: rewritten.source,
        url: rewritten.url,
        body: rewritten.body,
      },
      validatorStyle,
    );

    if (isValid) {
      appendToChunkOutput(entry.file, rewritten);
      log(`  ✅ recovered and appended to ${entry.file}`);
      recovered++;
    } else {
      quarantineArticle(rewritten, index, "Retry validation failed");
      logError(`  ❌ retry validation failed; quarantined`);
      quarantined++;
    }
  }

  // Clear the retry queue so it isn't processed again.
  if (existsSync(RETRY_QUEUE_FILE)) {
    rmSync(RETRY_QUEUE_FILE);
  }

  log(`\n--- Retry phase complete ---`);
  log(`Recovered: ${recovered}`);
  log(`Quarantined: ${quarantined}`);
  log(`Failed to rewrite: ${failed}`);
}

main().catch((err) => {
  logError(err);
  process.exit(1);
});
