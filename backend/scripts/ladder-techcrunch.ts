/**
 * TechCrunch articles via Ladder.
 *
 * Scrapes TechCrunch category pages, routes each article through the local
 * Ladder proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "latest",
    url: "https://techcrunch.com/latest/",
    linkPattern: /^https?:\/\/techcrunch\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "artificial-intelligence",
    url: "https://techcrunch.com/category/artificial-intelligence/",
    linkPattern: /^https?:\/\/techcrunch\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "startups",
    url: "https://techcrunch.com/category/startups/",
    linkPattern: /^https?:\/\/techcrunch\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "security",
    url: "https://techcrunch.com/category/security/",
    linkPattern: /^https?:\/\/techcrunch\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
];

aggregateFromLadderPages("techcrunch", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
