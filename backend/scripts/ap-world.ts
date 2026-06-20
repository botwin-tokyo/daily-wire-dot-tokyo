/**
 * AP world news via Ladder.
 *
 * Scrapes the AP World News section and extracts articles through the local
 * Ladder proxy. The link selector intentionally avoids an absolute href prefix
 * because Ladder rewrites URLs as /https://... before unwrapping them.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "world",
    url: "https://apnews.com/world-news",
    linkSelector: ".PagePromo-title a[href]",
    linkPattern: /^https?:\/\/apnews\.com\/article\/[a-z0-9-]+$/,
    titleSelector: "h1",
  },
];

aggregateFromLadderPages("ap", "world", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
