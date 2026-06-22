/**
 * GUARDIAN science news via RSS.
 *
 * Ingests The Guardian's science RSS feed directly.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "science",
    url: "https://www.theguardian.com/science/rss",
    linkPattern: /^https?:\/\/www\.theguardian\.com\/science\/\d{4}\/[a-z]{3}\/\d{2}\//,
    fetchFullContent: true,
  },
];

aggregateFromRssFeeds("guardian", "science", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
