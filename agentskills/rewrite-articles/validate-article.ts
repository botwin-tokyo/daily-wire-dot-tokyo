#!/usr/bin/env node
/**
 * Validate a rewritten article by sending it to the local LLM with the
 * Validator_STYLE.md prompt. Returns VALID/INVALID.
 *
 * Run from the repository root:
 *   npx tsx agentskills/rewrite-articles/validate-article.ts --file drafts/rewrite_outputs/some-chunk.md
 *   npx tsx agentskills/rewrite-articles/validate-article.ts --dir drafts/rewrite_outputs
 *
 * It is also imported by rewrite-articles.ts so every rewritten article is
 * checked before it can reach the rest of the pipeline.
 */

import "dotenv/config";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
} from "node:fs";
import { resolve, basename } from "node:path";

const API_URL =
  process.env.BRAIN_API_URL || "https://brain.ryoko.okinawa/v1/chat/completions";
const API_KEY = process.env.BRAIN_API_KEY;
const MODEL =
  process.env.BRAIN_MODEL ||
  "nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-q8_0";
const REQUEST_TIMEOUT_MS = 100_000;
const MAX_RETRIES = 3;

const LOG_DIR = resolve(process.cwd(), "logs");
const LOG_FILE = resolve(LOG_DIR, "article-validator.log");

export interface ArticleToValidate {
  title: string;
  source?: string;
  url?: string;
  body: string;
}

// Deterministic pre-filter: these phrases appear in prompt-leak / chain-of-thought
// output and are never acceptable in a published article body.
const META_TEXT_PATTERNS = [
  /\bWe need to rewrite\b/i,
  /\bDetermine category\b/i,
  /\bImportance score\b/i,
  /\bNow rewrite\b/i,
  /\bLet's craft\b/i,
  /\bCheck neutrality\b/i,
  /\bNow produce JSON\b/i,
  /\bproduce JSON\b/i,
  /\bTitle case\b/i,
  /\binverted pyramid\b/i,
  /\bPulitzer-grade\b/i,
  /\b1-5 lowercase tags\b/i,
  /\bLead paragraph\b/i,
  /\bContext paragraph\b/i,
  /\bBody paragraph\b/i,
  /\bClosing\b/i,
];

function hasObviousMetaText(body: string): boolean {
  return META_TEXT_PATTERNS.some((pattern) => pattern.test(body));
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

function readValidatorPrompt(): string {
  return readFileSync(resolve(process.cwd(), "Validator_STYLE.md"), "utf-8");
}

function buildValidationPrompt(validatorStyle: string, article: ArticleToValidate): string {
  return [
    validatorStyle,
    "",
    "--- ARTICLE TO VALIDATE ---",
    `Title: ${article.title}`,
    article.source ? `Source: ${article.source}` : "",
    article.url ? `URL: ${article.url}` : "",
    "",
    "Body:",
    article.body,
  ]
    .filter(Boolean)
    .join("\n");
}

interface LlmResponse {
  content: string;
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
      max_tokens: 1000,
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
        "User-Agent": "BotwinDailyWireValidator/1.0",
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
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content || "";
    return { content };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function parseValidationResponse(raw: string): "VALID" | "INVALID" | "UNCLEAR" {
  const cleaned = raw.trim().toUpperCase();
  if (cleaned === "VALID") return "VALID";
  if (cleaned === "INVALID") return "INVALID";
  // Some models add punctuation or a short prefix despite instructions.
  if (/\bVALID\b/.test(cleaned) && !/\bINVALID\b/.test(cleaned)) return "VALID";
  if (/\bINVALID\b/.test(cleaned)) return "INVALID";
  return "UNCLEAR";
}

export async function validateArticle(
  article: ArticleToValidate,
  validatorStyle?: string,
): Promise<boolean> {
  if (hasObviousMetaText(article.body)) {
    log(`❌ INVALID (pattern): ${article.title}`);
    return false;
  }

  const style = validatorStyle || readValidatorPrompt();
  const prompt = buildValidationPrompt(style, article);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callLlm(prompt);
      const raw = response.content.trim();
      const verdict = parseValidationResponse(raw);

      if (verdict === "VALID") {
        log(`✅ VALID: ${article.title}`);
        return true;
      }
      if (verdict === "INVALID") {
        log(`❌ INVALID: ${article.title} (response: ${raw})`);
        return false;
      }

      logError(`Unclear validation response for "${article.title}": ${raw}`);
      // Fail safe: treat unclear as invalid.
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError(`Validator attempt ${attempt}/${MAX_RETRIES} failed for "${article.title}": ${message}`);
      if (attempt === MAX_RETRIES) {
        return false;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return false;
}

// --- CLI helpers for standalone testing ---

function parseArticlesFromChunk(text: string): ArticleToValidate[] {
  const lines = text.split(/\r?\n/);
  const articles: ArticleToValidate[] = [];
  let i = 0;

  while (i < lines.length) {
    const titleMatch = lines[i].match(/^###\s+(.+)$/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      i++;

      let source = "";
      let url = "";
      while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (trimmed === "") {
          i++;
          continue;
        }
        if (!trimmed.startsWith("**")) break;

        const sourceMatch = trimmed.match(/^\*\*Source:\*\*\s*(.+)$/);
        const originalMatch = trimmed.match(/^\*\*Original:\*\*\s*(.+)$/);
        if (sourceMatch) source = sourceMatch[1].trim();
        if (originalMatch) url = originalMatch[1].trim();
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

      const body = bodyLines.join("\n").trim();
      if (title && body) {
        articles.push({ title, source, url, body });
      }
      continue;
    }
    i++;
  }

  return articles;
}

async function main(): Promise<void> {
  initLogger();
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const dirIdx = args.indexOf("--dir");

  const validatorStyle = readValidatorPrompt();
  const toValidate: ArticleToValidate[] = [];

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const filePath = resolve(process.cwd(), args[fileIdx + 1]);
    const text = readFileSync(filePath, "utf-8");
    const articles = parseArticlesFromChunk(text);
    if (articles.length === 0) {
      // Treat the whole file as one article body for testing.
      toValidate.push({ title: basename(filePath), body: text });
    } else {
      toValidate.push(...articles);
    }
  } else if (dirIdx !== -1 && args[dirIdx + 1]) {
    const dirPath = resolve(process.cwd(), args[dirIdx + 1]);
    const files = readdirSync(dirPath)
      .filter((name) => name.endsWith(".md"))
      .sort();
    for (const file of files) {
      const text = readFileSync(resolve(dirPath, file), "utf-8");
      const articles = parseArticlesFromChunk(text);
      if (articles.length === 0) {
        toValidate.push({ title: file, body: text });
      } else {
        toValidate.push(...articles);
      }
    }
  } else {
    console.error("Usage: validate-article.ts --file <path> | --dir <path>");
    process.exit(1);
  }

  log(`--- Validating ${toValidate.length} article(s) ---`);
  let valid = 0;
  let invalid = 0;

  for (const article of toValidate) {
    const ok = await validateArticle(article, validatorStyle);
    if (ok) valid++;
    else invalid++;
  }

  log(`--- Validation complete ---`);
  log(`Valid: ${valid}, Invalid: ${invalid}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logError(err);
    process.exit(1);
  });
}
