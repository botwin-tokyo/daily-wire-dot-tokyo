/**
 * GameSpot gaming news via RSS feed.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    category: "culture",
    url: "https://www.gamespot.com/feeds/news/",
    maxItems: 12,
    linkPattern: /https:\/\/www\.gamespot\.com\/articles\//,
  },
];

aggregateFromRssFeeds("gamespot", "culture", FEEDS, 12).catch((err) => {
  console.error(err);
  process.exit(1);
});
