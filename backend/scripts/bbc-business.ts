/**
 * BBC business news via Ladder.
 *
 * Scrapes the BBC business section and extracts articles through the local
 * Ladder proxy.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "business",
    url: "https://www.bbc.com/news/business",
    linkPattern: /^https?:\/\/(?:www\.)?bbc\.com\/news\/articles\/[a-z0-9]+$/,
  },
];

aggregateFromLadderPages("bbc", "business", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
