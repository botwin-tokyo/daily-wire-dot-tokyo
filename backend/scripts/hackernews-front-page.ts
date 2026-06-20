#!/usr/bin/env node
/**
 * Hacker News — front page (technology).
 *
 * No API key required.
 * Docs: https://hn.algolia.com/api
 */

import { pathToFileURL } from "node:url";
import { fetchJson, buildResult, printResult } from "./lib/fetch";
import type { NormalizedArticle } from "./lib/types";

interface HackerNewsHit {
  title?: string;
  url?: string;
  author?: string;
  created_at?: string;
  points?: number;
}

interface HackerNewsResponse {
  hits?: HackerNewsHit[];
}

const SOURCE = "hackernews";
const CATEGORY = "front-page";

export async function aggregate(): Promise<void> {
  const url = "https://hn.algolia.com/api/v1/search?tags=front_page";
  const data = await fetchJson<HackerNewsResponse>(url);

  const articles: NormalizedArticle[] = (data.hits ?? [])
    .map((hit) => ({
      source: "Hacker News",
      title: hit.title ?? "Untitled",
      url: hit.url ?? "",
      publishedAt: hit.created_at,
      author: hit.author,
      category: "technology",
    }))
    .filter((a) => a.url && a.title && a.title !== "Untitled");

  printResult(buildResult(SOURCE, CATEGORY, articles));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  aggregate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
