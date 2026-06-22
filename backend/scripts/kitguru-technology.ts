/**
 * KitGuru technology and hardware news via the WordPress REST API.
 *
 * KitGuru runs on WordPress and exposes full posts through the REST API,
 * avoiding the need for Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://www.kitguru.net",
    maxItems: 8,
  },
];

aggregateFromWordPress("kitguru", "technology", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
