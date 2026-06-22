// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  getLatestEdition,
  getLatestNewspaperEdition,
  getEditionByDate,
  listEditions,
  getArticle,
  searchArticles,
} from "./api";

describe("edition loading (server-side)", () => {
  it("loads the current edition from public/data/current-edition.json", async () => {
    const edition = await getLatestNewspaperEdition();
    expect(edition.schemaVersion).toBe("1.0.0");
    expect(edition.articles.length).toBeGreaterThan(0);
  });

  it("adapts the current edition to the legacy shape", async () => {
    const edition = await getLatestEdition();
    expect(edition.articles.length).toBeGreaterThan(0);
    expect(edition.leadArticleId).toBeTruthy();
  });

  it("loads a historical edition by date", async () => {
    const edition = await getEditionByDate("2025-05-20");
    expect(edition.editionDate).toBe("2025-05-20");
    expect(edition.articles.length).toBeGreaterThan(0);
  });

  it("lists edition summaries", async () => {
    const summaries = await listEditions();
    expect(Array.isArray(summaries)).toBe(true);
  });
});

describe("article lookup (server-side)", () => {
  it("finds an article by slug", async () => {
    const edition = await getLatestEdition();
    const first = edition.articles[0];
    const article = await getArticle(first.slug);
    expect(article).toBeDefined();
    expect(article?.id).toBe(first.id);
  });

  it("finds an article by id", async () => {
    const edition = await getLatestEdition();
    const first = edition.articles[0];
    const article = await getArticle(first.id);
    expect(article).toBeDefined();
    expect(article?.slug).toBe(first.slug);
  });

  it("returns undefined for a missing article", async () => {
    const article = await getArticle("does-not-exist");
    expect(article).toBeUndefined();
  });
});

describe("search (server-side)", () => {
  it("returns empty results for an empty query", async () => {
    const results = await searchArticles("");
    expect(results).toEqual([]);
  });

  it("finds articles matching the query", async () => {
    const edition = await getLatestEdition();
    const term = edition.articles[0].headline.split(" ")[0].toLowerCase();
    const results = await searchArticles(term);
    expect(results.length).toBeGreaterThan(0);
  });
});
