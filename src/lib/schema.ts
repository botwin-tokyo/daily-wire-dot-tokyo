/**
 * Canonical JSON schema for The Morning Wire edition documents.
 *
 * This is the single source of truth for the content contract between
 * the AI publishing pipeline and the frontend. Every field that appears
 * in public/data/current-edition.json must be defined here.
 */

import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = "1.0.0" as const;

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

const IdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "ID must be alphanumeric, hyphen, or underscore only");

const SlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case ASCII");

const IsoTimestampSchema = z.string().datetime({ message: "Must be ISO 8601 UTC" });

function plainText(maxLength?: number) {
  let schema = z.string();
  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }
  return schema.refine(
    (val) => !/<[^>]+>|\bjavascript:|\bon\w+\s*=|\bstyle\s*=/i.test(val),
    "Text must not contain HTML, event handlers, javascript: URLs, or inline styles",
  );
}

function articleContent(maxLength = 100000) {
  return z
    .string()
    .max(maxLength)
    .refine(
      (val) => !/\bjavascript:|\bon\w+\s*=|\bstyle\s*=/i.test(val),
      "Content must not contain event handlers, javascript: URLs, or inline styles",
    );
}

const FORBIDDEN_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

function safeUrl() {
  return z
    .string()
    .url()
    .refine(
      (val) => !FORBIDDEN_PROTOCOLS.test(val),
      "URL must not use a forbidden protocol (javascript:, data:, vbscript:, file:)",
    );
}

