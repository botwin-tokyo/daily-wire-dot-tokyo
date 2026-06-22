/**
 * The War Zone (TWZ) war and defense news.
 *
 * TWZ's WordPress REST API is protected by a browser challenge, so this script
 * falls back to Ladder-based homepage scraping and then to the public RSS feed.
 */

import { aggregateWithFallbacks } from "./lib/multi-strategy";

aggregateWithFallbacks({
  source: "twz",
  category: "war",
  maxArticles: 6,
  scrape: {
    indexUrl: "https://www.twz.com/",
    linkPattern:
      /^https?:\/\/(?:www\.)?twz\.com\/(?:air|land|sea|space|cyber|nuclear|news|news-features)\/[a-z0-9-]+$/,
    titleSelector: "h1",
  },
  rss: {
    url: "https://www.twz.com/feed/",
    maxItems: 6,
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
