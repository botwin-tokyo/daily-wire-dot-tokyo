/**
 * IGN gaming/entertainment news aggregator.
 *
 * Strategy order:
 *   1. Scrape the IGN news index via Ladder.
 *   2. Fall back to the IGN "all articles" RSS feed (full content is included).
 *   3. Firecrawl fallback if Ladder/RSS both fail (not tested; only runs if configured).
 */

import { aggregateWithFallbacks } from "./lib/multi-strategy";

aggregateWithFallbacks({
  source: "ign",
  category: "culture",
  maxArticles: 12,
  scrape: {
    indexUrl: "https://www.ign.com/news",
    linkPattern: /https:\/\/www\.ign\.com\/(articles|news)\/[^/]+$/,
    linkSelector: "a[href^='/articles/'], a[href^='/news/']",
    titleSelector: "h1",
  },
  rss: {
    url: "http://feeds.ign.com/ign/all",
    maxItems: 12,
    linkPattern: /https:\/\/www\.ign\.com\/articles\//,
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
