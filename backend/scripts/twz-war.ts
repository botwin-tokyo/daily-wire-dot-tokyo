/**
 * The War Zone (TWZ) war and defense news via WordPress REST API.
 */

import { aggregateFromWordPress } from "./lib/wordpress-source";

const FEEDS = [{ baseUrl: "https://www.twz.com", maxItems: 6 }];

aggregateFromWordPress("twz", "war", FEEDS, 6).catch((err) => {
  console.error(err);
  process.exit(1);
});
