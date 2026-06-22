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
  leftCompact: NewspaperArticle[];
  leftFull: NewspaperArticle[];
  centerFull: NewspaperArticle[];
  rightFull: NewspaperArticle[];
};

function byProminenceDesc(a: NewspaperArticle, b: NewspaperArticle): number {
  return b.editorialProminence - a.editorialProminence;
}

function byRecencyDesc(a: NewspaperArticle, b: NewspaperArticle): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function byProminenceThenRecency(a: NewspaperArticle, b: NewspaperArticle): number {
  const prom = byProminenceDesc(a, b);
  if (prom !== 0) return prom;
  return byRecencyDesc(a, b);
}

export function deriveFrontPageLayout(edition: NewspaperEdition): FrontPageLayout {
  const lead =
    edition.articles.find((a) => a.id === edition.leadStoryId) ??
    edition.articles.find((a) => a.displayPosition === "lead") ??
    edition.articles[0];

  const candidates = edition.articles.filter((a) => a.id !== lead.id).sort(byProminenceThenRecency);

  // The front page is a three-column broadsheet. The lead sits at the top of
  // the center column, and the next best stories are spread evenly across all
  // three columns so no column is empty while another is stacked.
  const compactCount = 4;
  const fullPerColumn = 3;
  const totalFull = fullPerColumn * 3;

  const leftCompact = candidates.slice(0, compactCount);
  const usedCompactIds = new Set(leftCompact.map((a) => a.id));
  const remaining = candidates.filter((a) => !usedCompactIds.has(a.id));

  const leftFull = remaining.slice(0, fullPerColumn);
  const centerFull = remaining.slice(fullPerColumn, fullPerColumn * 2);
  const rightFull = remaining.slice(fullPerColumn * 2, totalFull);

  return { lead, leftCompact, leftFull, centerFull, rightFull };
}
