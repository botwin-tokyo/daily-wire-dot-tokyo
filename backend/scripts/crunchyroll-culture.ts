#!/usr/bin/env node
/**
 * Crunchyroll News culture news via Firecrawl.
 *
 * Crunchyroll News is a Next.js app that returns an empty client-side shell for
 * basic and Ladder scrapes, and its legacy RSS feed has been inactive since 2023.
 * Firecrawl is the only known working method. This script is not tested because
 * Firecrawl API credits are currently exhausted.
 */

import { JSDOM } from "jsdom";
import { extractArticleFromHtml } from "./lib/extract";
import { fetchViaFirecrawl } from "./lib/firecrawl";
import { buildResult, printResult } from "./lib/fetch";
import type { NormalizedArticle } from "./lib/types";

const SOURCE = "crunchyroll";
const CATEGORY = "culture";
const INDEX_URL = "https://www.crunchyroll.com/news/latest";
const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?crunchyroll\.com\/news\/(?:latest|announcements|seasonal-lineup|features|interviews|reviews)\/\d{4}\/\d{1,2}\/\d{1,2}\/[a-z0-9-]+$/;

function extractLinks(html: string, baseUrl: string, max: number): string[] {
  const dom = new JSDOM(html, { url: baseUrl });
  const anchors = dom.window.document.querySelectorAll("a[href]");
  const seen = new Set<string>();
  const links: string[] = [];

  for (const anchor of anchors) {
    const href = (anchor.getAttribute("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

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

async function main(): Promise<void> {
  const max = 8;
  const indexHtml = await fetchViaFirecrawl(INDEX_URL);
  const links = extractLinks(indexHtml, INDEX_URL, max);
  const articles: NormalizedArticle[] = [];

  for (const link of links) {
    try {
      const articleHtml = await fetchViaFirecrawl(link);
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

  printResult(buildResult(SOURCE, CATEGORY, articles));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
