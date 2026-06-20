#!/usr/bin/env node
/**
 * Spaceflight News API — science/space headlines.
 *
 * No API key required.
 * Docs: https://api.spaceflightnewsapi.net/v4/docs/
 */

import { pathToFileURL } from "node:url";
import { fetchJson, buildResult, printResult } from "./lib/fetch";
import type { NormalizedArticle } from "./lib/types";

interface SpaceflightAuthor {
  name?: string;
}

interface SpaceflightArticle {
  id?: number;
  title?: string;
  url?: string;
  image_url?: string;
  news_site?: string;
  summary?: string;
  published_at?: string;
  authors?: SpaceflightAuthor[];
}

interface SpaceflightResponse {
  count?: number;
  results?: SpaceflightArticle[];
}

const SOURCE = "spaceflight";
const CATEGORY = "science";

export async function aggregate(): Promise<void> {
  const url = "https://api.spaceflightnewsapi.net/v4/articles/?limit=25";
  const data = await fetchJson<SpaceflightResponse>(url);

  const articles: NormalizedArticle[] = (data.results ?? [])
    .map((item) => ({
      source: item.news_site ?? "Spaceflight News",
      title: item.title ?? "Untitled",
      url: item.url ?? "",
      summary: item.summary?.trim() || undefined,
      publishedAt: item.published_at,
      imageUrl: item.image_url,
      author: item.authors?.[0]?.name ?? undefined,
      category: CATEGORY,
      language: "en",
    }))
    .filter((a) => a.title && a.url);

  printResult(buildResult(SOURCE, CATEGORY, articles));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  aggregate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
