/**
 * CoinDesk crypto news via Ladder.
 *
 * Scrapes CoinDesk homepage and markets section, routes each article through
 * the local Ladder proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?coindesk\.com\/(?:markets|business|tech|policy|consensus-magazine)\/[a-z0-9-]+/;

const PAGES = [
  {
    category: "crypto",
    url: "https://www.coindesk.com/",
    linkPattern: ARTICLE_PATTERN,
    maxArticles: 8,
  },
  {
    category: "crypto",
    url: "https://www.coindesk.com/markets/",
    linkPattern: ARTICLE_PATTERN,
    maxArticles: 8,
  },
];

aggregateFromLadderPages("coindesk", "crypto", PAGES, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
