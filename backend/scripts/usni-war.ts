/**
 * U.S. Naval Institute News (USNI) maritime warfare and naval policy news via
 * the WordPress REST API.
 *
 * USNI News covers U.S. and foreign naval operations, shipbuilding, and
 * strategy. The WordPress REST API provides full articles without needing a
 * proxy.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [
  {
    baseUrl: "https://news.usni.org",
    maxItems: 6,
  },
];

aggregateFromWordPress("usni", "war", FEEDS, 6).catch((err) => {
  console.error(err);
  process.exit(1);
});