function httpsUrl() {
  return safeUrl().refine((val) => /^https:\/\//i.test(val), "URL must use HTTPS");
}

function httpsUrlOrRelative() {
  return z.union([z.string().regex(/^\//), httpsUrl()]);
}

export const DisplayPositionSchema = z.enum([
  "lead",
  "major",
  "standard",
  "brief",
  "sidebar",
  "imageFeature",
]);
export type DisplayPosition = z.infer<typeof DisplayPositionSchema>;

export const SourceSchema = z.object({
  name: plainText(100),
  url: httpsUrl(),
  reliability: z.enum(["high", "medium", "low"]).default("high"),
});
export type Source = z.infer<typeof SourceSchema>;

export const ImageSchema = z.object({
  url: httpsUrlOrRelative(),
  alt: plainText(300),
  caption: plainText(500).optional(),
  attribution: plainText(200).optional(),
});
export type Image = z.infer<typeof ImageSchema>;

export const ArticleSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  displayPosition: DisplayPositionSchema,
  headline: plainText(200),
  deck: plainText(300).optional(),
  summary: plainText(2000),
  content: articleContent(),
  category: CategorySchema,
  tags: z.array(plainText(50)).default([]),
  author: plainText(100).optional(),
  source: SourceSchema,
  originalUrl: httpsUrl(),
  canonicalUrl: httpsUrl().optional(),
  publishedAt: IsoTimestampSchema,
  retrievedAt: IsoTimestampSchema,
  readingTimeMin: z.number().int().positive().default(3),
  image: ImageSchema.optional(),
  keyPoints: z.array(plainText(300)).default([]),
  whyItMatters: plainText(1200).optional(),
  relatedArticleIds: z.array(IdSchema).default([]),
  relevanceScore: z.number().min(0).max(1).default(0.8),
  confidenceScore: z.number().min(0).max(1).default(0.85),
  editorialProminence: z.number().min(0).max(1).default(0.5),
  aiDisclosure: z.object({
    summaryIsAiGenerated: z.boolean().default(true),
    model: plainText(100).optional(),
  }),
});
export type Article = z.infer<typeof ArticleSchema>;

export const SectionSchema = z.object({
  id: z.union([CategorySchema, SlugSchema]),
  label: plainText(50),
  eyebrow: plainText(100),
  dek: plainText(300),
  order: z.number().int().min(0),
  visible: z.boolean().default(true),
  articleIds: z.array(IdSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const BriefingItemSchema = z.object({
  topic: plainText(50),
  text: plainText(500),
  sourceName: plainText(100),
  articleId: IdSchema.optional(),
  icon: z.enum(["globe", "chart", "health", "tech", "culture", "crypto", "politics"]).default("globe"),
});
export type BriefingItem = z.infer<typeof BriefingItemSchema>;

export const EditorsNoteSchema = z.object({
  text: plainText(2000),
  whyItMatters: plainText(1200),
  model: plainText(100),
  generatedAt: IsoTimestampSchema,
  sourcesConsidered: z.number().int().nonnegative(),
});
export type EditorsNote = z.infer<typeof EditorsNoteSchema>;

export const MarketTickerSchema = z.object({
  symbol: plainText(30),
  value: plainText(30),
  changePct: z.number(),
});
export type MarketTicker = z.infer<typeof MarketTickerSchema>;

export const MarketSnapshotSchema = z.object({
  updatedAt: IsoTimestampSchema,
  sourceName: plainText(100),
  sourceUrl: httpsUrl().optional(),
  tickers: z.array(MarketTickerSchema),
  commodities: z.array(MarketTickerSchema),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const WeatherCellSchema = z.object({
  city: plainText(50),
  tempC: z.number(),
  condition: plainText(50),
  icon: z.enum(["sun", "cloud", "rain", "snow", "partly"]).default("partly"),
});
export type WeatherCell = z.infer<typeof WeatherCellSchema>;

export const WeatherSnapshotSchema = z.object({
  sourceName: plainText(100),
  sourceUrl: httpsUrl().optional(),
  local: WeatherCellSchema.optional(),
  cities: z.array(WeatherCellSchema),
});
export type WeatherSnapshot = z.infer<typeof WeatherSnapshotSchema>;

export const TransparencySourceSchema = z.object({
  name: plainText(100),
  url: httpsUrl(),
  articles: z.number().int().nonnegative(),
});
export type TransparencySource = z.infer<typeof TransparencySourceSchema>;

export const GenerationMetadataSchema = z.object({
  model: plainText(100),
  sourcesCount: z.number().int().nonnegative(),
  storiesAnalyzed: z.number().int().nonnegative(),
  readingTimeMin: z.number().int().nonnegative(),
  collectionStartedAt: IsoTimestampSchema.optional(),
  collectionFinishedAt: IsoTimestampSchema.optional(),
});
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;

export const FooterLinkSchema = z.object({
  label: plainText(50),
  path: httpsUrlOrRelative(),
});
export type FooterLink = z.infer<typeof FooterLinkSchema>;

export const FooterSchema = z.object({
  copyright: plainText(200),
  links: z.array(FooterLinkSchema).default([]),
});
export type Footer = z.infer<typeof FooterSchema>;

export const BannerSchema = z.object({
  id: IdSchema,
  type: z.enum(["breaking", "notice", "correction"]),
  message: plainText(200),
  link: z
    .object({
      label: plainText(50),
      url: httpsUrl(),
    })
    .optional(),
});
export type Banner = z.infer<typeof BannerSchema>;

export const NavItemSchema = z.object({
  id: IdSchema,
  label: plainText(30),
  path: z.string().regex(/^\//),
  category: CategorySchema.nullable().optional(),
});
export type NavItem = z.infer<typeof NavItemSchema>;

export const NavigationSchema = z.object({
  items: z.array(NavItemSchema),
  moreLinks: z.array(NavItemSchema).default([]),
});
export type Navigation = z.infer<typeof NavigationSchema>;

export const MastheadSchema = z.object({
  title: plainText(100),
  tagline: plainText(200),
});
export type Masthead = z.infer<typeof MastheadSchema>;

export const UtilityBarWeatherSchema = z.object({
  tempC: z.number(),
  condition: plainText(50),
  icon: z.enum(["sun", "cloud", "rain", "snow", "partly"]).default("partly"),
});
export type UtilityBarWeather = z.infer<typeof UtilityBarWeatherSchema>;

export const UtilityBarSchema = z.object({
  dateLabel: plainText(100),
  weather: UtilityBarWeatherSchema,
  editionLabel: plainText(50),
  updatedByAiAt: plainText(20),
  nextEditionText: plainText(100),
});
export type UtilityBar = z.infer<typeof UtilityBarSchema>;

export const EditionStatusSchema = z.enum([
  "draft",
  "published",
  "published_with_warnings",
  "failed",
]);
export type EditionStatus = z.infer<typeof EditionStatusSchema>;

export const NewspaperEditionSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  editionId: IdSchema,
  editionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  editionNumber: z.number().int().positive(),
  editionTitle: plainText(100).optional(),
  status: EditionStatusSchema,
  generatedAt: IsoTimestampSchema,
  publishedAt: IsoTimestampSchema.optional(),
  updatedAt: IsoTimestampSchema,
  timezone: z.string().min(1).max(64),
  locale: z.string().min(2).max(16),
  masthead: MastheadSchema,
  utilityBar: UtilityBarSchema,
  navigation: NavigationSchema,
  leadStoryId: IdSchema,
  articles: z.array(ArticleSchema).min(1),
  sections: z.array(SectionSchema).min(1),
  morningBriefing: z.array(BriefingItemSchema).max(5),
  editorsNote: EditorsNoteSchema,
  marketSnapshot: MarketSnapshotSchema,
  weather: WeatherSnapshotSchema,
  sources: z.array(TransparencySourceSchema),
  generationMetadata: GenerationMetadataSchema,
  footer: FooterSchema,
  banners: z.array(BannerSchema).optional(),
});
export type NewspaperEdition = z.infer<typeof NewspaperEditionSchema>;

/**
 * Validate a NewspaperEdition document and return a structured result.
 */
export function validateNewspaperEdition(
  value: unknown,
): { success: true; data: NewspaperEdition } | { success: false; errors: string[] } {
  const result = NewspaperEditionSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    ),
  };
}

/**
 * Extra business-rule validation that Zod cannot express cleanly.
 */
export function validateBusinessRules(
  edition: NewspaperEdition,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const articleIds = new Set<string>();
  const articleSlugs = new Set<string>();

  for (const article of edition.articles) {
    if (articleIds.has(article.id)) {
      errors.push(`Duplicate article id: ${article.id}`);
    }
    articleIds.add(article.id);

    if (articleSlugs.has(article.slug)) {
      errors.push(`Duplicate article slug: ${article.slug}`);
    }
    articleSlugs.add(article.slug);
  }

  if (!articleIds.has(edition.leadStoryId)) {
    errors.push(`leadStoryId "${edition.leadStoryId}" does not reference an existing article`);
  }

  for (const section of edition.sections) {
    if (!section.visible) continue;
    for (const articleId of section.articleIds) {
      if (!articleIds.has(articleId)) {
        errors.push(`Section "${section.id}" references missing article id: ${articleId}`);
      }
    }
  }

  for (const article of edition.articles) {
    for (const relatedId of article.relatedArticleIds) {
      if (!articleIds.has(relatedId)) {
        errors.push(`Article "${article.id}" references missing related article id: ${relatedId}`);
      }
    }
  }

  for (const item of edition.morningBriefing) {
    if (item.articleId && !articleIds.has(item.articleId)) {
      errors.push(
        `Morning briefing item "${item.topic}" references missing article id: ${item.articleId}`,
      );
    }
  }

  const now = Date.now();
  const skewMs = 5 * 60 * 1000;
  const publishedAt = new Date(edition.publishedAt ?? edition.generatedAt).getTime();
  if (publishedAt > now + skewMs) {
    errors.push("publishedAt/generatedAt cannot be more than 5 minutes in the future");
  }

  if (new Date(edition.generatedAt).getTime() > new Date(edition.updatedAt).getTime()) {
    errors.push("generatedAt must not be later than updatedAt");
  }

  if (edition.banners) {
    const bannerIds = new Set<string>();
    for (const banner of edition.banners) {
      if (bannerIds.has(banner.id)) {
        errors.push(`Duplicate banner id: ${banner.id}`);
      }
      bannerIds.add(banner.id);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
