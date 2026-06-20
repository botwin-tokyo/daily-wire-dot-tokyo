/**
 * Firecrawl helper for fetching publisher pages when Ladder is blocked.
 *
 * Supports both no-key usage and API-key usage via FIRECRAWL_API_KEY in .env.
 * Docs: https://docs.firecrawl.dev/api-reference/introduction
 */

import { getEnv } from "./env";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";
const DEFAULT_TIMEOUT_MS = 60_000;

let firecrawlQuotaExhausted = false;

function getFirecrawlApiKey(): string | undefined {
  return getEnv("FIRECRAWL_API_KEY");
}

export function isFirecrawlConfigured(): boolean {
  return true; // Firecrawl works without an API key from many networks.
}

export function isFirecrawlQuotaExhausted(): boolean {
  return firecrawlQuotaExhausted;
}

interface FirecrawlMetadata {
  title?: string;
  description?: string;
  sourceURL?: string;
  language?: string;
  [key: string]: unknown;
}

interface FirecrawlResponse {
  success?: boolean;
  data?: {
    html?: string;
    markdown?: string;
    metadata?: FirecrawlMetadata;
  };
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractMarkdownLinks(markdown: string | undefined): string[] {
  if (!markdown) return [];
  const links = new Set<string>();
  // Markdown link syntax: [text](url)
  for (const match of markdown.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    links.add(match[2].trim());
  }
  // Bare URLs
  for (const match of markdown.match(/https?:\/\/[^\s<>)"{}|\\^`[\]]+/g) ?? []) {
    links.add(match);
  }
  return [...links];
}

function buildSyntheticHtml(
  html: string,
  markdown: string | undefined,
  metadata: FirecrawlMetadata | undefined,
  url: string,
): string {
  const metaTags: string[] = [];

  if (metadata?.title) {
    metaTags.push(`<title>${escapeHtml(metadata.title)}</title>`);
    // Only emit og:title if it is a plain string. Some sites (AP, Axios) return
    // an array of headline candidates that breaks downstream extractors.
    if (typeof metadata.title === "string") {
      metaTags.push(`<meta property="og:title" content="${escapeHtml(metadata.title)}">`);
    }
  }
  if (metadata?.description && typeof metadata.description === "string") {
    metaTags.push(`<meta name="description" content="${escapeHtml(metadata.description)}">`);
    metaTags.push(`<meta property="og:description" content="${escapeHtml(metadata.description)}">`);
  }
  if (metadata?.sourceURL) {
    metaTags.push(`<meta property="og:url" content="${escapeHtml(metadata.sourceURL)}">`);
  }
  if (metadata?.language) {
    metaTags.push(`<meta property="og:locale" content="${escapeHtml(metadata.language)}">`);
  }

  // Preserve any additional metadata Firecrawl returned as raw meta tags.
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (value === undefined || value === null) continue;
    if (["title", "description", "sourceURL", "language"].includes(key)) continue;
    const content = typeof value === "string" ? value : JSON.stringify(value);
    if (key.startsWith("og:")) {
      metaTags.push(`<meta property="${escapeHtml(key)}" content="${escapeHtml(content)}">`);
    } else {
      metaTags.push(`<meta name="${escapeHtml(key)}" content="${escapeHtml(content)}">`);
    }
  }

  // Some JS-rendered index pages return HTML with no usable anchor tags, but
  // Firecrawl's markdown extraction still contains the article links. Expose
  // those as real <a> tags so the shared link extractor can discover them.
  const markdownLinks = extractMarkdownLinks(markdown);
  const linkTags = markdownLinks
    .map((href) => `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`)
    .join("");

  return `<!DOCTYPE html><html lang="${escapeHtml(metadata?.language?.split("-")[0] ?? "en")}"><head>${metaTags.join("")}<base href="${escapeHtml(url)}"></head><body>${html}<div style="display:none" data-firecrawl-links="true">${linkTags}</div></body></html>`;
}

export async function fetchViaFirecrawl(
  targetUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  if (process.env.DISABLE_FIRECRAWL === "1") {
    throw new Error("Firecrawl disabled (DISABLE_FIRECRAWL=1)");
  }

  const apiKey = getFirecrawlApiKey();
  const body = JSON.stringify({ url: targetUrl, formats: ["html", "markdown"] });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Firecrawl returned ${response.status}: ${await response.text()}`);
    }

    const result = (await response.json()) as FirecrawlResponse;

    if (!result.success) {
      throw new Error(`Firecrawl failed: ${result.error ?? "unknown error"}`);
    }

    const html = result.data?.html ?? result.data?.markdown;
    if (html === undefined) {
      throw new Error("Firecrawl response did not contain html or markdown");
    }

    return buildSyntheticHtml(html, result.data?.markdown, result.data?.metadata, targetUrl);
  } finally {
    clearTimeout(timeout);
  }
}
