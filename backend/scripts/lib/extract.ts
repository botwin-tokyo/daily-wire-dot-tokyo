/**
 * Article extraction helpers for HTML fetched through Ladder.
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractedArticle {
  title: string;
  byline: string | null;
  summary: string;
  imageUrl: string | null;
  publishedAt: string | null;
  siteName: string | null;
  language: string | null;
}

function titleFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    const slug = pathname.split("/").pop();
    if (!slug) return null;
    return slug
      .replace(/\.html$/, "")
      .split("-")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
  } catch {
    return null;
  }
}

function isGenericTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.length < 3 ||
    lower.includes("embed") ||
    lower.includes("player") ||
    lower.includes("newsletter") ||
    lower.startsWith("when the world's at stake") ||
    lower.startsWith("national security. for insiders")
  );
}

function getMeta(document: Document, ...selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent) return element.textContent.trim();
    const attr = element?.getAttribute("content");
    if (attr) return attr.trim();
  }
  return null;
}

function metaTitle(document: Document): string | null {
  // Prefer the <title> tag; some publishers (AP, Axios) return og:title as an
  // array of headline candidates that Readability mishandles.
  const titleTag = document.querySelector("title")?.textContent?.trim();
  if (titleTag) return titleTag;
  return getMeta(document, 'meta[property="og:title"]', 'meta[name="twitter:title"]');
}

function metaAuthor(document: Document): string | null {
  return getMeta(document, 'meta[name="author"]', 'meta[property="article:author"]');
}

function metaImage(document: Document, baseUrl: string): string | null {
  const raw =
    getMeta(
      document,
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image:src"]',
      'meta[name="twitter:image"]',
    ) ||
    document.querySelector('link[rel="image_src"]')?.getAttribute("href") ||
    null;

  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

function metaDate(document: Document): string | null {
  return getMeta(
    document,
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[property="og:article:modified_time"]',
    'meta[name="publishedDate"]',
    'meta[name="date"]',
  );
}

function silenceCssWarnings<T>(fn: () => T): T {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("Could not parse CSS stylesheet")) {
      return;
    }
    originalError.apply(console, args);
  };
  try {
    return fn();
  } finally {
    console.error = originalError;
  }
}

function plainText(html: string): string {
  return silenceCssWarnings(() => {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    document.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    document.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6").forEach((el) => {
      el.appendChild(document.createTextNode("\n"));
    });
    let text = document.body?.textContent ?? "";
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
  });
}

export function extractArticleFromHtml(
  html: string,
  url: string,
  titleSelector?: string,
): ExtractedArticle {
  return silenceCssWarnings(() => {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Capture the requested headline before Readability mutates the DOM.
    const selectedTitle = titleSelector
      ? document.querySelector(titleSelector)?.textContent?.trim() || null
      : null;

    const reader = new Readability(document, { charThreshold: 0 });
    const article = reader.parse();

    if (!article) {
      throw new Error(`Readability could not parse article content for ${url}`);
    }

    const summary = plainText(article.textContent ?? article.content ?? "").slice(0, 1200);

    let title = selectedTitle || article.title || metaTitle(document) || null;
    // Some sites (AP, Axios) produce a JSON-array-like title from structured data.
    if (title && title.startsWith("[") && title.includes("]")) {
      const fallback = metaTitle(document);
      if (fallback && !fallback.startsWith("[")) title = fallback;
    }
    if (!title || isGenericTitle(title)) {
      title = titleFromUrl(url) || title || "Untitled";
    }

    return {
      title,
      byline: article.byline || metaAuthor(document) || null,
      summary,
      imageUrl: metaImage(document, url), // Readability does not expose a hero image, fall back to OpenGraph/Twitter meta
      publishedAt: metaDate(document),
      siteName: article.siteName || null,
      language: document.documentElement.lang || null,
    };
  });
}
