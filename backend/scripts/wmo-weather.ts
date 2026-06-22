/**
 * WMO weather/climate news via direct HTML scrape.
 *
 * Scrapes the WMO press releases page and extracts full articles with
 * Readability.
 */

import { aggregateFromHtmlPages } from "./lib/direct-html-source";

const PAGES = [
  {
    category: "weather",
    url: "https://wmo.int/news/media-centre/press-releases",
    linkSelector: ".view-content .views-row a",
    linkPattern: /^https?:\/\/wmo\.int\/news\/media-centre\/.+$/,
    maxItems: 10,
  },
];

aggregateFromHtmlPages("wmo", "weather", PAGES, 10).catch((err) => {
  console.error(err);
  process.exit(1);
});
