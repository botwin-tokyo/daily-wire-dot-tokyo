/**
 * Reuters business news via Firecrawl.
 *
 * Scrapes the Reuters Business section and extracts articles through Firecrawl.
 * Firecrawl is used because Reuters serves a captcha/bot challenge that the
 * local Ladder proxy cannot solve on its own.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "business",
    url: "https://www.reuters.com/business/",
    linkPattern:
      /^https?:\/\/(?:www\.)?reuters\.com\/business\/(?:[a-z0-9-]+\/)?[a-z0-9-]+-\d{4}-\d{2}-\d{2}\//,
    useFirecrawl: true,
  },
];

aggregateFromLadderPages("reuters", "business", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
