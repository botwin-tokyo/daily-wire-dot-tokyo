/**
 * Ars Technica articles via Ladder.
 *
 * Scrapes Ars Technica section pages, routes each article through the local
 * Ladder proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://arstechnica.com/",
    linkPattern: /^https?:\/\/arstechnica\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\//,
  },
  {
    category: "science",
    url: "https://arstechnica.com/science/",
    linkPattern: /^https?:\/\/arstechnica\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\//,
  },
  {
    category: "space",
    url: "https://arstechnica.com/space/",
    linkPattern: /^https?:\/\/arstechnica\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\//,
  },
];

aggregateFromLadderPages("arstechnica", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
