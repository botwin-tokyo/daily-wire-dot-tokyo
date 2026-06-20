/**
 * The Verge articles via Ladder.
 *
 * Scrapes Verge section pages, routes each article through the local Ladder
 * proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "tech",
    url: "https://www.theverge.com/tech",
    linkPattern: /^https?:\/\/(?:www\.)?theverge\.com\/(?:[a-z0-9-]+\/)?\d+\//,
  },
  {
    category: "gadgets",
    url: "https://www.theverge.com/gadgets",
    linkPattern: /^https?:\/\/(?:www\.)?theverge\.com\/(?:[a-z0-9-]+\/)?\d+\//,
  },
  {
    category: "ai",
    url: "https://www.theverge.com/ai-artificial-intelligence",
    linkPattern: /^https?:\/\/(?:www\.)?theverge\.com\/(?:[a-z0-9-]+\/)?\d+\//,
  },
];

aggregateFromLadderPages("theverge", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
