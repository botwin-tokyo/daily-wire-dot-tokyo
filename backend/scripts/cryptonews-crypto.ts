/**
 * Crypto.news via the WordPress REST API.
 *
 * Crypto.news runs on WordPress and exposes full posts through the REST API,
 * avoiding the need for Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://crypto.news",
    maxItems: 8,
  },
];

aggregateFromWordPress("cryptonews", "crypto", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
