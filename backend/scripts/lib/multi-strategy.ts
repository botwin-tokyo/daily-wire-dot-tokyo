/**
 * Multi-strategy article aggregator.
 *
 * Tries sources in this order:
 *   1. Basic scraping via the Ladder proxy.
 *   2. RSS/Atom feed.
 *   3. Firecrawl fallback (only if configured / not disabled).
 *
 * The first strategy that returns at least one article wins.
 */

import { JSDOM } from "jsdom";
import { extractArticleFromHtml } from "./extract";
import { fetchViaLadder, isLadderConfigured } from "./ladder";
import { fetchViaFirecrawl, isFirecrawlConfigured, isFirecrawlQuotaExhausted } from "./firecrawl";
import { collectFromRssFeeds } from "./rss-source";
import { buildResult, printResult } from "./fetch";
import type { NormalizedArticle } from "./types";

export interface ScrapeConfig {
  /** Index/section page URL to scrape for article links. */
  indexUrl: string;
  /** Regex applied to absolute article URLs. */
  linkPattern: RegExp;
  /** Optional CSS selector to narrow the link search. */
  linkSelector?: string;
  /** Optional CSS selector for the article headline. */
  titleSelector?: string;
  /** Maximum articles to follow. */
  maxArticles?: number;
}

export interface RssConfig {
  url: string;
  maxItems?: number;
  linkPattern?: RegExp;
}

export interface MultiStrategyConfig {
  source: string;
  category: string;
  maxArticles?: number;
  scrape?: ScrapeConfig;
  rss?: RssConfig;
}

function extractLinks(
  html: string,
  baseUrl: string,
  selector: string | undefined,
  pattern: RegExp,
  max: number,
): string[] {
  const dom = new JSDOM(html, { url: baseUrl });
  const document = dom.window.document;
  const anchors = selector
    ? document.querySelectorAll(selector)
    : document.querySelectorAll("a[href]");

  const seen = new Set<string>();
  const links: string[] = [];

  for (const anchor of anchors) {
    let href = (anchor.getAttribute("href") ?? "").trim();
    if (!href) continue;
    href = href.replace(/^["']|["']$/g, "");
    if (href.startsWith("#") || href.startsWith("javascript:")) continue;

    let rawHref = href;
    if (rawHref.startsWith("/http://") || rawHref.startsWith("/https://")) {
      rawHref = rawHref.slice(1);
    }

    let absolute: string;
    try {
      absolute = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }

    absolute = absolute.replace(/(https?:\/\/[^/]+)\/{2,}/g, "$1/");
    absolute = absolute.split("#")[0].split("?")[0];

    if (seen.has(absolute)) continue;
    if (!pattern.test(absolute)) continue;

    seen.add(absolute);
    links.push(absolute);
    if (links.length >= max) break;
  }

  return links;
}

async function tryScrape(
  config: ScrapeConfig,
  source: string,
  category: string,
  max: number,
): Promise<NormalizedArticle[]> {
  if (!isLadderConfigured()) return [];
  const articles: NormalizedArticle[] = [];

  try {
    const indexHtml = await fetchViaLadder(config.indexUrl);
    const links = extractLinks(
      indexHtml,
      config.indexUrl,
      config.linkSelector,
      config.linkPattern,
      config.maxArticles ?? max,
    );

    for (const link of links) {
      try {
        const articleHtml = await fetchViaLadder(link);
        const extracted = extractArticleFromHtml(articleHtml, link, config.titleSelector);
        articles.push({
          source,
          category,
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
          `[${source}] Failed article ${link}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    console.error(
      `[${source}] Scrape failed for ${config.indexUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return articles;
}

async function tryRss(
  rss: RssConfig,
  source: string,
  category: string,
  max: number,
): Promise<NormalizedArticle[]> {
  return collectFromRssFeeds(
    source,
    [
      {
        category,
        url: rss.url,
        maxItems: rss.maxItems ?? max,
        linkPattern: rss.linkPattern,
      },
    ],
    rss.maxItems ?? max,
  );
}

async function tryFirecrawl(
  scrapeConfig: ScrapeConfig,
  source: string,
  category: string,
  max: number,
): Promise<NormalizedArticle[]> {
  if (!isFirecrawlConfigured() || isFirecrawlQuotaExhausted()) return [];
  const articles: NormalizedArticle[] = [];

  try {
    const indexHtml = await fetchViaFirecrawl(scrapeConfig.indexUrl);
    const links = extractLinks(
      indexHtml,
      scrapeConfig.indexUrl,
      scrapeConfig.linkSelector,
      scrapeConfig.linkPattern,
      scrapeConfig.maxArticles ?? max,
    );

    for (const link of links) {
      try {
        const articleHtml = await fetchViaFirecrawl(link);
        const extracted = extractArticleFromHtml(articleHtml, link, scrapeConfig.titleSelector);
        articles.push({
          source,
          category,
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
          `[${source}] Firecrawl article failed ${link}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    console.error(
      `[${source}] Firecrawl index failed ${scrapeConfig.indexUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return articles;
}

export async function aggregateWithFallbacks(config: MultiStrategyConfig): Promise<void> {
  const max = config.maxArticles ?? 12;
  let articles: NormalizedArticle[] = [];
  let strategy = "none";

  if (config.scrape) {
    const scraped = await tryScrape(config.scrape, config.source, config.category, max);
    if (scraped.length > 0) {
      articles = scraped;
      strategy = "scrape";
    }
  }

  if (articles.length === 0 && config.rss) {
    const rssArticles = await tryRss(config.rss, config.source, config.category, max);
    if (rssArticles.length > 0) {
      articles = rssArticles;
      strategy = "rss";
    }
  }

  if (articles.length === 0 && config.scrape) {
    const firecrawlArticles = await tryFirecrawl(
      config.scrape,
      config.source,
      config.category,
      max,
    );
    if (firecrawlArticles.length > 0) {
      articles = firecrawlArticles;
      strategy = "firecrawl";
    }
  }

  if (strategy !== "none") {
    console.error(`[${config.source}] Used ${strategy} strategy (${articles.length} articles).`);
  } else {
    console.error(`[${config.source}] No strategy produced articles.`);
  }

  printResult(buildResult(config.source, config.category, articles));
}
