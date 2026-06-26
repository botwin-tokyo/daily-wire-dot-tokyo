/**
 * Polygon gaming and entertainment news via RSS.
 *
 * Fetches Polygon's main RSS feed. Full article content is extracted from the
 * <content:encoded> block when available.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

aggregateFromRssFeeds(
  "polygon",
  "culture",
  [
    {
      category: "culture",
      url: "https://www.polygon.com/rss/index.xml/",
      maxItems: 12,
      fetchFullContent: true,
    },
  ],
  12,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
