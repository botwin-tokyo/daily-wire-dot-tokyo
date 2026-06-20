/**
 * BBC science news via Ladder.
 *
 * Scrapes the BBC science section and extracts articles through the local
 * Ladder proxy.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "science",
    url: "https://www.bbc.com/news/science_and_environment",
    linkPattern: /^https?:\/\/(?:www\.)?bbc\.com\/news\/articles\/[a-z0-9]+$/,
  },
];

aggregateFromLadderPages("bbc", "science", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
