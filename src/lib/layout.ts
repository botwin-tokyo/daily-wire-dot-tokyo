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

  const candidates = edition.articles
    .filter((a) => a.id !== lead.id)
    .sort(byProminenceThenRecency);

  // Respect explicitly assigned positions first, then fill remaining slots
  // with the most prominent recent standard stories.
  const leftAssigned = candidates
    .filter((a) => a.displayPosition === "sidebar" || a.displayPosition === "brief")
    .sort(byProminenceThenRecency);

  const rightAssigned = candidates
    .filter((a) => a.displayPosition === "imageFeature" || a.displayPosition === "major")
    .sort(byProminenceThenRecency);

  const assignedIds = new Set([
    ...leftAssigned.map((a) => a.id),
    ...rightAssigned.map((a) => a.id),
  ]);

  const filler = candidates.filter((a) => !assignedIds.has(a.id));
  const leftFiller = filler.slice(0, Math.max(0, 10 - leftAssigned.length));
  const usedFillerIds = new Set(leftFiller.map((a) => a.id));
  const rightFiller = filler
    .filter((a) => !usedFillerIds.has(a.id))
    .sort(
      (a, b) => Number(!!b.imageUrl) - Number(!!a.imageUrl) || byProminenceThenRecency(a, b),
    )
    .slice(0, Math.max(0, 6 - rightAssigned.length));

  const left = [...leftAssigned, ...leftFiller];
  const right = [...rightAssigned, ...rightFiller];

  return { lead, left, right };
}
