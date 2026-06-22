/**
 * Politico defense/world news via RSS.
 *
 * Politico's website is JS-rendered and blocks the local Ladder proxy, but its
 * defense RSS feed exposes full article links, summaries and images. We ingest
 * directly from the feed so no scraping proxy is required.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "world",
    url: "https://rss.politico.com/defense.xml",
  },
];

aggregateFromRssFeeds("politico", "world", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
