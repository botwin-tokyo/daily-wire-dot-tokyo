/**
 * MacRumors articles via Ladder.
 *
 * Scrapes MacRumors section pages, routes each article through the local Ladder
 * proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "front-page",
    url: "https://www.macrumors.com/",
    linkPattern: /^https?:\/\/(?:www\.)?macrumors\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "iphone",
    url: "https://www.macrumors.com/iphone/",
    linkPattern: /^https?:\/\/(?:www\.)?macrumors\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "mac",
    url: "https://www.macrumors.com/mac/",
    linkPattern: /^https?:\/\/(?:www\.)?macrumors\.com\/\d{4}\/\d{2}\/\d{2}\//,
  },
];

aggregateFromLadderPages("macrumors", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
