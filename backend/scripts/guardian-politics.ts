/**
 * The Guardian US politics news via RSS + Ladder.
 *
 * Ingests The Guardian's US politics RSS feed. Full articles are fetched
 * through Ladder when the RSS description does not contain enough text.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "politics",
    url: "https://www.theguardian.com/us-news/us-politics/rss",
    linkPattern: /^https?:\/\/www\.theguardian\.com\/us-news\/\d{4}\/[a-z]{3}\/\d{2}\//,
    fetchFullContent: true,
    maxItems: 8,
  },
];

aggregateFromRssFeeds("guardian-politics", "politics", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
