/**
 * Shared fetch helpers for news aggregation scripts.
 */

import type { AggregationResult, NormalizedArticle } from "./types";

const USER_AGENT = "TheMorningWire-AggregationBot/1.0 (research@example.com)";

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "<no body>");
    throw new Error(`HTTP ${response.status} from ${url}: ${text}`);
  }
  return response.json() as Promise<T>;
}

export function buildResult(
  source: string,
  category: string,
  articles: NormalizedArticle[],
): AggregationResult {
  return {
    source,
    category,
    fetchedAt: new Date().toISOString(),
    count: articles.length,
    articles,
  };
}

export function printResult(result: AggregationResult): void {
  console.log(JSON.stringify(result, null, 2));
}

export async function saveResult(result: AggregationResult, dir = "backend/data"): Promise<void> {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  mkdirSync(dir, { recursive: true });
  const filename = `${result.source}-${result.category}-${result.fetchedAt.slice(0, 10)}.json`
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-");
  const path = resolve(dir, filename);
  writeFileSync(path, JSON.stringify(result, null, 2));

  console.error(`Saved ${path}`);
}
