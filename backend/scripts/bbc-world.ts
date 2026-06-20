/**
 * BBC world news via Ladder.
 *
 * Scrapes the BBC world section and extracts articles through the local Ladder
 * proxy.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "world",
    url: "https://www.bbc.com/news/world",
    linkPattern: /^https?:\/\/(?:www\.)?bbc\.com\/news\/articles\/[a-z0-9]+$/,
  },
];

aggregateFromLadderPages("bbc", "world", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
