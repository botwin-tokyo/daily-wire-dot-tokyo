/**
 * Shared runner for RSS/Atom feed aggregation.
 *
 * Some publishers (e.g. Politico) expose full-content RSS feeds that are easier
 * to consume than their JS-rendered websites. This helper parses a feed with
 * JSDOM, strips HTML from summaries, and emits normalized articles.
 */

import { JSDOM } from "jsdom";
import { buildResult, printResult } from "./fetch";
import { plainText, extractArticleFromHtml } from "./extract";
import { fetchViaLadder, isLadderConfigured } from "./ladder";
import type { NormalizedArticle } from "./types";

export interface RssFeed {
  /** Category label for articles from this feed. */
  category: string;
  /** URL of the RSS/Atom feed. */
  url: string;
  /** Maximum items to ingest from this feed. */
  maxItems?: number;
  /** Optional regex applied to the absolute article URL to filter items. */
  linkPattern?: RegExp;
  /** Fetch the full article HTML via Ladder and extract body text (default: false). */
  fetchFullContent?: boolean;
  /** Optional CSS selector for the article body when fetching full content. */
  contentSelector?: string;
}

function stripHtml(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  return dom.window.document.body.textContent?.trim() || undefined;
}

function getChildText(
  parent: Element | Document,
  localName: string,
  namespace?: string,
): string | undefined {
  const elements = namespace
    ? parent.getElementsByTagNameNS(namespace, localName)
    : parent.getElementsByTagName(localName);
  return elements[0]?.textContent?.trim() || undefined;
}

function parseRssDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function extractImageUrl(item: Element): string | undefined {
  const thumbnail =
    item.getElementsByTagName("media:thumbnail")[0] ||
    item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail")[0];
  const thumbUrl = thumbnail?.getAttribute("url");
  if (thumbUrl) return thumbUrl;

  const content =
    item.getElementsByTagName("media:content")[0] ||
    item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "content")[0];
  const contentUrl = content?.getAttribute("url");
  if (contentUrl) return contentUrl;

  const encoded = getChildText(item, "encoded", "http://purl.org/rss/1.0/modules/content/");
  if (encoded) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${encoded}</body></html>`);
    const firstImg = dom.window.document.querySelector("img");
    if (firstImg) return firstImg.getAttribute("src") || undefined;
  }

  return undefined;
}

function extractSummary(item: Element): string | undefined {
  const description = getChildText(item, "description");
  if (description) return stripHtml(description);

  const encoded = getChildText(item, "encoded", "http://purl.org/rss/1.0/modules/content/");
  if (encoded) {
    const text = stripHtml(encoded);
    if (text) return text.slice(0, 500);
  }

  return undefined;
}

async function fetchFullContent(
  url: string,
  contentSelector?: string,
): Promise<string | undefined> {
  if (!isLadderConfigured()) return undefined;
  try {
    const html = await fetchViaLadder(url);
    const extracted = extractArticleFromHtml(html, url, undefined, contentSelector);
    return extracted.content;
  } catch {
    return undefined;
  }
}

function extractRssContent(item: Element): string | undefined {
  const encoded = getChildText(item, "encoded", "http://purl.org/rss/1.0/modules/content/");
  if (encoded) {
    const text = plainText(encoded);
    if (text) return text;
  }

  const description = getChildText(item, "description");
  if (description) {
    const text = plainText(description);
    if (text) return text;
  }

  return undefined;
}

export async function collectFromRssFeeds(
  source: string,
  feeds: RssFeed[],
  defaultMax = 5,
): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          Accept: "application/rss+xml, application/xml, */*",
          "User-Agent": "Mozilla/5.0 (compatible; TheMorningWireBot/1.0)",
        },
      });
      if (!response.ok) {
        throw new Error(`Feed returned HTTP ${response.status}`);
      }
      const xml = await response.text();
      const dom = new JSDOM(xml, { contentType: "application/xml" });
      const document = dom.window.document;
      const items = document.querySelectorAll("item");
      const max = feed.maxItems ?? defaultMax;

      let accepted = 0;
      for (let i = 0; i < items.length && accepted < max; i++) {
        const item = items[i];
        const title = getChildText(item, "title");
        const link = getChildText(item, "link") || getChildText(item, "guid") || undefined;
        if (!title || !link) continue;
        if (feed.linkPattern && !feed.linkPattern.test(link)) continue;

        const author =
          getChildText(item, "creator", "http://purl.org/dc/elements/1.1/") ||
          getChildText(item, "author");
        const cleanedAuthor = author?.replace(/^\s*By\s+/i, "");

        accepted++;
        const rssContent = extractRssContent(item);
        const fullContent = feed.fetchFullContent
          ? await fetchFullContent(link, feed.contentSelector)
          : undefined;
        articles.push({
          source,
          category: feed.category,
          title,
          url: link,
          summary: extractSummary(item),
          content: fullContent ?? rssContent,
          imageUrl: extractImageUrl(item),
          publishedAt: parseRssDate(getChildText(item, "pubDate")),
          author: cleanedAuthor,
          language: getChildText(document, "language") || "en",
        });
      }
    } catch (err) {
      console.error(
        `[${source}] Failed feed ${feed.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return articles;
}

export async function aggregateFromRssFeeds(
  source: string,
  resultCategory: string,
  feeds: RssFeed[],
  defaultMax = 5,
): Promise<void> {
  const articles = await collectFromRssFeeds(source, feeds, defaultMax);
  printResult(buildResult(source, resultCategory, articles));
}
