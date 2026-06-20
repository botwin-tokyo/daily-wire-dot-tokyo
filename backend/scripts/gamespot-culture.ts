/**
 * GameSpot gaming news aggregator.
 *
 * Strategy order:
 *   1. Scrape the GameSpot news index via Ladder.
 *   2. Fall back to the GameSpot news RSS feed (full content is included).
 *   3. Firecrawl fallback if Ladder/RSS both fail (not tested; only runs if configured).
 */

import { aggregateWithFallbacks } from "./lib/multi-strategy";

aggregateWithFallbacks({
  source: "gamespot",
  category: "culture",
  maxArticles: 12,
  scrape: {
    indexUrl: "https://www.gamespot.com/news/",
    linkPattern: /https:\/\/www\.gamespot\.com\/(articles|news)\/[^/]+\/$/,
    linkSelector: "a[href*='/articles/'], a[href*='/news/']",
    titleSelector: "h1",
  },
  rss: {
    url: "https://www.gamespot.com/feeds/news/",
    maxItems: 12,
    linkPattern: /https:\/\/www\.gamespot\.com\/articles\//,
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
