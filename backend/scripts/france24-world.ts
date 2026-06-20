/**
 * FRANCE24 world news via RSS.
 *
 * Ingests the France 24 English RSS feed and filters out TV/video items by
 * requiring the article URL to contain a dated slug.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "world",
    url: "https://www.france24.com/en/rss",
    linkPattern: /^https?:\/\/www\.france24\.com\/en\/[a-z-]+\/\d{8}-/,
    fetchFullContent: true,
  },
];

aggregateFromRssFeeds("france24", "world", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
