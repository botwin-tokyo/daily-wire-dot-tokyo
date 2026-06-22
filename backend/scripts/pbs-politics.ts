/**
 * PBS NewsHour politics news via RSS + Ladder.
 *
 * PBS publishes a single headlines RSS feed. Politics stories are filtered by
 * URL and full article text is extracted through the local Ladder proxy.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "politics",
    url: "https://www.pbs.org/newshour/feeds/rss/headlines",
    linkPattern: /^https?:\/\/www\.pbs\.org\/newshour\/politics\//,
    fetchFullContent: true,
    maxItems: 8,
  },
];

aggregateFromRssFeeds("pbs", "politics", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
