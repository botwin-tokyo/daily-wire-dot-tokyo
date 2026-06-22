/**
 * IGN gaming/entertainment news via RSS feed.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "culture",
    url: "http://feeds.ign.com/ign/all",
    maxItems: 12,
    linkPattern: /https:\/\/www\.ign\.com\/articles\//,
  },
];

aggregateFromRssFeeds("ign", "culture", FEEDS, 12).catch((err) => {
  console.error(err);
  process.exit(1);
});
