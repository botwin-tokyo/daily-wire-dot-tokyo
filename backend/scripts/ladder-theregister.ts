/**
 * The Register articles via Ladder.
 *
 * Scrapes The Register section pages, routes each article through the local
 * Ladder proxy, and parses the full text with Readability.
 */

import { aggregateFromLadderPages } from "./lib/ladder-source";

const PAGES = [
  {
    category: "technology",
    url: "https://www.theregister.com/",
    linkPattern: /^https?:\/\/www\.theregister\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "security",
    url: "https://www.theregister.com/security/",
    linkPattern: /^https?:\/\/www\.theregister\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
  {
    category: "cloud",
    url: "https://www.theregister.com/cloud/",
    linkPattern: /^https?:\/\/www\.theregister\.com\/[a-z0-9-]+\/\d{4}\/\d{2}\/\d{2}\//,
  },
];

aggregateFromLadderPages("theregister", "technology", PAGES, 5).catch((err) => {
  console.error(err);
  process.exit(1);
});
