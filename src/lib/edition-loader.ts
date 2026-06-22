/**
 * Edition loader and adapter.
 *
 * Reads canonical NewspaperEdition JSON from public/data/ and adapts it
 * to the legacy Edition shape that the existing components expect.
 */

import {
  validateNewspaperEdition,
  type NewspaperEdition,
  type Article as NewspaperArticle,
  type BriefingItem as NewspaperBriefingItem,
  type MarketTicker as NewspaperMarketTicker,
  type WeatherCell as NewspaperWeatherCell,
} from "./schema";
import type {
  Edition,
  Article,
  BriefingItem,
  MarketTicker,
  WeatherCell,
  EditionSummary,
  EditionStatus,
} from "./types";

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function nextDayAt0530(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1, 5, 30, 0));
  return date.toISOString();
}

function adaptImage(image: NewspaperArticle["image"]) {
  if (!image) return undefined;
  return {
    url: image.url,
    attribution: image.attribution,
    caption: image.caption ?? image.alt,
  };
}

export function adaptArticle(article: NewspaperArticle): Article {
  return {
    id: article.id,
    slug: article.slug,
    category: article.category,
    eyebrow: article.displayPosition === "lead" ? "TOP STORY" : article.category.toUpperCase(),
    headline: article.headline,
    deck: article.deck,
    summary: article.summary,
    content: article.content ?? article.summary,
    whyItMatters: article.whyItMatters,
    keyPoints: article.keyPoints,
    source: article.source,
    author: article.author,
    originalUrl: article.originalUrl,
    publishedAt: article.publishedAt,
    retrievedAt: article.retrievedAt,
    readingTimeMin: article.readingTimeMin,
    relevanceScore: article.relevanceScore,
    confidenceScore: article.confidenceScore,
    image: adaptImage(article.image),
    tags: article.tags,
    relatedIds: article.relatedArticleIds,
  };
}

function adaptBriefingItem(item: NewspaperBriefingItem): BriefingItem {
  return {
    topic: item.topic,
    text: item.text,
    sourceName: item.sourceName,
    articleId: item.articleId,
    icon: item.icon,
  };
}

function adaptMarketTicker(ticker: NewspaperMarketTicker): MarketTicker {
  return {
    symbol: ticker.symbol,
    value: ticker.value,
    changePct: ticker.changePct,
  };
}

function adaptWeatherCell(cell: NewspaperWeatherCell): WeatherCell {
  return {
    city: cell.city,
    tempC: cell.tempC,
    condition: cell.condition,
    icon: cell.icon,
  };
}

function adaptStatus(status: NewspaperEdition["status"]): EditionStatus {
  if (status === "draft") return "generating";
  return status;
}

export function newspaperEditionToEdition(newspaper: NewspaperEdition): Edition {
  return {
    id: newspaper.editionId,
    editionDate: newspaper.editionDate,
    status: adaptStatus(newspaper.status),
    generatedAt: newspaper.generatedAt,
    publishedAt: newspaper.publishedAt,
    updatedByAiAt: formatTime(newspaper.updatedAt),
    nextScheduledAt: nextDayAt0530(newspaper.editionDate),
    sourceCount: newspaper.generationMetadata.sourcesCount,
    storiesAnalyzed: newspaper.generationMetadata.storiesAnalyzed,
    readingTimeMin: newspaper.generationMetadata.readingTimeMin,
    warningMessage: undefined,
    leadArticleId: newspaper.leadStoryId,
    articles: newspaper.articles.map(adaptArticle),
    morningBriefing: newspaper.morningBriefing.map(adaptBriefingItem),
    editorsNote: {
      text: newspaper.editorsNote.text,
      whyItMatters: newspaper.editorsNote.whyItMatters,
      model: newspaper.editorsNote.model,
      generatedAt: newspaper.editorsNote.generatedAt,
      sourcesConsidered: newspaper.editorsNote.sourcesConsidered,
    },
    markets: newspaper.marketSnapshot.tickers.map(adaptMarketTicker),
    commodities: newspaper.marketSnapshot.commodities.map(adaptMarketTicker),
    weather: newspaper.weather.cities.map(adaptWeatherCell),
    sections: newspaper.sections,
  };
}

function isServer(): boolean {
  return typeof window === "undefined";
}

async function loadJson(path: string): Promise<unknown> {
  if (isServer()) {
    // During SSR/pre-render we read directly from the repo. This path is
    // relative to the project root, which is the cwd for `vite dev`,
    // `vite build`, and `vite preview`. It will be replaced by Pages
    // Functions once the Cloudflare backend is wired up.
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(`public${path}`, "utf-8");
    return JSON.parse(raw);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function loadCurrentEdition(): Promise<NewspaperEdition> {
  const data = await loadJson("/data/current-edition.json");
  const result = validateNewspaperEdition(data);
  if (!result.success) {
    throw new Error(`Invalid current edition:\n${result.errors.join("\n")}`);
  }
  return result.data;
}

export async function loadEditionByDate(date: string): Promise<NewspaperEdition> {
  const data = await loadJson(`/data/editions/${date}.json`);
  const result = validateNewspaperEdition(data);
  if (!result.success) {
    throw new Error(`Invalid edition for ${date}:\n${result.errors.join("\n")}`);
  }
  return result.data;
}

export async function loadEditionSummaries(): Promise<EditionSummary[]> {
  const data = await loadJson("/data/editions/index.json");
  if (!Array.isArray(data)) {
    throw new Error("Edition index must be an array");
  }
  return data as EditionSummary[];
}
