/**
 * Wccftech hardware news via the WordPress REST API.
 *
 * Wccftech exposes full posts through the REST API. This script filters to the
 * Hardware topic (taxonomy ID 59398) to match the requested section.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://wccftech.com",
    maxItems: 8,
    taxonomies: {
      topics: [59398],
    },
  },
];

aggregateFromWordPress("wccftech", "technology", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
