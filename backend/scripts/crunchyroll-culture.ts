#!/usr/bin/env node
/**
 * Crunchyroll News culture news.
 *
 * Strategy chain (first that returns articles wins):
 *   1. Basic scrape of the Crunchyroll News latest page.
 *   2. Ladder proxy scrape of the latest page.
 *   3. Crunchyroll news API attempt (requires OAuth; expected to fail unauthenticated).
 *   4. Legacy RSS/Atom feed attempt (deprecated; expected to be empty).
 *   5. Firecrawl fallback for the JS-rendered latest page.
 *
 * Crunchyroll News is a Next.js app that bails out to client-side rendering,
 * so basic and Ladder scrapes usually return no usable article links. The
 * Firecrawl path is the production-ready fallback. It is implemented but not
 * exercised here because Firecrawl credits are currently exhausted.
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

const SOURCE = "Crunchyroll News";
const CATEGORY = "culture";
const INDEX_URL = "https://www.crunchyroll.com/news/latest";
const RSS_URL = "https://feeds.feedburner.com/crunchyroll/animenews";
const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?crunchyroll\.com\/news\/(?:latest|announcements|seasonal-lineup|features|interviews|reviews)\/\d{4}\/\d{1,2}\/\d{1,2}\/[a-z0-9-]+$/;

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
      const extracted = extractArticleFromHtml(articleHtml, link);
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
    if (links.length === 0) {
      console.error(`[${SOURCE}] ${label} scrape found no article links.`);
      return [];
    }

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
  // Crunchyroll's news API is authenticated via OAuth and requires a valid
  // access token. There is no stable public, unauthenticated endpoint, so this
  // strategy is expected to fail and the script falls through to Firecrawl.
  console.error(
    `[${SOURCE}] API strategy: requires OAuth authentication; skipping unauthenticated attempt.`,
  );
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
          linkPattern: ARTICLE_PATTERN,
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
    if (links.length === 0) {
      console.error(`[${SOURCE}] Firecrawl found no article links.`);
      return [];
    }

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

  // 3. API attempt (requires OAuth)
  if (articles.length === 0) {
    const api = await tryApi(max);
    if (api.length > 0) {
      articles = api;
      strategy = "api";
    }
  }

  // 4. RSS attempt (deprecated feed)
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
