---
name: chunk-articles
description: Split the last 24 hours of fetched articles into manageable markdown chunks ready for the rewrite-articles skill.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Chunk Articles

Run this skill after `fetch-news` and before `rewrite-articles`. It reads
`backend/db/news.db`, groups the last 24 hours of articles by category, splits
them into manageable chunks, and writes each chunk as a markdown file in
`drafts/rewrite_chunks/`.

## When to use

- User says "chunk articles", "make rewrite chunks", "split articles for
  rewrite", or "prepare rewrite batches".
- Right after `fetch-news` and before `rewrite-articles`.

## What it does

1. Reads articles from the **latest fetch run** in `backend/db/news.db`.
2. Skips any article whose URL already exists in `backend/db/deprop.db` so
   nothing gets rewritten twice.
3. Groups articles by lowercase category.
4. Splits each category into chunks of no more than 10 articles or ~8,000 words.
5. Writes one markdown file per chunk to `drafts/rewrite_chunks/`.

## How to run

From the repository root:

```bash
npx tsx agentskills/chunk-articles/chunk-articles.ts
```

## Expected output

```text
--- Chunk articles complete ---
Articles from latest fetch run: 37
Chunks written: 7
Output: /.../drafts/rewrite_chunks
  world: 2 chunk(s)
  politics: 1 chunk(s)
  technology: 2 chunk(s)
  business: 1 chunk(s)
  science: 1 chunk(s)
```

## Output format

Each chunk file is named `{category}-{n}of{m}.md` and contains the raw article
metadata and content for every article in that chunk:

```markdown
# Chunk 1 of 2 — world

## Article 1: Original Headline Here

- **Source:** example-source
- **Category:** world
- **URL:** https://example.com/article
- **Published:** 2026-06-23T08:00:00Z

**Summary:** Short summary of the article.

**Content:**

Full original article content...

---
```
