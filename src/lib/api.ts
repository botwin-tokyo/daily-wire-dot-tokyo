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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

const SAVED_KEY = "tmw.saved";
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
    const newspaper = isServer()
      ? await loadCurrentEdition()
      : await fetchJson<NewspaperEdition>("/api/edition/latest");
    return newspaperEditionToEdition(newspaper);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to load current edition from JSON, falling back to mock:", error);
      return MOCK_EDITION;
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
    return isServer()
      ? await loadCurrentEdition()
      : await fetchJson<NewspaperEdition>("/api/edition/latest");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to load current newspaper edition, falling back to mock source:", error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return MOCK_EDITION as any;
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
    const newspaper = isServer()
      ? await loadEditionByDate(date)
      : await fetchJson<NewspaperEdition>(`/api/editions/${date}`);
    return newspaperEditionToEdition(newspaper);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to load edition ${date} from JSON, falling back to mock:`, error);
      return { ...MOCK_EDITION, editionDate: date };
    }
    throw error;
  }
}

export async function getEditionByDateNewspaper(date: string): Promise<NewspaperEdition> {
  try {
    return isServer()
      ? await loadEditionByDate(date)
      : await fetchJson<NewspaperEdition>(`/api/editions/${date}`);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to load newspaper edition ${date}, falling back to mock source:`, error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ...MOCK_EDITION, editionDate: date } as any;
    }
    throw error;
  }
}

export async function listEditions(): Promise<EditionSummary[]> {
  await wait(80);
  try {
    return isServer()
      ? await loadEditionSummaries()
      : await fetchJson<EditionSummary[]>("/api/editions");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to load edition index from JSON, falling back to mock:", error);
      return MOCK_EDITION_SUMMARIES;
    }
    throw error;
  }
}

export async function getArticle(slugOrId: string): Promise<Article | undefined> {
  await wait(60);
  if (isServer()) {
    const edition = await loadEdition();
    return edition.articles.find((a) => a.slug === slugOrId || a.id === slugOrId);
  }
  try {
    const response = await fetch(`/api/articles/${encodeURIComponent(slugOrId)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Failed to fetch article: ${response.status}`);
    const article = (await response.json()) as NewspaperArticle;
    return adaptArticle(article);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to fetch article from API, falling back to local loader:", error);
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
  if (isServer()) {
    const edition = await loadEdition();
    return edition.articles.filter((a) =>
      [a.headline, a.summary, a.source.name, a.category, ...a.tags]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  try {
    const results = await fetchJson<NewspaperArticle[]>(`/api/search?q=${encodeURIComponent(q)}`);
    return results.map(adaptArticle);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to fetch search from API, falling back to local loader:", error);
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

export async function getSavedArticles(): Promise<Article[]> {
  await wait(40);
  if (isServer()) {
    const ids = readSet(SAVED_KEY);
    const edition = await loadEdition();
    return edition.articles.filter((a) => ids.has(a.id));
  }
  try {
    return await fetchJson<Article[]>("/api/saved");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to fetch saved articles from API, falling back to localStorage:", error);
      const ids = readSet(SAVED_KEY);
      const edition = await loadEdition();
      return edition.articles.filter((a) => ids.has(a.id));
    }
    throw error;
  }
}

export async function toggleSaved(articleId: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const current = await fetchJson<Article[]>("/api/saved");
      const isCurrentlySaved = current.some((a) => a.id === articleId);
      const method = isCurrentlySaved ? "DELETE" : "POST";
      const response = await fetch("/api/saved", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (!response.ok) throw new Error(`Failed to toggle saved: ${response.status}`);
      return !isCurrentlySaved;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Failed to toggle saved via API, falling back to localStorage:", error);
      } else {
        throw error;
      }
    }
  }
  const set = readSet(SAVED_KEY);
  if (set.has(articleId)) set.delete(articleId);
  else set.add(articleId);
  writeSet(SAVED_KEY, set);
  return set.has(articleId);
}

export function isSaved(articleId: string): boolean {
  return readSet(SAVED_KEY).has(articleId);
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
      const response = await fetch("/api/settings", {
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
