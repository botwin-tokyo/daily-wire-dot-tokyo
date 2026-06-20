/**
 * GUARDIAN business news via RSS.
 *
 * Ingests The Guardian's business RSS feed directly.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "business",
    url: "https://www.theguardian.com/business/rss",
    linkPattern: /^https?:\/\/www\.theguardian\.com\/business\/\d{4}\/[a-z]{3}\/\d{2}\//,
    fetchFullContent: true,
  },
];

aggregateFromRssFeeds("guardian", "business", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
