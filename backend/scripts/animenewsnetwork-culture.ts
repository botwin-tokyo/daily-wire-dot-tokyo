#!/usr/bin/env node
/**
 * Anime News Network culture news via RSS/Atom feed.
 *
 * ANN's public RSS/Atom feeds are reliable, but the feed summaries are short.
 * Full article content is fetched via Ladder using the .text-zone.easyread-width
 * selector. If Ladder cannot fetch a page, the feed summary is used instead.
 */

import { aggregateFromRssFeeds } from "./lib/rss-source";

const FEEDS = [
  {
    url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us",
    maxItems: 8,
    fetchFullContent: true,
    contentSelector: ".text-zone.easyread-width",
  },
];

aggregateFromRssFeeds("animenewsnetwork", "culture", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
