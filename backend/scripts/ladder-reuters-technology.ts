/**
 * Reuters technology news via Firecrawl.
 *
 * Scrapes the Reuters Technology section and extracts articles through Firecrawl.
 * Firecrawl is used because Reuters serves a captcha/bot challenge that the
 * local Ladder proxy cannot solve on its own.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://www.reuters.com/technology/",
    linkPattern:
      /^https?:\/\/(?:www\.)?reuters\.com\/technology\/(?:[a-z0-9-]+\/)?[a-z0-9-]+-\d{4}-\d{2}-\d{2}\//,
    useFirecrawl: true,
  },
];

aggregateFromLadderPages("reuters", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
