#!/usr/bin/env node
/**
 * Generate a valid NewspaperEdition JSON from the rewritten articles in
 * backend/db/deprop.db.
 *
 * Run from the repository root:
 *   npx tsx agentskills/publish-dailywire/publish-dailywire.ts
 *
 * Writes:
 *   public/data/current-edition.json
 *   public/data/editions/{YYYY-MM-DD}.json
 *   public/data/editions/index.json
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDepropDb, initDepropDb } from "../../backend/scripts/lib/deprop-db";
import { plainText } from "../../backend/scripts/lib/extract";
import { validateNewspaperEdition, validateBusinessRules } from "../../src/lib/schema";
import type { NewspaperEdition, Article, Section, NavItem } from "../../src/lib/schema";

const D1_API_URL = "https://api.cloudflare.com/client/v4/accounts";

interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

function getD1Config(): D1Config | undefined {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID ?? process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) return undefined;
  return { accountId, databaseId, apiToken };
}

async function upsertEditionToD1(edition: NewspaperEdition): Promise<void> {
  const config = getD1Config();
  if (!config) {
    console.log(
      "Skipping D1 upsert: CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN are not all set.",
    );
    return;
  }

  const url = `${D1_API_URL}/${config.accountId}/d1/database/${config.databaseId}/query`;
  const categories = JSON.stringify(edition.sections.map((s) => s.id));

  const sql = `
    INSERT INTO editions
      (edition_date, edition_json, status, story_count, lead_headline, categories, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(edition_date) DO UPDATE SET
      edition_json = excluded.edition_json,
      status = excluded.status,
      story_count = excluded.story_count,
      lead_headline = excluded.lead_headline,
      categories = excluded.categories,
      updated_at = datetime('now')
  `;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql,
      params: [
        edition.editionDate,
        JSON.stringify(edition),
        edition.status,
        edition.articles.length,
        edition.articles[0]?.headline ?? "",
        categories,
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`D1 upsert failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { success?: boolean; errors?: { message: string }[] };
  if (!json.success) {
    const message = json.errors?.map((e) => e.message).join("; ") ?? "unknown D1 error";
    throw new Error(`D1 upsert failed: ${message}`);
  }

  console.log(`Upserted edition ${edition.editionDate} into D1.`);
}

const CATEGORIES = [
  "world",
  "war",
  "technology",
  "business",
  "science",
  "culture",
  "crypto",
  "politics",
  "weather",
];

const CATEGORY_COPY: Record<
  string,
  { label: string; eyebrow: string; dek: string; order: number }
> = {
  world: {
    label: "World",
    eyebrow: "The World Desk",
    dek: "Geopolitics, diplomacy, and the stories shaping nations.",
    order: 1,
  },
  war: {
    label: "War",
    eyebrow: "The War Desk",
    dek: "Conflict, defense, and military affairs shaping battlefields and strategy worldwide.",
    order: 2,
  },
  technology: {
    label: "Technology",
    eyebrow: "The Technology Desk",
    dek: "Models, chips, platforms, and the policy lines being drawn around them.",
    order: 3,
  },
  business: {
    label: "Business",
    eyebrow: "Markets & Business",
    dek: "Macro signals, central banks, earnings, and the deals moving capital today.",
    order: 4,
  },
  science: {
    label: "Science",
    eyebrow: "Science & Research",
    dek: "Breakthroughs from labs, observatories, and clinical trials worth your attention.",
    order: 5,
  },
  culture: {
    label: "Culture",
    eyebrow: "Culture & Ideas",
    dek: "Art, books, film, gaming, and the conversations defining the week.",
    order: 6,
  },
  crypto: {
    label: "Crypto",
    eyebrow: "The Crypto Desk",
    dek: "Bitcoin, Ethereum, regulation, and the forces moving digital assets.",
    order: 7,
  },
  politics: {
    label: "Politics",
    eyebrow: "The Politics Desk",
    dek: "Congress, the White House, elections, and the policies shaping the country.",
    order: 8,
  },
  weather: {
    label: "Weather",
    eyebrow: "The Weather Desk",
    dek: "Forecasts, alerts, and conditions shaping the day ahead.",
    order: 9,
  },
};

interface DepropRow {
  id: number;
  source: string;
  category: string;
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  author: string | null;
  language: string | null;
  fetchedAt: string;
  importance: number;
}

function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

function isWithinLast24Hours(value: string | undefined | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
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
  if (lower.includes("hackernews") || lower.includes("hacker news"))
    return "https://news.ycombinator.com";
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
  if (lower.includes("noaa")) return "https://www.noaa.gov";
  if (lower.includes("wmo")) return "https://wmo.int";
  return "https://example.com";
}

function formatContent(text: string): string {
  const cleaned = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

function buildArticle(row: DepropRow, index: number): Article {
  const id = idFromUrl(row.url, index);
  const slug = `${slugify(row.title)}-${row.id}`;
  const rawContent = row.content ?? row.summary ?? "";
  const content = formatContent(plainText(rawContent));
  const plainSummary = plainText(row.summary ?? content.slice(0, 500));
  const summary = plainSummary.slice(0, 1997).trim();

  return {
    id,
    slug,
    displayPosition: "standard",
    headline: row.title,
    deck: deriveDeck(content),
    summary: summary.length > 0 ? summary : "No summary available.",
    content: content.length > 0 ? content : "No article content available.",
    category: row.category as Article["category"],
    tags: [],
    author: row.author ?? undefined,
    source: {
      name: row.source,
      url: sourceUrl(row.source),
      reliability: "high",
    },
    originalUrl: row.url.replace(/^http:\/\//, "https://"),
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
      summaryIsAiGenerated: true,
      model: "publish-dailywire",
    },
  };
}

function assignDisplayPositions(articles: Article[]): void {
  if (articles.length === 0) return;
  articles[0]!.displayPosition = "lead";
  articles[0]!.editorialProminence = 1;
  for (let i = 1; i < articles.length; i++) {
    const article = articles[i]!;
    if (article.image) {
      article.displayPosition = "major";
    }
    article.editorialProminence = Math.min(1, Math.max(0, (article.importance ?? 5) / 10));
  }
}

function getLatestRunId(db: DatabaseSync): number {
  const stmt = db.prepare("SELECT id FROM runs ORDER BY startedAt DESC LIMIT 1");
  const row = stmt.get() as { id: number } | undefined;
  if (!row) {
    throw new Error("No runs found in deprop.db. Run populate-depropdb first.");
  }
  return row.id;
}

function getArticlesFromDeprop(db: DatabaseSync): DepropRow[] {
  const runId = getLatestRunId(db);
  const stmt = db.prepare(`
    SELECT *
    FROM articles
    WHERE runId = ?
    ORDER BY importance DESC, datetime(COALESCE(publishedAt, fetchedAt)) DESC
  `);
  return stmt.all(runId) as DepropRow[];
}

async function main(): Promise<void> {
  const db = openDepropDb();
  initDepropDb(db);

  const now = new Date();
  const editionDate = now.toISOString().slice(0, 10);
  const isoNow = now.toISOString();

  const rows = getArticlesFromDeprop(db);
  if (rows.length === 0) {
    console.error("No rewritten articles from the latest populate run found in deprop.db.");
    console.error("Run the rewrite-articles and populate-depropdb skills first.");
    process.exit(1);
  }

  const articles: Article[] = rows.map((row, index) => buildArticle(row, index));

  // Rows are already sorted by importance descending. The first article is the lead.
  const [lead] = articles;
  assignDisplayPositions(articles);

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

  if (!sections.some((s) => s.id === "weather")) {
    navItems.push({ id: "weather", label: "Weather", path: "/weather" });
  }

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
    editionId: `ed-${editionDate}-dailywire`,
    editionDate,
    editionNumber: 1,
    editionTitle: "Botwin's Morning Wire",
    status: "published",
    generatedAt: isoNow,
    publishedAt: isoNow,
    updatedAt: isoNow,
    timezone: "UTC",
    locale: "en-US",
    masthead: {
      title: "Botwin's Morning Wire",
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
      moreLinks: [{ id: "archive", label: "Archive", path: "/editions" }],
    },
    leadStoryId: lead.id,
    articles,
    sections,
    morningBriefing: [],
    editorsNote: {
      text: "This edition was assembled from neutral, agent-rewritten summaries of the day's aggregated news.",
      whyItMatters:
        "Every article was reviewed for loaded language, partisan framing, and missing attribution before publication.",
      model: "publish-dailywire",
      generatedAt: isoNow,
      sourcesConsidered: sources.length,
    },
    marketSnapshot: {
      updatedAt: isoNow,
      sourceName: "Market data not available",
      tickers: [],
      commodities: [],
    },
    weather: {
      sourceName: "Weather data not available",
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
      model: "publish-dailywire",
      sourcesCount: sources.length,
      storiesAnalyzed: articles.length,
      readingTimeMin: articles.reduce((sum, a) => sum + a.readingTimeMin, 0),
    },
    footer: {
      copyright: `© ${now.getFullYear()} Botwin's Morning Wire. All rights reserved.`,
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

  const rules = validateBusinessRules(validated.data);
  if (!rules.ok) {
    console.error("Business-rule validation failed:");
    for (const error of rules.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const outDir = resolve("public/data");
  const editionsDir = resolve(outDir, "editions");
  mkdirSync(editionsDir, { recursive: true });

  const currentPath = resolve(outDir, "current-edition.json");
  const json = JSON.stringify(validated.data, null, 2);
  writeFileSync(currentPath, json);
  console.log(`Wrote ${validated.data.articles.length} articles to ${currentPath}`);

  // Always write static archive files for local dev and fallback. They are
  // gitignored, so they won't bloat the Cloudflare Pages deploy bundle.
  const archivePath = resolve(editionsDir, `${editionDate}.json`);
  const indexPath = resolve(editionsDir, "index.json");
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

  console.log(`Wrote archive to ${archivePath}`);
  console.log(`Wrote index to ${indexPath}`);

  // If Cloudflare credentials are configured, also push the edition to D1 so
  // the deployed site can serve it from Cloudflare instead of static files.
  const d1Config = getD1Config();
  if (d1Config) {
    await upsertEditionToD1(validated.data);
  } else {
    console.log(
      "Skipping D1 upsert: CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN are not all set.",
    );
  }

  db.close();
}

main();
