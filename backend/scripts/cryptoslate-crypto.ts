/**
 * CryptoSlate via the WordPress REST API.
 *
 * CryptoSlate runs on WordPress and exposes full posts through the REST API,
 * avoiding the need for Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://cryptoslate.com",
    maxItems: 8,
  },
];

aggregateFromWordPress("cryptoslate", "crypto", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
