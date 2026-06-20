/**
 * CoinTelegraph crypto news via Ladder.
 *
 * Scrapes CoinTelegraph's homepage and news section, routes each article through
 * the local Ladder proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?cointelegraph\.com\/news\/[a-z0-9-]+/;

const PAGES = [
  {
    category: "crypto",
    url: "https://cointelegraph.com/",
    linkPattern: ARTICLE_PATTERN,
    maxArticles: 10,
  },
  {
    category: "crypto",
    url: "https://cointelegraph.com/news",
    linkPattern: ARTICLE_PATTERN,
    maxArticles: 10,
  },
];

aggregateFromLadderPages("cointelegraph", "crypto", PAGES, 10).catch((err) => {
  console.error(err);
  process.exit(1);
});
