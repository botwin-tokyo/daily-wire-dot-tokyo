import type { NewspaperArticle, Article } from "@/lib/types";

export function adaptArticle(article: NewspaperArticle): Article {
  return {
    id: article.id,
    slug: article.slug,
    category: article.category,
    headline: article.headline,
    deck: article.deck,
    summary: article.summary,
    content: article.content,
    whyItMatters: article.whyItMatters,
    keyPoints: article.keyPoints,
    source: article.source,
    author: article.author,
    originalUrl: article.originalUrl,
    publishedAt: article.publishedAt,
    retrievedAt: article.retrievedAt,
    readingTimeMin: article.readingTimeMin,
    image: article.image,
    tags: article.tags,
    relatedIds: article.relatedArticleIds,
    relevanceScore: article.relevanceScore,
    confidenceScore: article.confidenceScore,
  };
}
