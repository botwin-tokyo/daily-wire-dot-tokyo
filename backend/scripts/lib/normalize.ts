/**
 * Category normalization.
 *
 * Aggregation scripts return whatever section label the publisher uses on its
 * own site (e.g. "iphone", "security", "space"). The frontend only renders a
 * fixed set of section pages, so every ingested article is mapped to one of the
 * canonical categories before it is written to the database.
 */

export const CANONICAL_CATEGORIES = [
  "world",
  "technology",
  "business",
  "science",
  "culture",
  "crypto",
  "politics",
  "war",
  "weather",
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, CanonicalCategory> = {
  // World
  world: "world",
  international: "world",
  foreign: "world",
  geopolitics: "world",
  "middle-east": "world",
  europe: "world",
  "asia-pacific": "world",
  africa: "world",
  americas: "world",

  // War
  war: "war",
  defense: "war",
  military: "war",
  warfare: "war",
  conflict: "war",
  conflicts: "war",
  "national-security": "war",
  "armed-forces": "war",
  army: "war",
  navy: "war",
  air: "war",
  land: "war",
  sea: "war",
  "news-features": "war",
  "foreign-forces": "war",
  "surface-forces": "war",
  "news-analysis": "war",

  // Technology
  technology: "technology",
  tech: "technology",
  "artificial-intelligence": "technology",
  ai: "technology",
  gadgets: "technology",
  security: "technology",
  cybersecurity: "technology",
  cloud: "technology",
  startups: "technology",
  venture: "technology",
  software: "technology",
  hardware: "technology",
  apple: "technology",
  ios: "technology",
  iphone: "technology",
  mac: "technology",
  "front-page": "technology",
  latest: "technology",

  // Business
  business: "business",
  economy: "business",
  finance: "business",
  markets: "business",
  money: "business",
  companies: "business",

  // Science
  science: "science",
  space: "science",
  research: "science",
  environment: "science",
  nature: "science",
  astronomy: "science",
  physics: "science",
  biology: "science",
  health: "science",
  medicine: "science",
  nasa: "science",
  esa: "science",

  // Culture
  culture: "culture",
  arts: "culture",
  entertainment: "culture",
  film: "culture",
  movies: "culture",
  books: "culture",
  literature: "culture",
  music: "culture",
  lifestyle: "culture",
  fashion: "culture",
  food: "culture",
  travel: "culture",
  tv: "culture",
  television: "culture",
  art: "culture",
  theater: "culture",
  theatre: "culture",
  gaming: "culture",
  games: "culture",
  playstation: "culture",
  xbox: "culture",
  nintendo: "culture",
  pc: "culture",
  reviews: "culture",

  // Crypto
  crypto: "crypto",
  cryptocurrency: "crypto",
  bitcoin: "crypto",
  blockchain: "crypto",
  defi: "crypto",
  nft: "crypto",
  web3: "crypto",

  // Politics
  politics: "politics",
  political: "politics",
  congress: "politics",
  "white-house": "politics",
  election: "politics",
  elections: "politics",
  policy: "politics",
  government: "politics",

  // Weather
  weather: "weather",
  climate: "weather",
  meteorology: "weather",
  forecasting: "weather",
};

/**
 * Normalize a raw publisher category to one of the five frontend section
 * categories. If the raw value cannot be mapped, falls back to the script's
 * declared category and then to "world" as a last resort.
 */
export function normalizeCategory(
  raw: string | undefined,
  fallback: string | undefined,
): CanonicalCategory {
  const key = (raw ?? fallback ?? "world").toLowerCase().trim();
  return CATEGORY_ALIASES[key] ?? normalizeCategory(fallback, "world");
}
