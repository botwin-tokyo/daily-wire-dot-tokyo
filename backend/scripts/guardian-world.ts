/**
 * GUARDIAN world news via RSS.
 *
 * Ingests The Guardian's world RSS feed directly. This avoids intermittent
 * Ladder blocks on the section front pages.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "world",
    url: "https://www.theguardian.com/world/rss",
    linkPattern: /^https?:\/\/www\.theguardian\.com\/world\/\d{4}\/[a-z]{3}\/\d{2}\//,
    fetchFullContent: true,
  },
];

aggregateFromRssFeeds("guardian", "world", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
