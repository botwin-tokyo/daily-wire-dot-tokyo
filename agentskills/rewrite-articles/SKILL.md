---
name: rewrite-articles
description: Feed the last 24 hours of aggregated news to the agent, instruct it to rewrite each article as neutral, propaganda-free copy, and save the result to drafts/daily.md.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.3"
---

# Rewrite Articles

Extract the last 24 hours of articles from `backend/db/news.db`, rewrite each
one as neutral, Pulitzer-grade wire copy, and save the result to
`drafts/daily.md`. This file is temporary and overwritten every day.

## When to use

- User asks for a daily rewrite, de-biased digest, or neutral news brief.
- User says "rewrite today's articles", "make daily.md", or "run rewrite".
- After `npm run ingest:articles` and before generating a new edition.

## Prerequisites

- Working directory is the repository root.
- `backend/db/news.db` exists with recent articles.

## Read this first

Read the style guide before rewriting:

```text
agentskills/rewrite-articles/STYLE.md
```

## Step 1 — Extract articles

Run this query against `backend/db/news.db`:

```sql
SELECT *
FROM articles
WHERE datetime(publishedAt) > datetime('now', '-1 day')
ORDER BY category, publishedAt DESC;
```

If `publishedAt` is unreliable, use `fetchedAt` instead:

```sql
SELECT *
FROM articles
WHERE datetime(fetchedAt) > datetime('now', '-1 day')
ORDER BY category, fetchedAt DESC;
```

## Step 2 — Rewrite every article

For each article:

1. Read the original `title`, `summary`, and `content`.
2. Apply the style guide:
   - Neutral, propaganda-free, non-partisan.
   - Remove loaded language and partisan framing.
   - Keep every verifiable fact, number, date, location, and named actor.
   - Attribute contested claims.
   - Use inverted-pyramid structure.
3. Produce a clean headline and body.

Do not recategorize stories. Preserve the original `category`, `source`, and
`url` for attribution.

## Step 3 — Save to drafts/daily.md

Overwrite `drafts/daily.md` with the rewritten articles. Use this format:

```markdown
# Botwin's Daily Wire — Neutral Brief

Generated: 2026-06-21

---

## World

### [Neutral rewritten headline]

**Source:** original-source-name  
**Original:** [original article URL]

Neutral rewritten article body. Follows the style guide. Factual, attributed,
and free of propaganda.

---

## Politics

### [Neutral rewritten headline]

**Source:** original-source-name  
**Original:** [original article URL]

Neutral rewritten article body.
```

Group articles under their original category headings. If a category has no
articles, omit it.

## Rules

- Overwrite `drafts/daily.md`; do not append.
- Do not commit `drafts/daily.md`.
- Keep the original URLs so a human can verify the source.
- If the source material is already neutral, still review it against the style
guide before including it.

## Next step

After `drafts/daily.md` is ready, generate the site edition:

```bash
npm run generate:edition
```
