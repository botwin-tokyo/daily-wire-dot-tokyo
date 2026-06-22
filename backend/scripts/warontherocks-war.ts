/**
 * War on the Rocks national-security commentary via Ladder.
 *
 * Scrapes the homepage and extracts full articles through the local Ladder
 * proxy. The site uses a generic <title> tag, so the real headline is pulled
 * from the article h1 element.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "war",
    url: "https://warontherocks.com/",
    linkPattern:
      /^https?:\/\/warontherocks\.com\/(?!membership\/|author\/|category\/)[a-z0-9-]+\/$/,
    titleSelector: "h1",
  },
];

aggregateFromLadderPages("warontherocks", "war", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
