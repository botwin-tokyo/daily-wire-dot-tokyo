#!/usr/bin/env node
/**
 * Spaceflight News API — science/space headlines.
 *
 * No API key required. Fetches each article URL via Ladder and extracts the
 * full article body when available.
 * Docs: https://api.spaceflightnewsapi.net/v4/docs/
 */

import { pathToFileURL } from "node:url";
import { fetchJson, buildResult, printResult } from "./lib/fetch";
import { extractArticleFromHtml } from "./lib/extract";
import { fetchViaLadder, isLadderConfigured } from "./lib/ladder";
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

async function fetchFullContent(url: string): Promise<string | undefined> {
  if (!isLadderConfigured() || !url) return undefined;
  try {
    const html = await fetchViaLadder(url);
    const extracted = extractArticleFromHtml(html, url);
    return extracted.content;
  } catch {
    return undefined;
  }
}

export async function aggregate(): Promise<void> {
  const url = "https://api.spaceflightnewsapi.net/v4/articles/?limit=25";
  const data = await fetchJson<SpaceflightResponse>(url);

  const items = (data.results ?? []).filter((item) => item.title && item.url);
  const articles: NormalizedArticle[] = [];

  for (const item of items) {
    const content = await fetchFullContent(item.url!);
    articles.push({
      source: item.news_site ?? "Spaceflight News",
      title: item.title!,
      url: item.url!,
      summary: content?.slice(0, 1200) ?? item.summary?.trim() ?? undefined,
      content,
      publishedAt: item.published_at,
      imageUrl: item.image_url,
      author: item.authors?.[0]?.name ?? undefined,
      category: CATEGORY,
      language: "en",
    });
  }

  printResult(buildResult(SOURCE, CATEGORY, articles));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  aggregate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
