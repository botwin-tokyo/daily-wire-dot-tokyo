/**
 * The War Zone military/technology news via Ladder.
 *
 * Scrapes the homepage and extracts full articles through the local Ladder
 * proxy. Article pages often have a generic or missing <title> tag, so the
 * real headline is pulled from the h1 element and falls back to the URL slug
 * when Readability cannot find a real headline.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://www.twz.com/",
    linkPattern:
      /^https?:\/\/(?:www\.)?twz\.com\/(?:air|land|sea|news-features|news|war-zone)\/[a-z0-9-]+$/,
    titleSelector: "h1",
  },
];

aggregateFromLadderPages("twz", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
