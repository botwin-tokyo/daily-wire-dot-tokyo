/**
 * Gamespot gaming news via RSS.
 *
 * Fetches Gamespot's news RSS feed. Full article content is extracted from the
 * <description> block, which contains the full article HTML.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

aggregateFromRssFeeds(
  "gamespot",
  "culture",
  [
    {
      category: "culture",
      url: "https://www.gamespot.com/feeds/news/",
      maxItems: 12,
    },
  ],
  12,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
