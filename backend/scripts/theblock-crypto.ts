/**
 * The Block crypto news via Firecrawl.
 *
 * The Block is Cloudflare-protected, so basic scraping, Ladder, RSS, and the
 * WordPress API are blocked. Firecrawl is the only known working method.
 * This script is not tested because Firecrawl API credits are currently exhausted.
 */

import { JSDOM } from "jsdom";
import { extractArticleFromHtml } from "./lib/extract";
import { fetchViaFirecrawl } from "./lib/firecrawl";
import { buildResult, printResult } from "./lib/fetch";
import type { NormalizedArticle } from "./lib/types";

const SOURCE = "theblock";
const CATEGORY = "crypto";
const INDEX_URL = "https://www.theblock.co/";
const ARTICLE_PATTERN = /^https?:\/\/www\.theblock\.co\/post\/\d+\/[a-z0-9-]+\/?$/;

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
  const max = 6;
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
