/**
 * BBC technology news via Ladder.
 *
 * Scrapes the BBC technology section and extracts articles through the local
 * Ladder proxy.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://www.bbc.com/news/technology",
    linkPattern: /^https?:\/\/(?:www\.)?bbc\.com\/news\/articles\/[a-z0-9]+$/,
  },
];

aggregateFromLadderPages("bbc", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
