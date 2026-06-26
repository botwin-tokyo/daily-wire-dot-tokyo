/**
 * Tom's Hardware technology news via RSS + Ladder.
 *
 * Tom's Hardware publishes an RSS feed but only includes summaries. Full
 * article text is extracted through the local Ladder proxy.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "technology",
    url: "https://www.tomshardware.com/rss.xml",
    linkPattern: /^https?:\/\/www\.tomshardware\.com\/[^/]+\/[a-z0-9-]+$/,
    fetchFullContent: true,
    maxItems: 8,
  },
];

aggregateFromRssFeeds("tomshardware", "technology", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
