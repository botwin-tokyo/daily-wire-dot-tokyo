/**
 * NOAA weather/climate news via direct HTML scrape.
 *
 * Scrapes the NOAA media releases page and extracts full articles with
 * Readability. A realistic user agent is required to avoid 403 responses.
 */

import { aggregateFromHtmlPages } from "./lib/direct-html-source";

const PAGES = [
  {
    category: "weather",
    url: "https://www.noaa.gov/media-releases",
    linkSelector: ".c-field__content .c-field__item a",
    linkPattern: /^https?:\/\/www\.noaa\.gov\/news-release\/.+$/,
    maxItems: 10,
  },
];

aggregateFromHtmlPages("noaa", "weather", PAGES, 10).catch((err) => {
  console.error(err);
  process.exit(1);
});
