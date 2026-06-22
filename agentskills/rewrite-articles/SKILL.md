---
name: rewrite-articles
description: Extract recent articles from the local SQLite news library, rewrite them as neutral, propaganda-free journalism using the project's style guide, and store them in the deprop database.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.1"
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
4. `OPENAI_API_KEY` is set in the environment (used by the bundled script).

## Read this first

Before running the script, read the style guide:

```text
agentskills/rewrite-articles/STYLE.md
```

Every rewrite follows that guide.

## Run the rewrite

```bash
npx tsx agentskills/rewrite-articles/rewrite-articles.ts
```

The script will:

1. Query `backend/db/news.db` for articles with `publishedAt` in the last 24 hours.
2. Skip any article whose `url` is already in `backend/db/deprop.db`.
3. Rewrite the headline, summary, and content using the LLM and `STYLE.md`.
4. Insert the neutralized articles into `deprop.db` under a new run.
5. Print a completion summary.

## Configuration

| Environment variable | Default | Description |
| -------------------- | ------- | ----------- |
| `OPENAI_API_KEY` | — | Required. API key for the LLM. |
| `OPENAI_API_URL` | `https://api.openai.com/v1/chat/completions` | Chat completions endpoint. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use. |
| `REWRITE_BATCH_SIZE` | `50` | Maximum articles to process per run. |

Any OpenAI-compatible API will work if you set `OPENAI_API_URL`.

## What the rewrite does

For each article:

- Removes loaded language, partisan framing, and propaganda.
- Keeps every verifiable fact, number, date, location, and named actor.
- Attributes contested claims and uses inverted-pyramid structure.
- Preserves `category`, `source`, `url`, `publishedAt`, `imageUrl`, `author`,
  and `language`.
- Updates `fetchedAt` to the current ISO timestamp.

## Idempotency

The script skips articles already present in `deprop.db`, so it is safe to run
multiple times without creating duplicate rewrites.

## Expected output

```text
Rewriting 42 articles (3 already in deprop.db)...
✅ [1/42] source/category: Original Headline
...
--- Rewrite complete ---
Run #N: 42 rewritten, 0 errors, 3 pre-existing duplicates
Inserted into deprop.db: 42
```

## Next step

After populating `deprop.db`, generate a site edition:

```bash
npm run generate:edition
```
