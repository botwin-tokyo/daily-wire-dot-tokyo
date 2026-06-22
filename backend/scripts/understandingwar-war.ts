/**
 * Institute for the Study of War (ISW) war news via the WordPress REST API.
 *
 * ISW publishes daily campaign assessments on Russia-Ukraine, Iran, and other
 * conflict zones. The WordPress REST API exposes the full post content without
 * needing Ladder or Firecrawl.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://understandingwar.org",
    maxItems: 5,
    linkPattern: /\/research\//,
  },
];

aggregateFromWordPress("understandingwar", "war", FEEDS, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
