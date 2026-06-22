/**
 * Shared runner for direct HTML scraping (no proxy required).
 *
 * Fetches publisher listing pages with a browser-like user agent, extracts
 * article links, then fetches each article and parses it with Readability.
 */

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { buildResult, printResult } from "./fetch";
import { plainText } from "./extract";
import type { NormalizedArticle } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export interface DirectHtmlPage {
  /** Category label for articles from this page. */
  category: string;
  /** URL of the listing page. */
  url: string;
  /** CSS selector for the article link elements. */
  linkSelector: string;
  /** Regex applied to the absolute article URL to filter links. */
  linkPattern?: RegExp;
  /** CSS selector for the title element inside each link container (defaults to the link text). */
  titleSelector?: string;
  /** CSS selector for the published date inside each link container. */
  dateSelector?: string;
  /** Maximum items to ingest from this page. */
  maxItems?: number;
}

function absoluteUrl(base: string, href: string | null): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).href;
  } catch {
    return undefined;
  }
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function extractListingLinks(
  document: Document,
  page: DirectHtmlPage,
  baseUrl: string,
): Array<{ url: string; title: string; publishedAt?: string }> {
  const results: Array<{ url: string; title: string; publishedAt?: string }> = [];

  const elements = document.querySelectorAll(page.linkSelector);
  const pending = new Map<string, { title: string; publishedAt?: string }>();

  for (const el of elements) {
    const link = el.closest("a") ?? (el.matches("a") ? el : null);
    const href = absoluteUrl(baseUrl, link?.getAttribute("href") ?? el.getAttribute("href"));
    if (!href) continue;
    if (page.linkPattern && !page.linkPattern.test(href)) continue;

    const title = page.titleSelector
      ? el.querySelector(page.titleSelector)?.textContent?.trim() ||
        link?.querySelector(page.titleSelector)?.textContent?.trim() ||
        el.textContent?.trim()
      : el.textContent?.trim() || link?.textContent?.trim();

    const publishedAt = page.dateSelector
      ? parseDate(
          el.closest("article, li, div")?.querySelector(page.dateSelector)?.textContent?.trim(),
        )
      : undefined;

    // Skip links with no title (e.g. image-only cards) so a later text link
    // with the same URL can still be accepted.
    if (!title) continue;
    if (pending.has(href)) continue;

    pending.set(href, { title, publishedAt });

    const max = page.maxItems ?? 5;
    if (pending.size >= max) break;
  }

  for (const [url, { title, publishedAt }] of pending) {
    results.push({ url, title, publishedAt });
  }

  return results;
}

async function fetchArticle(url: string): Promise<Partial<NormalizedArticle> | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    const reader = new Readability(document, { charThreshold: 0 });
    const parsed = reader.parse();
    if (!parsed) return null;

    const metaDate =
      document.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ||
      document.querySelector('meta[name="publishedDate"]')?.getAttribute("content") ||
      null;

    const imageUrl =
      document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
      null;

    const content = parsed.textContent ?? "";

    return {
      title: parsed.title || undefined,
      summary: content.slice(0, 500),
      content: content,
      publishedAt: parseDate(metaDate ?? undefined),
      imageUrl: imageUrl ?? undefined,
      author: parsed.byline ?? undefined,
      language: document.documentElement?.lang || "en",
    };
  } catch (err) {
    console.error(
      `[direct-html] Failed article ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export async function collectFromHtmlPages(
  source: string,
  pages: DirectHtmlPage[],
  defaultMax = 5,
): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  for (const page of pages) {
    try {
      const response = await fetch(page.url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
      });
      if (!response.ok) {
        throw new Error(`Listing returned HTTP ${response.status}`);
      }
      const html = await response.text();
      const dom = new JSDOM(html, { url: page.url });
      const links = extractListingLinks(dom.window.document, page, page.url);

      for (const item of links) {
        const details = await fetchArticle(item.url);
        if (!details || !details.title) continue;

        articles.push({
          source,
          category: page.category,
          title: details.title || item.title,
          url: item.url,
          summary: details.summary,
          content: details.content,
          publishedAt: details.publishedAt || item.publishedAt,
          imageUrl: details.imageUrl,
          author: details.author,
          language: details.language,
        });
      }
    } catch (err) {
      console.error(
        `[${source}] Failed page ${page.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return articles;
}

export async function aggregateFromHtmlPages(
  source: string,
  resultCategory: string,
  pages: DirectHtmlPage[],
  defaultMax = 5,
): Promise<void> {
  const articles = await collectFromHtmlPages(source, pages, defaultMax);
  printResult(buildResult(source, resultCategory, articles));
}
