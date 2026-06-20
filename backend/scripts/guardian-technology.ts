/**
 * GUARDIAN technology news via RSS.
 *
 * Ingests The Guardian's technology RSS feed directly.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "technology",
    url: "https://www.theguardian.com/technology/rss",
    linkPattern: /^https?:\/\/www\.theguardian\.com\/technology\/\d{4}\/[a-z]{3}\/\d{2}\//,
  },
];

aggregateFromRssFeeds("guardian", "technology", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
