/**
 * Local SQLite database for aggregated news articles.
 *
 * Uses Node's built-in `node:sqlite` module, so no extra native dependency is
 * required. The database file lives at `backend/db/news.db` and is gitignored.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface ArticleInput {
  runId: number;
  source: string;
  category: string;
  title: string;
  url: string;
  summary?: string;
  content?: string;
  publishedAt?: string;
  imageUrl?: string;
  author?: string;
  language?: string;
  fetchedAt: string;
}

export interface ArticleRow extends ArticleInput {
  id: number;
  createdAt: string;
}

export interface RunSummary {
  total: number;
  ok: number;
  missingKey: number;
  skipped: number;
  error: number;
}

const DEFAULT_DB_PATH = resolve(process.cwd(), "backend/db/news.db");
const DEFAULT_TEMPLATE_PATH = resolve(process.cwd(), "backend/db/news.db.template");

export function ensureDbFromTemplate(path: string, templatePath: string): void {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path) && existsSync(templatePath)) {
    copyFileSync(templatePath, path);
  }
}

export function openDb(path = DEFAULT_DB_PATH): DatabaseSync {
  ensureDbFromTemplate(path, DEFAULT_TEMPLATE_PATH);
  return new DatabaseSync(path);
}

export function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      startedAt TEXT NOT NULL,
      finishedAt TEXT,
      totalScripts INTEGER,
      okScripts INTEGER,
      missingKeyScripts INTEGER,
      skippedScripts INTEGER,
      errorScripts INTEGER
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      publishedAt TEXT,
      imageUrl TEXT,
      author TEXT,
      language TEXT,
      fetchedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (runId) REFERENCES runs(id) ON DELETE CASCADE,
      UNIQUE(runId, url)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_runId ON articles(runId);
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_publishedAt ON articles(publishedAt);
  `);

  // Migrate existing databases that were created before the content column.
  try {
    db.exec("ALTER TABLE articles ADD COLUMN content TEXT;");
  } catch {
    // Column already exists; ignore.
  }

  // Migrate existing databases that were created before the skippedScripts column.
  try {
    db.exec("ALTER TABLE runs ADD COLUMN skippedScripts INTEGER;");
  } catch {
    // Column already exists; ignore.
  }
}

export function startRun(db: DatabaseSync): number {
  const stmt = db.prepare("INSERT INTO runs (startedAt) VALUES (datetime('now')) RETURNING id");
  const row = stmt.get() as { id: number };
  return row.id;
}

export function finishRun(db: DatabaseSync, runId: number, summary: RunSummary): void {
  const stmt = db.prepare(`
    UPDATE runs
    SET finishedAt = datetime('now'),
        totalScripts = ?, okScripts = ?, missingKeyScripts = ?, skippedScripts = ?, errorScripts = ?
    WHERE id = ?
  `);
  stmt.run(summary.total, summary.ok, summary.missingKey, summary.skipped, summary.error, runId);
}

export function insertArticles(
  db: DatabaseSync,
  runId: number,
  articles: Omit<ArticleInput, "runId">[],
): { inserted: number; duplicates: number } {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO articles
      (runId, source, category, title, url, summary, content, publishedAt, imageUrl, author, language, fetchedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let attempted = 0;
  let inserted = 0;
  const changesStmt = db.prepare("SELECT changes() as c");

  for (const article of articles) {
    attempted++;
    stmt.run(
      runId,
      article.source,
      article.category,
      article.title,
      article.url,
      article.summary ?? null,
      article.content ?? null,
      article.publishedAt ?? null,
      article.imageUrl ?? null,
      article.author ?? null,
      article.language ?? null,
      article.fetchedAt,
    );
    const changeRow = changesStmt.get() as { c: number };
    inserted += changeRow.c;
  }

  return { inserted, duplicates: attempted - inserted };
}

export function getArticlesByRun(db: DatabaseSync, runId: number, limit = 1000): ArticleRow[] {
  const stmt = db.prepare(`
    SELECT * FROM articles WHERE runId = ? ORDER BY publishedAt DESC LIMIT ?
  `);
  return stmt.all(runId, limit) as unknown as ArticleRow[];
}

export function getLatestRunId(db: DatabaseSync): number | undefined {
  const stmt = db.prepare(
    "SELECT id FROM runs WHERE finishedAt IS NOT NULL ORDER BY id DESC LIMIT 1",
  );
  const row = stmt.get() as { id: number } | undefined;
  return row?.id;
}

export function getLatestArticles(
  db: DatabaseSync,
  limit = 100,
  options: { source?: string; category?: string } = {},
): ArticleRow[] {
  const latestRunId = getLatestRunId(db);
  if (!latestRunId) return [];

  const filters: string[] = ["runId = ?"];
  const params: (string | number)[] = [latestRunId];

  if (options.source) {
    filters.push("source = ?");
    params.push(options.source);
  }
  if (options.category) {
    filters.push("category = ?");
    params.push(options.category);
  }

  const stmt = db.prepare(`
    SELECT * FROM articles
    WHERE ${filters.join(" AND ")}
    ORDER BY publishedAt DESC
    LIMIT ?
  `);
  return stmt.all(...params, limit) as unknown as ArticleRow[];
}

export function getRunStats(db: DatabaseSync): {
  runCount: number;
  articleCount: number;
} {
  const runs = db.prepare("SELECT COUNT(*) as c FROM runs").get() as {
    c: number;
  };
  const articles = db.prepare("SELECT COUNT(*) as c FROM articles").get() as {
    c: number;
  };
  return { runCount: runs.c, articleCount: articles.c };
}
