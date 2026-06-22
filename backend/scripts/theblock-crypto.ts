/**
 * The Block crypto news via multi-strategy fallback ending with Firecrawl.
 *
 * The Block is Cloudflare-protected, so basic scraping, Ladder, RSS, and the
 * WordPress API are blocked. This script tries Ladder-based scraping and RSS
 * first, then falls back to Firecrawl. Firecrawl is not tested because API
 * credits are currently exhausted.
 */

import { aggregateWithFallbacks } from "./lib/multi-strategy";

aggregateWithFallbacks({
  source: "theblock",
  category: "crypto",
  maxArticles: 6,
  scrape: {
    indexUrl: "https://www.theblock.co/",
    linkPattern: /^https?:\/\/www\.theblock\.co\/post\/\d+\/[a-z0-9-]+\/?$/,
    titleSelector: "h1",
  },
  rss: {
    url: "https://www.theblock.co/feed",
    maxItems: 6,
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
