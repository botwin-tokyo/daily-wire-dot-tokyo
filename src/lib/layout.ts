/**
 * Front-page layout derivation.
 *
 * Converts the canonical NewspaperEdition into the three-column broadsheet
 * layout used by the home page and historical edition pages:
 *   - lead:    center column hero
 *   - left:    left column sidebar stories
 *   - right:   right column image-feature stories
 *
 * Display positions:
 *   - lead          → center
 *   - sidebar       → left
 *   - brief         → left
 *   - imageFeature  → right
 *   - major         → right
 *   - standard      → not shown on the front page (appears in section pages)
 */

import type { NewspaperEdition, NewspaperArticle } from "./types";

export type FrontPageLayout = {
  lead: NewspaperArticle;
  left: NewspaperArticle[];
  right: NewspaperArticle[];
};

function byProminenceDesc(a: NewspaperArticle, b: NewspaperArticle): number {
  return b.editorialProminence - a.editorialProminence;
}

export function deriveFrontPageLayout(edition: NewspaperEdition): FrontPageLayout {
  const lead =
    edition.articles.find((a) => a.id === edition.leadStoryId) ??
    edition.articles.find((a) => a.displayPosition === "lead") ??
    edition.articles[0];

  const left = edition.articles
    .filter((a) => a.displayPosition === "sidebar" || a.displayPosition === "brief")
    .filter((a) => a.id !== lead.id)
    .sort(byProminenceDesc);

  const right = edition.articles
    .filter((a) => a.displayPosition === "imageFeature" || a.displayPosition === "major")
    .filter((a) => a.id !== lead.id)
    .sort(byProminenceDesc);

  return { lead, left, right };
}
