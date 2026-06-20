import { z } from "zod";
import { SectionSchema } from "./schema";

export const CategorySchema = z.enum([
  "world",
  "technology",
  "business",
  "science",
  "culture",
  "crypto",
  "politics",
]);
export type Category = z.infer<typeof CategorySchema>;

export const ArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: CategorySchema,
  eyebrow: z.string().optional(),
  headline: z.string(),
  deck: z.string().optional(),
  summary: z.string(),
  whyItMatters: z.string().optional(),
  keyPoints: z.array(z.string()).default([]),
  source: z.object({
    name: z.string(),
    url: z.string().url(),
    reliability: z.enum(["high", "medium", "low"]).default("high"),
  }),
  author: z.string().optional(),
  originalUrl: z.string().url(),
  publishedAt: z.string(),
  retrievedAt: z.string(),
  readingTimeMin: z.number().int().positive().default(3),
  relevanceScore: z.number().min(0).max(1).default(0.8),
  confidenceScore: z.number().min(0).max(1).default(0.85),
  image: z
    .object({
      url: z.string(),
      attribution: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  relatedIds: z.array(z.string()).default([]),
});
export type Article = z.infer<typeof ArticleSchema>;

export const BriefingItemSchema = z.object({
  topic: z.string(),
  text: z.string(),
  sourceName: z.string(),
  articleId: z.string().optional(),
  icon: z.enum(["globe", "chart", "health", "tech", "culture", "crypto", "politics"]).default("globe"),
});
export type BriefingItem = z.infer<typeof BriefingItemSchema>;

export const MarketTickerSchema = z.object({
  symbol: z.string(),
  value: z.string(),
  changePct: z.number(),
});
export type MarketTicker = z.infer<typeof MarketTickerSchema>;

export const WeatherCellSchema = z.object({
  city: z.string(),
  tempC: z.number(),
  condition: z.string(),
  icon: z.enum(["sun", "cloud", "rain", "snow", "partly"]).default("partly"),
});
export type WeatherCell = z.infer<typeof WeatherCellSchema>;

export const EditionStatusSchema = z.enum([
  "scheduled",
  "generating",
  "published",
  "published_with_warnings",
  "failed",
]);
export type EditionStatus = z.infer<typeof EditionStatusSchema>;

export const EditionSchema = z.object({
  id: z.string(),
  editionDate: z.string(),
  status: EditionStatusSchema,
  generatedAt: z.string(),
  publishedAt: z.string().optional(),
  updatedByAiAt: z.string(),
  nextScheduledAt: z.string(),
  sourceCount: z.number().int(),
  storiesAnalyzed: z.number().int(),
  readingTimeMin: z.number().int(),
  warningMessage: z.string().optional(),
  leadArticleId: z.string(),
  articles: z.array(ArticleSchema),
  morningBriefing: z.array(BriefingItemSchema),
  editorsNote: z.object({
    text: z.string(),
    whyItMatters: z.string(),
    model: z.string(),
    generatedAt: z.string(),
    sourcesConsidered: z.number().int(),
  }),
  markets: z.array(MarketTickerSchema),
  commodities: z.array(MarketTickerSchema),
  weather: z.array(WeatherCellSchema),
  sections: z.array(SectionSchema).default([]),
});
export type Edition = z.infer<typeof EditionSchema>;

export type EditionSummary = {
  id: string;
  editionDate: string;
  status: EditionStatus;
  storyCount: number;
  leadHeadline: string;
  categories: Category[];
};

export type Settings = {
  personalization: {
    preferredCategories: Category[];
    mutedTopics: string[];
    preferredSources: string[];
    blockedSources: string[];
    geographicInterests: string[];
    keywordInterests: string[];
    viewpointDiversity: "low" | "balanced" | "high";
    maxStoriesPerEdition: number;
  };
  schedule: {
    deliveryTime: string;
    timezone: string;
    days: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
    autoGenerate: boolean;
    regenerateOnFailure: boolean;
    notificationWebhook?: string;
  };
  ai: {
    providerConfigured: boolean;
    provider: string;
    model: string;
    summaryLength: "short" | "medium" | "long";
    tone: "neutral" | "analytical" | "conversational";
    includeWhyItMatters: boolean;
    includeCrossStoryAnalysis: boolean;
    sourceBalancing: boolean;
  };
  feeds: Feed[];
};

export type Feed = {
  id: string;
  name: string;
  url: string;
  category: Category;
  enabled: boolean;
  lastSuccessAt?: string;
  lastError?: string;
  health: "healthy" | "degraded" | "down";
};

/**
 * Canonical content-layer types derived from src/lib/schema.ts.
 * These describe the exact shape of public/data/current-edition.json.
 * Existing components continue to use the legacy `Edition`/`Article` types
 * above while the adapter layer is being built out.
 */
export type {
  NewspaperEdition,
  Article as NewspaperArticle,
  Section as NewspaperSection,
  BriefingItem as NewspaperBriefingItem,
  MarketTicker as NewspaperMarketTicker,
  MarketSnapshot as NewspaperMarketSnapshot,
  WeatherCell as NewspaperWeatherCell,
  WeatherSnapshot as NewspaperWeatherSnapshot,
  Source as NewspaperSource,
  Image as NewspaperImage,
  EditorsNote as NewspaperEditorsNote,
  TransparencySource as NewspaperTransparencySource,
  GenerationMetadata as NewspaperGenerationMetadata,
  Footer as NewspaperFooter,
  FooterLink as NewspaperFooterLink,
  Banner as NewspaperBanner,
  Navigation as NewspaperNavigation,
  NavItem as NewspaperNavItem,
  Masthead as NewspaperMasthead,
  UtilityBar as NewspaperUtilityBar,
  DisplayPosition,
} from "./schema";
