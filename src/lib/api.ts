/**
 * API client layer.
 *
 * All UI calls go through these functions. In the current implementation the
 * edition data is read from public/data/current-edition.json and adapted to
 * the legacy Edition shape. Once Cloudflare Pages Functions are wired in, the
 * bodies can be replaced with fetch("/api/...") calls without changing the
 * function signatures.
 */
import { MOCK_EDITION, MOCK_EDITION_SUMMARIES, MOCK_SETTINGS } from "./mock-edition";
import {
  loadCurrentEdition,
  loadEditionByDate,
  loadEditionSummaries,
  newspaperEditionToEdition,
  adaptArticle,
} from "./edition-loader";
import { getCloudflareEnv } from "./cloudflare";
import { queryOptions } from "@tanstack/react-query";
import type {
  Article,
  Edition,
  EditionSummary,
  Feed,
  Settings,
  NewspaperEdition,
  NewspaperArticle,
} from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Resolve an API path to an absolute URL when running on the server in
 * Cloudflare Pages. Relative fetch works in the browser and in local dev, but
 * the Workers SSR runtime requires absolute URLs for outbound fetch calls.
 */
function getApiUrl(path: string): string {
  if (!isServer()) return path;
  const env = getCloudflareEnv();
  const base = env?.SITE_URL ?? process.env.SITE_URL;
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(getApiUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

const READ_KEY = "tmw.read";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}
function writeSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

async function loadEdition(): Promise<Edition> {
  try {
    const newspaper = await fetchJson<NewspaperEdition>("/api/edition/latest");
    return newspaperEditionToEdition(newspaper);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "Failed to fetch current edition from API, falling back to static file:",
        error,
      );
      const newspaper = await loadCurrentEdition();
      return newspaperEditionToEdition(newspaper);
    }
    throw error;
  }
}

export async function getLatestEdition(): Promise<Edition> {
  await wait(120);
  return loadEdition();
}

export async function getLatestNewspaperEdition(): Promise<NewspaperEdition> {
  try {
    return await fetchJson<NewspaperEdition>("/api/edition/latest");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "Failed to fetch current newspaper edition from API, falling back to static file:",
        error,
      );
      return await loadCurrentEdition();
    }
    throw error;
  }
}

export const newspaperEditionQuery = queryOptions({
  queryKey: ["edition", "newspaper", "latest"],
  queryFn: () => getLatestNewspaperEdition(),
  staleTime: 60_000,
});

export async function getEditionByDate(date: string): Promise<Edition> {
  await wait(120);
  try {
    const newspaper = await fetchJson<NewspaperEdition>(`/api/editions/${date}`);
    return newspaperEditionToEdition(newspaper);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `Failed to fetch edition ${date} from API, falling back to static file:`,
        error,
      );
      const newspaper = await loadEditionByDate(date);
      return newspaperEditionToEdition(newspaper);
    }
    throw error;
  }
}

export async function getEditionByDateNewspaper(date: string): Promise<NewspaperEdition> {
  try {
    return await fetchJson<NewspaperEdition>(`/api/editions/${date}`);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `Failed to fetch newspaper edition ${date} from API, falling back to static file:`,
        error,
      );
      return await loadEditionByDate(date);
    }
    throw error;
  }
}

export async function listEditions(): Promise<EditionSummary[]> {
  await wait(80);
  try {
    return await fetchJson<EditionSummary[]>("/api/editions");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "Failed to fetch edition index from API, falling back to static file:",
        error,
      );
      return await loadEditionSummaries();
    }
    throw error;
  }
}

export async function getArticle(slugOrId: string): Promise<Article | undefined> {
  await wait(60);
  try {
    const response = await fetch(getApiUrl(`/api/articles/${encodeURIComponent(slugOrId)}`));
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Failed to fetch article: ${response.status}`);
    const article = (await response.json()) as NewspaperArticle;
    return adaptArticle(article);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "Failed to fetch article from API, falling back to local loader:",
        error,
      );
      const edition = await loadEdition();
      return edition.articles.find((a) => a.slug === slugOrId || a.id === slugOrId);
    }
    throw error;
  }
}

export async function searchArticles(query: string): Promise<Article[]> {
  await wait(80);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  try {
    const results = await fetchJson<NewspaperArticle[]>(`/api/search?q=${encodeURIComponent(q)}`);
    return results.map(adaptArticle);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "Failed to fetch search from API, falling back to local loader:",
        error,
      );
      const edition = await loadEdition();
      return edition.articles.filter((a) =>
        [a.headline, a.summary, a.source.name, a.category, ...a.tags]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    throw error;
  }
}

export async function markRead(articleId: string): Promise<void> {
  const set = readSet(READ_KEY);
  set.add(articleId);
  writeSet(READ_KEY, set);
}

export async function getSettings(): Promise<Settings> {
  await wait(40);
  if (isServer()) {
    return MOCK_SETTINGS;
  }
  try {
    return await fetchJson<Settings>("/api/settings");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to fetch settings from API, falling back to mock:", error);
      return MOCK_SETTINGS;
    }
    throw error;
  }
}

export async function updateSettings(next: Settings): Promise<Settings> {
  await wait(80);
  if (typeof window !== "undefined") {
    try {
      const response = await fetch(getApiUrl("/api/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error(`Failed to update settings: ${response.status}`);
      return next;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Failed to update settings via API, falling back to mock:", error);
      } else {
        throw error;
      }
    }
  }
  Object.assign(MOCK_SETTINGS, next);
  return MOCK_SETTINGS;
}

export async function listFeeds(): Promise<Feed[]> {
  await wait(40);
  return MOCK_SETTINGS.feeds;
}

export async function testFeed(id: string): Promise<{ ok: boolean; message: string }> {
  await wait(400);
  const feed = MOCK_SETTINGS.feeds.find((f) => f.id === id);
  if (!feed) return { ok: false, message: "Feed not found" };
  return {
    ok: feed.health !== "down",
    message:
      feed.health === "down"
        ? (feed.lastError ?? "Feed unreachable")
        : "Feed reachable; 12 items parsed.",
  };
}

export async function triggerGeneration(): Promise<{ jobId: string }> {
  await wait(150);
  return { jobId: `job-${Date.now()}` };
}
