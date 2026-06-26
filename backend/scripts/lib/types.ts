/**
 * Common article shape returned by every news aggregation script.
 *
 * Scripts fetch from different APIs and normalize their responses to this
 * format so the rest of the pipeline can treat every source the same way.
 */

export interface NormalizedArticle {
  /** Original publisher or wire service. */
  source: string;
  /** Article headline / title. */
  title: string;
  /** URL to the original article. */
  url: string;
  /** Short summary or description, if available. */
  summary?: string;
  /** ISO 8601 publish timestamp, if available. */
  publishedAt?: string;
  /** Image URL, if available. */
  imageUrl?: string;
  /** Author, if available. */
  author?: string;
  /** Category the script was fetching (e.g. "technology", "business"). */
  category?: string;
  /** Full article text, when available (for AI rewrite pipeline). */
  content?: string;
  /** Language code, if available. */
  language?: string;
}

export interface AggregationResult {
  source: string;
  category: string;
  fetchedAt: string;
  count: number;
  articles: NormalizedArticle[];
}
