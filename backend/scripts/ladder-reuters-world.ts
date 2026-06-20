/**
 * Reuters world news via Firecrawl.
 *
 * Scrapes the Reuters World section and extracts articles through Firecrawl.
 * Firecrawl is used because Reuters serves a captcha/bot challenge that the
 * local Ladder proxy cannot solve on its own.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "world",
    url: "https://www.reuters.com/world/",
    linkPattern:
      /^https?:\/\/(?:www\.)?reuters\.com\/world\/(?:[a-z0-9-]+\/)?[a-z0-9-]+-\d{4}-\d{2}-\d{2}\//,
    useFirecrawl: true,
  },
];

aggregateFromLadderPages("reuters", "world", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
