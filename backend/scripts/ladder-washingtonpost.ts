/**
 * The Washington Post paywalled articles via Ladder.
 *
 * Scrapes WaPo section pages, routes each article through the local Ladder
 * proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://www.washingtonpost.com/technology/",
    linkPattern: /^https?:\/\/(?:www\.)?washingtonpost\.com\/[^/]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "business",
    url: "https://www.washingtonpost.com/business/",
    linkPattern: /^https?:\/\/(?:www\.)?washingtonpost\.com\/[^/]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "world",
    url: "https://www.washingtonpost.com/world/",
    linkPattern: /^https?:\/\/(?:www\.)?washingtonpost\.com\/[^/]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
];

aggregateFromLadderPages("washingtonpost", "mixed", PAGES, 2).catch((err) => {
  console.error(err);
  process.exit(1);
});
