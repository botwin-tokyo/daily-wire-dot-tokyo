#!/usr/bin/env node
/**
 * Anime News Network culture news.
 *
 * Strategy chain (first that returns articles wins):
 *   1. Basic scrape of the ANN homepage for article links.
 *   2. Ladder proxy scrape of the homepage.
 *   3. ANN public API attempt (no known public endpoint; expected to fail).
 *   4. ANN public RSS/Atom feed, with Ladder fetching full article text.
 *   5. Firecrawl fallback (only if configured; not tested when credits are exhausted).
 *
 * Articles are normalized to the shared pipeline format and categorized as "culture".
 */

import { JSDOM } from "jsdom";
import { extractArticleFromHtml } from "./lib/extract";
import { fetchViaLadder, isLadderConfigured } from "./lib/ladder";
import { fetchViaFirecrawl, isFirecrawlConfigured } from "./lib/firecrawl";
import { collectFromRssFeeds } from "./lib/rss-source";
import { buildResult, printResult } from "./lib/fetch";
import type { NormalizedArticle } from "./lib/types";

const SOURCE = "Anime News Network";
const CATEGORY = "culture";
const INDEX_URL = "https://www.animenewsnetwork.com/";
const RSS_URL = "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us";
const ATOM_URL = "https://www.animenewsnetwork.com/all/atom.xml?ann-edition=us";
const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?animenewsnetwork\.com\/news\/\d{4}-\d{2}-\d{2}\/[^/]+\/\.\d+$/;
// ANN puts the real article text inside .text-zone.easyread-width; without this
// selector Readability pulls in the entire page including sidebars.
const CONTENT_SELECTOR = ".text-zone.easyread-width";

function extractLinks(html: string, baseUrl: string, max: number): string[] {
  const dom = new JSDOM(html, { url: baseUrl });
  const anchors = dom.window.document.querySelectorAll("a[href]");
  const seen = new Set<string>();
  const links: string[] = [];

  for (const anchor of anchors) {
    const href = (anchor.getAttribute("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;

    let absolute: string;
    try {
      absolute = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    absolute = absolute.split("#")[0].split("?")[0];
    if (seen.has(absolute)) continue;
    if (!ARTICLE_PATTERN.test(absolute)) continue;

    seen.add(absolute);
    links.push(absolute);
    if (links.length >= max) break;
  }

  return links;
}

async function fetchHtml(url: string, useLadder: boolean): Promise<string> {
  if (useLadder) {
    return fetchViaLadder(url);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; TheMorningWire-AggregationBot/1.0)",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function extractArticlesFromLinks(
  links: string[],
  fetcher: (url: string) => Promise<string>,
): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  for (const link of links) {
    try {
      const articleHtml = await fetcher(link);
      const extracted = extractArticleFromHtml(articleHtml, link, undefined, CONTENT_SELECTOR);
      articles.push({
        source: SOURCE,
        category: CATEGORY,
        title: extracted.title,
        url: link,
        summary: extracted.summary,
        content: extracted.content,
        imageUrl: extracted.imageUrl ?? undefined,
        publishedAt: extracted.publishedAt ?? undefined,
        author: extracted.byline ?? undefined,
        language: extracted.language ?? "en",
      });
    } catch (err) {
      console.error(
        `[${SOURCE}] Failed article ${link}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return articles;
}

async function tryScrape(useLadder: boolean, max: number): Promise<NormalizedArticle[]> {
  const label = useLadder ? "Ladder" : "basic";
  try {
    const indexHtml = await fetchHtml(INDEX_URL, useLadder);
    const links = extractLinks(indexHtml, INDEX_URL, max);
    if (links.length === 0) return [];

    const fetcher = (url: string) => fetchHtml(url, useLadder);
    const articles = await extractArticlesFromLinks(links, fetcher);
    if (articles.length > 0) {
      console.error(`[${SOURCE}] ${label} scrape returned ${articles.length} articles.`);
    }
    return articles;
  } catch (err) {
    console.error(
      `[${SOURCE}] ${label} scrape failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

async function tryApi(max: number): Promise<NormalizedArticle[]> {
  // ANN does not expose a public, unauthenticated API for news aggregation.
  // This step is intentionally a no-op so the script falls through to RSS.
  console.error(`[${SOURCE}] API strategy: no public API available; skipping.`);
  return [];
}

async function tryRss(max: number): Promise<NormalizedArticle[]> {
  try {
    return collectFromRssFeeds(
      SOURCE,
      [
        {
          category: CATEGORY,
          url: RSS_URL,
          maxItems: max,
          fetchFullContent: isLadderConfigured(),
          contentSelector: CONTENT_SELECTOR,
        },
        {
          category: CATEGORY,
          url: ATOM_URL,
          maxItems: max,
          fetchFullContent: isLadderConfigured(),
          contentSelector: CONTENT_SELECTOR,
        },
      ],
      max,
    );
  } catch (err) {
    console.error(`[${SOURCE}] RSS failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function tryFirecrawl(max: number): Promise<NormalizedArticle[]> {
  if (!isFirecrawlConfigured()) {
    console.error(`[${SOURCE}] Firecrawl not configured; skipping.`);
    return [];
  }

  try {
    const indexHtml = await fetchViaFirecrawl(INDEX_URL);
    const links = extractLinks(indexHtml, INDEX_URL, max);
    if (links.length === 0) return [];

    const articles = await extractArticlesFromLinks(links, fetchViaFirecrawl);
    if (articles.length > 0) {
      console.error(`[${SOURCE}] Firecrawl returned ${articles.length} articles.`);
    }
    return articles;
  } catch (err) {
    console.error(
      `[${SOURCE}] Firecrawl failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

async function main(): Promise<void> {
  const max = 8;
  let articles: NormalizedArticle[] = [];
  let strategy = "none";

  // 1. Basic scrape
  const basic = await tryScrape(false, max);
  if (basic.length > 0) {
    articles = basic;
    strategy = "basic";
  }

  // 2. Ladder scrape
  if (articles.length === 0 && isLadderConfigured()) {
    const ladder = await tryScrape(true, max);
    if (ladder.length > 0) {
      articles = ladder;
      strategy = "ladder";
    }
  }

  // 3. API attempt (no public endpoint for ANN)
  if (articles.length === 0) {
    const api = await tryApi(max);
    if (api.length > 0) {
      articles = api;
      strategy = "api";
    }
  }

  // 4. RSS/Atom feed
  if (articles.length === 0) {
    const rss = await tryRss(max);
    if (rss.length > 0) {
      articles = rss;
      strategy = "rss";
    }
  }

  // 5. Firecrawl fallback
  if (articles.length === 0) {
    const firecrawl = await tryFirecrawl(max);
    if (firecrawl.length > 0) {
      articles = firecrawl;
      strategy = "firecrawl";
    }
  }

  console.error(`[${SOURCE}] Used ${strategy} strategy (${articles.length} articles).`);
  printResult(buildResult(SOURCE, CATEGORY, articles));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
