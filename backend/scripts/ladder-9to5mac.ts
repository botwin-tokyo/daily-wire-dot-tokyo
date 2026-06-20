/**
 * 9to5Mac articles via Ladder.
 *
 * Scrapes 9to5Mac section pages, routes each article through the local Ladder
 * proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "front-page",
    url: "https://9to5mac.com/",
    linkPattern: /^https?:\/\/9to5mac\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "apple",
    url: "https://9to5mac.com/guides/apple/",
    linkPattern: /^https?:\/\/9to5mac\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "ios",
    url: "https://9to5mac.com/guides/ios/",
    linkPattern: /^https?:\/\/9to5mac\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
];

aggregateFromLadderPages("9to5mac", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
