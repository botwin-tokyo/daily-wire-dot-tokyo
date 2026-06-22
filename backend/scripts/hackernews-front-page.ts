#!/usr/bin/env node
/**
 * Hacker News — front page (technology).
 *
 * No API key required. Fetches the linked article URL via Ladder when available
 * and extracts the full article body.
 * Docs: https://hn.algolia.com/api
 */

import { pathToFileURL } from "node:url";
import { fetchJson, buildResult, printResult } from "./lib/fetch";
import { extractArticleFromHtml } from "./lib/extract";
import { fetchViaLadder, isLadderConfigured } from "./lib/ladder";
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

async function fetchDirectContent(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheMorningWireBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) return undefined;
    const html = await response.text();
    const extracted = extractArticleFromHtml(html, url);
    return extracted.content.length > 200 ? extracted.content : undefined;
  } catch {
    return undefined;
  }
}

async function fetchJinaContent(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://r.jina.ai/http://${encodeURIComponent(url)}`, {
      headers: { Accept: "text/plain,*/*" },
    });
    if (!response.ok) return undefined;
    const text = await response.text();
    return text.length > 200 ? text : undefined;
  } catch {
    return undefined;
  }
}

async function fetchFullContent(url: string): Promise<string | undefined> {
  if (!url) return undefined;

  if (isLadderConfigured()) {
    try {
      const html = await fetchViaLadder(url);
      const extracted = extractArticleFromHtml(html, url);
      if (extracted.content.length > 200) return extracted.content;
    } catch {
      // fall through
    }
  }

  const direct = await fetchDirectContent(url);
  if (direct) return direct;

  return fetchJinaContent(url);
}

export async function aggregate(): Promise<void> {
  const url = "https://hn.algolia.com/api/v1/search?tags=front_page";
  const data = await fetchJson<HackerNewsResponse>(url);

  const hits = (data.hits ?? []).filter((hit) => hit.url && hit.title && hit.title !== "Untitled");

  const articles: NormalizedArticle[] = [];
  for (const hit of hits.slice(0, 20)) {
    const content = await fetchFullContent(hit.url!);
    articles.push({
      source: "Hacker News",
      title: hit.title!,
      url: hit.url!,
      publishedAt: hit.created_at,
      author: hit.author,
      category: "technology",
      summary: content?.slice(0, 1200),
      content,
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
