/**
 * API client layer.
 *
 * All UI calls go through these functions. The default implementation
 * returns mock data so the app is fully functional offline. Replace the
 * bodies with `fetch("/api/...")` calls once the Cloudflare Pages
 * Functions backend is wired up — the signatures are stable.
 *
 * See README.md for the backend contract and migration path.
 */
import {
  MOCK_EDITION,
  MOCK_EDITION_SUMMARIES,
  MOCK_SETTINGS,
} from "./mock-edition";
import type {
  Article,
  Edition,
  EditionSummary,
  Feed,
  Settings,
} from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

export async function getLatestEdition(): Promise<Edition> {
  await wait(120);
  return MOCK_EDITION;
}

export async function getEditionByDate(date: string): Promise<Edition> {
  await wait(120);
  // Mock: always return the same edition with a different date label.
  return { ...MOCK_EDITION, editionDate: date };
}

export async function listEditions(): Promise<EditionSummary[]> {
  await wait(80);
  return MOCK_EDITION_SUMMARIES;
}

export async function getArticle(slugOrId: string): Promise<Article | undefined> {
  await wait(60);
  return MOCK_EDITION.articles.find(
    (a) => a.slug === slugOrId || a.id === slugOrId,
  );
}

export async function searchArticles(query: string): Promise<Article[]> {
  await wait(80);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_EDITION.articles.filter((a) =>
    [a.headline, a.summary, a.source.name, a.category, ...a.tags]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function getSavedArticles(): Promise<Article[]> {
  await wait(40);
  const ids = readSet(SAVED_KEY);
  return MOCK_EDITION.articles.filter((a) => ids.has(a.id));
}

export async function toggleSaved(articleId: string): Promise<boolean> {
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
  return MOCK_SETTINGS;
}

export async function updateSettings(next: Settings): Promise<Settings> {
  await wait(80);
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
  return { ok: feed.health !== "down", message: feed.health === "down" ? feed.lastError ?? "Feed unreachable" : "Feed reachable; 12 items parsed." };
}

export async function triggerGeneration(): Promise<{ jobId: string }> {
  await wait(150);
  return { jobId: `job-${Date.now()}` };
}