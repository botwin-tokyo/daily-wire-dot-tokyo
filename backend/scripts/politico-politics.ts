/**
 * Politico politics news via RSS.
 *
 * Fetches Politico's politics RSS feed. Full article content is extracted from
 * the <content:encoded> block when available.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

aggregateFromRssFeeds(
  "politico",
  "politics",
  [
    {
      category: "politics",
      url: "https://rss.politico.com/politics-news.xml",
      maxItems: 10,
    },
    {
      category: "politics",
      url: "https://rss.politico.com/congress-news.xml",
      maxItems: 8,
    },
    {
      category: "politics",
      url: "https://rss.politico.com/white-house-news.xml",
      maxItems: 8,
    },
  ],
  8,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
