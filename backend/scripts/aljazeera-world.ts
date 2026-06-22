/**
 * ALJAZEERA world news via Ladder.
 *
 * Scrapes the Al Jazeera news section and extracts articles through the local
 * Ladder proxy.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "world",
    url: "https://www.aljazeera.com/news/",
    linkPattern: /^https?:\/\/www\.aljazeera\.com\/news\/\d{4}\/\d{1,2}\/\d{1,2}\//,
  },
];

aggregateFromLadderPages("aljazeera", "world", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
