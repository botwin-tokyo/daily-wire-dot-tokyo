/**
 * Florida Politics state and federal political news via the WordPress REST API.
 *
 * Florida Politics runs on WordPress and exposes full posts through the REST
 * API, avoiding the need for Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://floridapolitics.com",
    maxItems: 8,
  },
];

aggregateFromWordPress("floridapolitics", "politics", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
