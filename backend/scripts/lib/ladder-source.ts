/**
 * Shared runner for Ladder-based page scraping.
 *
 * Each source defines a list of index/section pages. The runner fetches each
 * page through the local Ladder proxy, extracts article links using a
 * site-specific regex, then fetches every article through Ladder and parses
 * the content with Mozilla Readability.
 */

import { JSDOM } from "jsdom";
import { extractArticleFromHtml } from "./extract";
import { fetchViaFirecrawl, isFirecrawlConfigured } from "./firecrawl";
import { fetchViaLadder, isLadderConfigured } from "./ladder";
import { buildResult, printResult } from "./fetch";
import type { NormalizedArticle } from "./types";

export interface LadderPage {
  /** Category label for articles discovered on this page. */
  category: string;
  /** URL of the index/section page to scrape. */
  url: string;
  /** Optional CSS selector to narrow the link search (default: all `a[href]`). */
  linkSelector?: string;
  /** Regex applied to the absolute article URL to decide if it is an article. */
  linkPattern: RegExp;
  /** Maximum article links to follow from this page. */
  maxArticles?: number;
  /**
   * Use Firecrawl instead of Ladder for this page. Useful for publishers that
   * serve bot challenges Ladder cannot solve.
   */
  useFirecrawl?: boolean;
  /**
   * Optional CSS selector for the article headline. Some sites have a generic
   * <title> or put the real headline in a specific element (e.g. h1, h2).
   */
  titleSelector?: string;
}

function extractArticleLinks(
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
    // Some sites wrap hrefs in quotes; strip them.
    href = href.replace(/^["']|["']$/g, "");
    if (href.startsWith("#") || href.startsWith("javascript:")) continue;

    // Ladder rewrites links so they are browsable through the proxy UI, e.g.
    // /https://example.com//2026/06/19/article.html. Unwrap those.
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

    // Normalize double slashes that sometimes appear after the host.
    absolute = absolute.replace(/(https?:\/\/[^/]+)\/{2,}/g, "$1/");

    // Fragments and query variants create duplicates (article vs. #comments,
    // ?extended-comments=1, etc.).
    absolute = absolute.split("#")[0].split("?")[0];

    if (seen.has(absolute)) continue;
    if (!pattern.test(absolute)) continue;

    seen.add(absolute);
    links.push(absolute);
    if (links.length >= max) break;
  }

  return links;
}

function buildFetchHtml(primary: "ladder" | "firecrawl") {
  const ladderAvailable = isLadderConfigured();
  const firecrawlAvailable = isFirecrawlConfigured();

  return async (url: string): Promise<string> => {
    const errors: string[] = [];
    const primaryFn = primary === "ladder" ? fetchViaLadder : fetchViaFirecrawl;
    const fallbackFn = primary === "ladder" ? fetchViaFirecrawl : fetchViaLadder;
    const fallbackAvailable = primary === "ladder" ? firecrawlAvailable : ladderAvailable;

    try {
      return await primaryFn(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${primary}: ${message}`);
      if (fallbackAvailable) {
        try {
          return await fallbackFn(url);
        } catch (fallbackErr) {
          const fallbackMessage =
            fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          errors.push(`${primary === "ladder" ? "firecrawl" : "ladder"}: ${fallbackMessage}`);
        }
      }
      throw new Error(errors.join("; "));
    }
  };
}

export async function aggregateFromLadderPages(
  source: string,
  resultCategory: string,
  pages: LadderPage[],
  defaultMax = 5,
): Promise<void> {
  const usesLadder = pages.some((page) => !page.useFirecrawl);
  if (usesLadder && !isLadderConfigured()) {
    throw new Error("Missing environment variable: LADDER_URL");
  }
  if (pages.some((page) => page.useFirecrawl) && !isFirecrawlConfigured()) {
    throw new Error("Firecrawl is not configured");
  }

  const articles: NormalizedArticle[] = [];

  for (const page of pages) {
    const fetchHtml = buildFetchHtml(page.useFirecrawl ? "firecrawl" : "ladder");

    try {
      const indexHtml = await fetchHtml(page.url);
      const links = extractArticleLinks(
        indexHtml,
        page.url,
        page.linkSelector,
        page.linkPattern,
        page.maxArticles ?? defaultMax,
      );

      for (const link of links) {
        try {
          const articleHtml = await fetchHtml(link);
          const extracted = extractArticleFromHtml(articleHtml, link, page.titleSelector);
          articles.push({
            source,
            category: page.category,
            title: extracted.title,
            url: link,
            summary: extracted.summary,
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
        `[${source}] Failed index ${page.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // The same article may be linked from multiple section pages (e.g. Stripes
  // theaters), so deduplicate by URL before building the result.
  const seenUrls = new Set<string>();
  const uniqueArticles = articles.filter((article) => {
    if (seenUrls.has(article.url)) return false;
    seenUrls.add(article.url);
    return true;
  });

  printResult(buildResult(source, resultCategory, uniqueArticles));
}
