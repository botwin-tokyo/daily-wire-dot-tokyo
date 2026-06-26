/**
 * Mother Jones politics and investigative news via the WordPress REST API.
 *
 * Mother Jones runs on WordPress and exposes full posts through the REST API,
 * avoiding the need for Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://www.motherjones.com",
    maxItems: 8,
    linkPattern: /\/politics\//,
  },
];

aggregateFromWordPress("motherjones", "politics", FEEDS, 8).catch((err) => {
  console.error(err);
  process.exit(1);
});
