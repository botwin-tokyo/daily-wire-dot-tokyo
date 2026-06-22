/**
 * Shared runner for WordPress REST API aggregation.
 *
 * Many defense and policy publishers (ISW, USNI, The War Zone) run on
 * WordPress and expose full posts through the REST API at
 * /wp-json/wp/v2/posts. This helper fetches posts, embeds author and featured
 * media data, and normalizes the result for the aggregation pipeline.
 */

import { fetchJson, buildResult, printResult } from "./fetch";
import { plainText } from "./extract";
import type { NormalizedArticle } from "./types";

export interface WordPressFeed {
  /** Base site URL (e.g. https://www.twz.com). */
  baseUrl: string;
  /** Category slug(s) to filter by, if the site exposes them. */
  categories?: number[] | string[];
  /**
   * Custom taxonomy filters, e.g. { topics: [59398] } for Wccftech's
   * hardware topic. Keys become query parameters and values are joined by
   * commas (WordPress expects IDs for custom taxonomies).
   */
  taxonomies?: Record<string, number[] | string[]>;
  /** Search keyword(s) passed to the REST API. */
  search?: string;
  /** Maximum posts to fetch. */
  maxItems?: number;
  /** Filter to a specific author ID. */
  author?: number;
  /** Optional regex applied to the post link to include only matching URLs. */
  linkPattern?: RegExp;
}

interface WpRendered {
  rendered: string;
  protected?: boolean;
}

interface WpAuthor {
  name?: string;
}

interface WpFeaturedMedia {
  source_url?: string;
  alt_text?: string;
}

interface WpPost {
  id: number;
  date_gmt: string;
  link: string;
  slug: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  author: number;
  _embedded?: {
    author?: WpAuthor[];
    "wp:featuredmedia"?: WpFeaturedMedia[];
  };
}

function stripHtml(html: string): string {
  return plainText(html).replace(/\s+/g, " ").trim();
}

function buildApiUrl(feed: WordPressFeed): string {
  const url = new URL("/wp-json/wp/v2/posts", feed.baseUrl);
  url.searchParams.set("per_page", String(feed.maxItems ?? 10));
  url.searchParams.set("_embed", "author,wp:featuredmedia");
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "desc");

  if (feed.categories && feed.categories.length > 0) {
    // Category IDs are passed verbatim; slugs are not supported by the posts
    // endpoint without an extra lookup, so callers should resolve IDs if needed.
    const ids = feed.categories.filter((c): c is number => typeof c === "number");
    if (ids.length > 0) {
      url.searchParams.set("categories", ids.join(","));
    }
  }

  if (feed.taxonomies) {
    for (const [key, values] of Object.entries(feed.taxonomies)) {
      const ids = values.filter((v): v is number => typeof v === "number");
      if (ids.length > 0) {
        url.searchParams.set(key, ids.join(","));
      }
    }
  }

  if (feed.search) {
    url.searchParams.set("search", feed.search);
  }

  if (feed.author) {
    url.searchParams.set("author", String(feed.author));
  }

  return url.href;
}

export async function collectFromWordPress(
  source: string,
  category: string,
  feeds: WordPressFeed[],
  defaultMax = 5,
): Promise<NormalizedArticle[]> {
  const articles: NormalizedArticle[] = [];

  for (const feed of feeds) {
    try {
      const url = buildApiUrl({ ...feed, maxItems: feed.maxItems ?? defaultMax });
      const posts = await fetchJson<WpPost[]>(url);

      for (const post of posts) {
        if (feed.linkPattern && !feed.linkPattern.test(post.link)) continue;

        const title = stripHtml(post.title.rendered);
        if (!title) continue;

        const rawContent = post.content.rendered;
        const rawExcerpt = post.excerpt.rendered;
        const content = stripHtml(rawContent);
        const excerpt = stripHtml(rawExcerpt);

        const author = post._embedded?.author?.[0]?.name;
        const featured = post._embedded?.["wp:featuredmedia"]?.[0];
        const imageUrl = featured?.source_url;

        articles.push({
          source,
          category,
          title,
          url: post.link,
          summary: excerpt || content.slice(0, 500),
          content,
          imageUrl,
          publishedAt: new Date(post.date_gmt).toISOString(),
          author,
          language: "en",
        });
      }
    } catch (err) {
      console.error(
        `[${source}] WordPress feed failed ${feed.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return articles;
}

export async function aggregateFromWordPress(
  source: string,
  resultCategory: string,
  feeds: WordPressFeed[],
  defaultMax = 5,
): Promise<void> {
  const articles = await collectFromWordPress(source, resultCategory, feeds, defaultMax);
  printResult(buildResult(source, resultCategory, articles));
}
