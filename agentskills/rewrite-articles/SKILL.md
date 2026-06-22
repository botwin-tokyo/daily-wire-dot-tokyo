---
name: rewrite-articles
description: Extract recent articles from the local SQLite news library, manually rewrite them as neutral, propaganda-free journalism, and populate the deprop database using the bundled insertion script.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.2"
---

# Rewrite Articles

Extract articles from the last 24 hours in `backend/db/news.db`, manually rewrite
each one into neutral, Pulitzer-grade wire copy, and use the bundled script to
save them into `backend/db/deprop.db`.

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

Before rewriting anything, read the style guide:

```text
agentskills/rewrite-articles/STYLE.md
```

Every rewrite must follow that guide.

## Step 1 — Extract articles

Query `backend/db/news.db` for articles published in the last 24 hours:

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

You can run the query with `sqlite3`, a GUI tool, or a short Node script.

## Step 2 — Rewrite each article

For each article:

1. Read the original `title`, `summary`, and `content`.
2. Rewrite the headline and body using the style guide.
3. Strip loaded language, partisan framing, and propaganda.
4. Keep every verifiable fact, number, date, location, and named actor.
5. Attribute contested claims. Use inverted-pyramid structure.
6. Preserve `category`, `source`, `url`, `publishedAt`, `imageUrl`, `author`,
   and `language`.
7. Set `fetchedAt` to the current ISO timestamp.

The rewritten article must stand on its own as a factual news item.

## Step 3 — Save rewrites as JSON

Save the rewritten articles to one or more JSON files. Each file can contain
either a single article object or an array of article objects.

Example `drafts/rewrites/2026-06-21.json`:

```json
[
  {
    "source": "noaa",
    "category": "weather",
    "title": "Severe Thunderstorms Expected Across the Midwest",
    "url": "https://www.weather.gov/...",
    "summary": "The National Weather Service issued severe thunderstorm watches for parts of Iowa, Illinois, and Missouri on Saturday.",
    "content": "The National Weather Service issued severe thunderstorm watches for parts of Iowa, Illinois, and Missouri on Saturday. Forecasters said damaging winds and large hail were the primary hazards, with isolated tornadoes possible. The watches remain in effect until 9 p.m. local time. Residents were advised to monitor local warnings and seek shelter indoors during storms.",
    "publishedAt": "2026-06-21T14:00:00Z",
    "imageUrl": null,
    "author": null,
    "language": "en",
    "fetchedAt": "2026-06-21T20:00:00Z"
  }
]
```

## Step 4 — Populate deprop.db

Run the insertion script with your JSON file(s):

```bash
npx tsx agentskills/rewrite-articles/populate-deprop.ts drafts/rewrites/2026-06-21.json
```

The script will:

- Open `backend/db/deprop.db` (creating it from the template if needed).
- Validate every article against the expected schema.
- Skip any article whose `url` is already in `deprop.db`.
- Insert the rest under a new run and print a summary.

## Idempotency

The script skips duplicate URLs, so it is safe to run it multiple times.

## Expected output

```text
--- Populate complete ---
Run #N
Loaded from JSON: 42
Skipped (already in DB or duplicate): 3
Inserted: 39
```

## Next step

After populating `deprop.db`, generate a site edition:

```bash
npm run generate:edition
```
