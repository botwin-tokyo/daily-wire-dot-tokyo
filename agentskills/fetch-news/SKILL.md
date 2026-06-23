---
name: fetch-news
description: Launch Botwin's Daily Wire news fetcher to populate the local SQLite database with fresh articles from all configured sources. Use when the user asks for fresh news, updated articles, a new ingest, or before generating a new edition.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Fetch News

Launch the news aggregation pipeline and populate `backend/db/news.db` with fresh articles.

## When to use

- User asks for fresh news articles.
- User says something like "fetch news", "run the fetcher", "update articles", or "ingest articles".
- Before generating a new edition of the site.

## How to run

Run the following command from the repository root:

```bash
npm run ingest:articles
```

This executes `backend/scripts/compile-to-db.ts`, which:

1. Ensures the Ladder proxy is available.
2. Discovers every `*.ts` fetcher script in `backend/scripts/`.
3. Runs each fetcher sequentially.
4. Normalizes article categories.
5. Inserts unique articles into `backend/db/news.db`.

## Expected output

The script prints a line per source, for example:

```
✅ noaa/weather: 10 fetched, 10 inserted (0 dupes) — 5432ms
```

At the end it prints a summary like:

```
--- Ingest complete ---
Run #N: X ok, 0 missing key, 0 skipped, 0 error
Articles inserted this run: Y
```

## Common issues

- **Ladder not running**: The script will attempt to start Ladder via Docker. If it cannot, fetchers that rely on Ladder may fail.
- **Firecrawl quota exhausted**: Sources that depend on Firecrawl will return 0 articles and be logged as skipped. The pipeline continues and does not crash.
- **No articles inserted**: This usually means all returned articles are duplicates of ones already in the database.
