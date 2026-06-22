/**
 * Stars and Stripes war/military news via Ladder.
 *
 * Scrapes several theater section pages and extracts full articles through the
 * local Ladder proxy. The <title> tag on article pages is often an audio-player
 * label, so the real headline is pulled from the h1 element.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const ARTICLE_PATTERN =
  /^https?:\/\/(?:www\.)?stripes\.com\/(?:theaters|branches)\/[a-z_]+\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+-\d+\.html$/;

const PAGES = [
  {
    category: "war",
    url: "https://www.stripes.com/theaters/middle_east/",
    linkPattern: ARTICLE_PATTERN,
    titleSelector: "h1",
  },
  {
    category: "war",
    url: "https://www.stripes.com/theaters/europe/",
    linkPattern: ARTICLE_PATTERN,
    titleSelector: "h1",
  },
  {
    category: "war",
    url: "https://www.stripes.com/theaters/asia_pacific/",
    linkPattern: ARTICLE_PATTERN,
    titleSelector: "h1",
  },
  {
    category: "war",
    url: "https://www.stripes.com/theaters/africa/",
    linkPattern: ARTICLE_PATTERN,
    titleSelector: "h1",
  },
  {
    category: "war",
    url: "https://www.stripes.com/theaters/americas/",
    linkPattern: ARTICLE_PATTERN,
    titleSelector: "h1",
  },
];

aggregateFromLadderPages("stripes", "war", PAGES, 3).catch((err) => {
  console.error(err);
  process.exit(1);
});
