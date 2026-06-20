#!/usr/bin/env node
/**
 * Generate a test edition JSON directly from the aggregated articles in the
 * local SQLite database.
 *
 * Usage:
 *   npx tsx scripts/generate-edition-from-db.ts
 *
 * Writes:
 *   public/data/current-edition.json
 *   public/data/editions/{YYYY-MM-DD}.json
 *   public/data/editions/index.json
 *
 * This is a layout-testing tool. The AI publishing agent will later replace
 * this with a rewritten, curated edition.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openDb, initSchema, getLatestArticles, getRunStats } from "../backend/scripts/lib/db";
import { validateNewspaperEdition } from "../src/lib/schema";
import type { NewspaperEdition, Article, Section, NavItem } from "../src/lib/schema";

const CATEGORIES = ["world", "technology", "business", "science", "culture", "crypto", "politics"];

const CATEGORY_COPY: Record<
  string,
  { label: string; eyebrow: string; dek: string; order: number }
> = {
  world: { label: "World", eyebrow: "The World Desk", dek: "Geopolitics, diplomacy, and the stories shaping nations.", order: 1 },
  technology: { label: "Technology", eyebrow: "The Technology Desk", dek: "Models, chips, platforms, and the policy lines being drawn around them.", order: 2 },
  business: { label: "Business", eyebrow: "Markets & Business", dek: "Macro signals, central banks, earnings, and the deals moving capital today.", order: 3 },
  science: { label: "Science", eyebrow: "Science & Research", dek: "Breakthroughs from labs, observatories, and clinical trials worth your attention.", order: 4 },
  culture: { label: "Culture", eyebrow: "Culture & Ideas", dek: "Art, books, film, gaming, and the conversations defining the week.", order: 5 },
  crypto: { label: "Crypto", eyebrow: "The Crypto Desk", dek: "Bitcoin, Ethereum, regulation, and the forces moving digital assets.", order: 6 },
  politics: { label: "Politics", eyebrow: "The Politics Desk", dek: "Congress, the White House, elections, and the policies shaping the country.", order: 7 },
};

function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  // Ensure it does not start or end with a digit-only segment and is not empty.
  return base.replace(/^[0-9-]+|-[0-9]+$/g, "").replace(/^-+|-+$/g, "") || "article";
}

function idFromUrl(url: string, index: number): string {
  return `a-${index}-${Buffer.from(url).toString("base64url").slice(-12)}`;
}

function estimateReadingTime(text: string | undefined | null): number {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function deriveDeck(content: string | undefined | null): string | undefined {
  if (!content) return undefined;
  const firstSentence = content.split(/\.[\s$]/)[0]?.trim();
  if (!firstSentence || firstSentence.length < 20) return undefined;
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}...` : `${firstSentence}.`;
}


function toIsoUtc(value: string | undefined | null): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function sourceUrl(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("guardian")) return "https://www.theguardian.com";
  if (lower.includes("reuters")) return "https://www.reuters.com";
  if (lower.includes("bbc")) return "https://www.bbc.com";
  if (lower.includes("ap") || lower.includes("associated press")) return "https://apnews.com";
  if (lower.includes("politico")) return "https://www.politico.com";
  if (lower.includes("coindesk")) return "https://www.coindesk.com";
  if (lower.includes("cointelegraph")) return "https://cointelegraph.com";
  if (lower.includes("gamespot")) return "https://www.gamespot.com";
  if (lower.includes("polygon")) return "https://www.polygon.com";
  if (lower.includes("france24")) return "https://www.france24.com";
  if (lower.includes("aljazeera")) return "https://www.aljazeera.com";
  if (lower.includes("hackernews")) return "https://news.ycombinator.com";
  if (lower.includes("9to5mac")) return "https://9to5mac.com";
  if (lower.includes("macrumors")) return "https://www.macrumors.com";
  if (lower.includes("techcrunch")) return "https://techcrunch.com";
  if (lower.includes("arstechnica")) return "https://arstechnica.com";
  if (lower.includes("theregister")) return "https://www.theregister.com";
  if (lower.includes("theverge")) return "https://www.theverge.com";
  if (lower.includes("washingtonpost")) return "https://www.washingtonpost.com";
  if (lower.includes("stripes")) return "https://www.stripes.com";
  if (lower.includes("warontherocks")) return "https://warontherocks.com";
  if (lower.includes("twz")) return "https://www.twz.com";
  if (lower.includes("space")) return "https://spacenews.com";
  return "https://example.com";
}

function buildArticle(row: ReturnType<typeof getLatestArticles>[number], index: number): Article {
  const slug = slugify(row.title);
  const id = idFromUrl(row.url, index);
  const content = row.content ?? row.summary ?? "";
  const summary = (row.summary ?? content.slice(0, 500)).slice(0, 1997).trim();

  return {
    id,
    slug,
    displayPosition: "standard",
    headline: row.title,
    deck: deriveDeck(content),
    summary: summary.length > 0 ? summary : "No summary available.",
    category: row.category,
    tags: [],
    author: row.author ?? undefined,
    source: {
      name: row.source,
      url: sourceUrl(row.source),
      reliability: "high",
    },
    originalUrl: row.url,
    publishedAt: toIsoUtc(row.publishedAt ?? row.fetchedAt),
    retrievedAt: toIsoUtc(row.fetchedAt),
    readingTimeMin: estimateReadingTime(content),
    image:
      row.imageUrl && isValidImageUrl(row.imageUrl)
        ? {
            url: row.imageUrl,
            alt: row.title,
            caption: row.title,
          }
        : undefined,
    keyPoints: [],
    whyItMatters: undefined,
    relatedArticleIds: [],
    relevanceScore: 0.8,
    confidenceScore: 0.85,
    editorialProminence: 0.5,
    aiDisclosure: {
      summaryIsAiGenerated: false,
      model: undefined,
    },
  };
}

function assignDisplayPositions(articles: Article[]): void {
  if (articles.length === 0) return;
  articles[0]!.displayPosition = "lead";
  articles[0]!.editorialProminence = 1;
  let majorCount = 0;
  for (let i = 1; i < articles.length && majorCount < 2; i++) {
    if (articles[i]!.image) {
      articles[i]!.displayPosition = "major";
      articles[i]!.editorialProminence = 0.7;
      majorCount++;
    }
  }
}

function main(): void {
  const db = openDb();
  initSchema(db);

  const now = new Date();
  const editionDate = now.toISOString().slice(0, 10);
  const isoNow = now.toISOString();

  const stats = getRunStats(db);
  console.error(`Generating edition from ${stats.articleCount} aggregated articles...`);

  const allRows = getLatestArticles(db, 1000);
  if (allRows.length === 0) {
    throw new Error("No articles found in database. Run npm run ingest:articles first.");
  }

  const articles: Article[] = allRows.map((row, index) => buildArticle(row, index));

  // Pick a lead story: prefer world, then technology, then first article.
  const leadIndex =
    articles.findIndex((a) => a.category === "world") !== -1
      ? articles.findIndex((a) => a.category === "world")
      : articles.findIndex((a) => a.category === "technology") !== -1
        ? articles.findIndex((a) => a.category === "technology")
        : 0;

  // Move lead to front.
  const [lead] = articles.splice(leadIndex, 1);
  articles.unshift(lead);
  assignDisplayPositions(articles);

  // Build sections per category, preserving category order.
  const sections: Section[] = CATEGORIES.filter((cat) =>
    articles.some((a) => a.category === cat),
  ).map((cat) => {
    const copy = CATEGORY_COPY[cat];
    const articleIds = articles.filter((a) => a.category === cat).map((a) => a.id);
    return {
      id: cat,
      label: copy.label,
      eyebrow: copy.eyebrow,
      dek: copy.dek,
      order: copy.order,
      visible: true,
      articleIds,
    };
  });

  const navItems: NavItem[] = [
    { id: "top", label: "Top Stories", path: "/" },
    ...sections.map((s) => ({
      id: s.id,
      label: s.label,
      path: `/${s.id}`,
      category: s.id,
    })),
  ];

  const sourcesMap = new Map<string, number>();
  for (const article of articles) {
    sourcesMap.set(article.source.name, (sourcesMap.get(article.source.name) ?? 0) + 1);
  }
  const sources = [...sourcesMap.entries()].map(([name, count]) => ({
    name,
    url: sourceUrl(name),
    articles: count,
  }));

  const edition: NewspaperEdition = {
    schemaVersion: "1.0.0",
    editionId: `ed-${editionDate}-test`,
    editionDate,
    editionNumber: 1,
    editionTitle: "Test Edition",
    status: "published",
    generatedAt: isoNow,
    publishedAt: isoNow,
    updatedAt: isoNow,
    timezone: "UTC",
    locale: "en-US",
    masthead: {
      title: "The Morning Wire",
      tagline: "Your Personal Daily Intelligence",
    },
    utilityBar: {
      dateLabel: now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      weather: {
        tempC: 20,
        condition: "Partly Cloudy",
        icon: "partly",
      },
      editionLabel: "Global",
      updatedByAiAt: isoNow.slice(11, 16),
      nextEditionText: "Next edition scheduled",
    },
    navigation: {
      items: navItems,
      moreLinks: [
        { id: "saved", label: "Saved", path: "/saved" },
        { id: "archive", label: "Archive", path: "/editions" },
      ],
    },
    leadStoryId: lead.id,
    articles,
    sections,
    morningBriefing: [],
    editorsNote: {
      text: "This test edition is populated directly from aggregated source articles to verify layout and navigation before AI rewriting.",
      whyItMatters: "Layout validation ensures every section and article card renders correctly across devices.",
      model: "aggregate-test",
      generatedAt: isoNow,
      sourcesConsidered: sources.length,
    },
    marketSnapshot: {
      updatedAt: isoNow,
      sourceName: "Test Data",
      tickers: [],
      commodities: [],
    },
    weather: {
      sourceName: "Test Data",
      local: {
        city: "New York",
        tempC: 22,
        condition: "Partly Cloudy",
        icon: "partly",
      },
      cities: [
        { city: "New York", tempC: 22, condition: "Partly Cloudy", icon: "partly" },
        { city: "London", tempC: 16, condition: "Mostly Cloudy", icon: "cloud" },
        { city: "Tokyo", tempC: 24, condition: "Sunny", icon: "sun" },
      ],
    },
    sources,
    generationMetadata: {
      model: "aggregate-test",
      sourcesCount: sources.length,
      storiesAnalyzed: articles.length,
      readingTimeMin: articles.reduce((sum, a) => sum + a.readingTimeMin, 0),
      collectionStartedAt: isoNow,
      collectionFinishedAt: isoNow,
    },
    footer: {
      copyright: `© ${now.getFullYear()} The Morning Wire. All rights reserved.`,
      links: [
        { label: "Privacy Policy", path: "/settings" },
        { label: "Terms of Service", path: "/settings" },
        { label: "Contact", path: "/settings" },
      ],
    },
  };

  const validated = validateNewspaperEdition(edition);
  if (!validated.success) {
    console.error("Edition validation failed:");
    for (const error of validated.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const outDir = resolve("public/data");
  const editionsDir = resolve(outDir, "editions");
  mkdirSync(editionsDir, { recursive: true });

  const currentPath = resolve(outDir, "current-edition.json");
  const archivePath = resolve(editionsDir, `${editionDate}.json`);
  const indexPath = resolve(editionsDir, "index.json");

  const json = JSON.stringify(validated.data, null, 2);
  writeFileSync(currentPath, json);
  writeFileSync(archivePath, json);

  const index = [
    {
      id: validated.data.editionId,
      editionDate: validated.data.editionDate,
      status: validated.data.status,
      storyCount: validated.data.articles.length,
      leadHeadline: validated.data.articles[0]?.headline ?? "",
      categories: sections.map((s) => s.id),
    },
  ];
  writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`Wrote ${validated.data.articles.length} articles to ${currentPath}`);
  console.log(`Wrote archive to ${archivePath}`);
  console.log(`Wrote index to ${indexPath}`);
}

main();
