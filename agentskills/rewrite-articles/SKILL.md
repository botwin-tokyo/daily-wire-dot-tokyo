---
name: rewrite-articles
description: Extract recent articles from the local SQLite news library, rewrite them as neutral, propaganda-free journalism using the project's style guide, and store them in the deprop database.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Rewrite Articles

Extract articles published in the last 24 hours from `backend/db/news.db`,
rewrite each into neutral, Pulitzer-grade wire copy, and save the results to
`backend/db/deprop.db`.

## When to use

- User asks to rewrite, de-bias, or neutralize recent articles.
- User says "run rewrite", "populate deprop", "deprop articles", or
  "clean the news library".
- After running `npm run ingest:articles` and before generating a new edition.

## Prerequisites

1. The working directory is the repository root.
2. `backend/db/news.db` exists and contains recent articles.
3. `backend/db/deprop.db` will be created automatically from
   `backend/db/deprop.db.template` if it is missing.

## Read this first

Before writing or rewriting anything, read the style guide:

```text
agentskills/rewrite-articles/STYLE.md
```

The rewrite must follow every rule in that file.

## What to extract

Query `backend/db/news.db` for articles with `publishedAt` within the last 24
hours. Use a query like:

```sql
SELECT *
FROM articles
WHERE datetime(publishedAt) > datetime('now', '-1 day')
ORDER BY publishedAt DESC;
```

If `publishedAt` is unreliable for a source, fall back to `fetchedAt`:

```sql
SELECT *
FROM articles
WHERE datetime(fetchedAt) > datetime('now', '-1 day')
ORDER BY fetchedAt DESC;
```

Deduplicate by `url` before rewriting.

## How to rewrite each article

For each article:

1. Read the original `title`, `summary`, and `content`.
2. Rewrite the headline and body using the style guide.
3. Strip loaded language, partisan framing, and propaganda.
4. Keep every verifiable fact, number, date, location, and named actor.
5. Attribute contested claims. Use inverted-pyramid structure.
6. Preserve the original `category`, `source`, `url`, `publishedAt`,
   `imageUrl`, `author`, and `language`.
7. Set `fetchedAt` to the current ISO timestamp.

The rewritten article must stand on its own as a factual news item.

## How to populate deprop.db

The deprop database shares the same schema as the main news database:

- `runs`
- `articles`

Use the helper modules in `backend/scripts/lib/`:

- `openDepropDb()` opens (and auto-creates from template) `backend/db/deprop.db`.
- `initSchema()` ensures the schema is current.
- `startRun()` and `finishRun()` track the rewrite batch in the `runs` table.
- `insertArticles()` inserts the rewritten rows.

### Example script

Create or run a script like `backend/scripts/rewrite-articles.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import { openDb, initSchema, startRun, finishRun, insertArticles } from "./lib/db";
import { openDepropDb } from "./lib/deprop-db";

async function main() {
  const sourceDb = openDb();
  initSchema(sourceDb);

  const rows = sourceDb
    .prepare(`
      SELECT DISTINCT *
      FROM articles
      WHERE datetime(publishedAt) > datetime('now', '-1 day')
      ORDER BY publishedAt DESC
    `)
    .all() as any[];

  const depropDb = openDepropDb();
  initSchema(depropDb);
  const runId = startRun(depropDb);

  const rewrites = [];
  for (const row of rows) {
    const rewrittenTitle = await neutralizeHeadline(row.title, row);
    const rewrittenSummary = await neutralizeText(row.summary ?? "", row);
    const rewrittenContent = await neutralizeText(row.content ?? "", row);

    rewrites.push({
      source: row.source,
      category: row.category,
      title: rewrittenTitle,
      url: row.url,
      summary: rewrittenSummary,
      content: rewrittenContent,
      publishedAt: row.publishedAt,
      imageUrl: row.imageUrl,
      author: row.author,
      language: row.language,
      fetchedAt: new Date().toISOString(),
    });
  }

  const { inserted, duplicates } = insertArticles(depropDb, runId, rewrites);
  finishRun(depropDb, runId, {
    total: rows.length,
    ok: inserted,
    missingKey: 0,
    skipped: duplicates,
    error: rows.length - inserted - duplicates,
  });

  console.log(`Rewrote ${inserted} articles into deprop.db (${duplicates} duplicates skipped).`);
  sourceDb.close();
  depropDb.close();
}

async function neutralizeHeadline(title: string, article: any): Promise<string> {
  // Rewrite the headline according to STYLE.md.
  return title; // replace with LLM call or agentic rewrite
}

async function neutralizeText(text: string, article: any): Promise<string> {
  // Rewrite the text according to STYLE.md.
  return text; // replace with LLM call or agentic rewrite
}

main();
```

Run it with:

```bash
npx tsx backend/scripts/rewrite-articles.ts
```

If you prefer, you can do the rewrites manually with your own model and insert
the rows through a short SQL script instead.

## Idempotency

`insertArticles` uses `INSERT OR IGNORE` keyed by `(runId, url)`. To avoid
duplicate rewrites across runs, query `deprop.db` first and skip any article
whose `url` already exists there.

## Expected output

- A new run row in `deprop.db`.
- One rewritten article row per original article.
- Console summary like:

```text
Rewrote 42 articles into deprop.db (3 duplicates skipped).
```

## Next step

After populating `deprop.db`, generate a site edition:

```bash
npm run generate:edition
```

This writes `public/data/current-edition.json` from the latest articles.
