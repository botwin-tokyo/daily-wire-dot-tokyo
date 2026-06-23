---
name: review-rewrite
description: Review each rewritten chunk file in drafts/rewrite_outputs/ for structural completeness, formatting, lowercase categories, clean titles, and duplicate coverage, then correct any issues in place.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.1"
---

# Review Rewrite

Run this skill after `rewrite-articles`. It reads every `.md` file in
`drafts/rewrite_outputs/`, checks every rewritten article, fixes formatting
problems, removes exact duplicates, and bumps importance when multiple sources
are reporting the same topic.

## When to use

- User says "review rewrites", "check chunks", "clean up formatting",
  "remove duplicates", or "fix titles".
- After `rewrite-articles` and before `create-daily`.

## What it checks

For each article in each chunk file:

- **Category heading** is lowercase (e.g., `## world`, not `## World`).
- **Title** exists and is not too short.
- **Title** does not contain markup or symbols such as brackets (`[`, `]`),
  asterisks (`*`), or hashes (`#`).
- **Source** line is present.
- **Original URL** is present and valid.
- **Body** is present and at least 30 words long.
- **Duplicate coverage:** articles with the same URL or same normalized title
  are removed, keeping the first occurrence.
- **Trending topics:** if `4` or more unique articles share a topic tag, the
  importance score of each article covering that topic is bumped by `2`
  (capped at `10`).

## How to run

From the repository root:

```bash
npx tsx agentskills/review-rewrite/review-rewrite.ts
```

## What it does

1. Parses each chunk file in `drafts/rewrite_outputs/` into individual articles,
   reading their `**Importance:**` and `**Topics:**` metadata.
2. Removes exact duplicate articles by URL or normalized title.
3. Counts how many unique articles share each topic tag.
4. Bumps importance for articles covering topics that meet the threshold.
5. Lowercases any title-case category heading.
6. Strips brackets, asterisks, and hashes from titles.
7. Removes articles that are still missing a title, source, valid URL, or body.
8. Rewrites each chunk file in place with the corrected articles.

## Expected output

```text
✅ politics-1of2.md - fixed "Inflation Rose 0.3% in May": lowercased category heading, cleaned title of markup/symbols
❌ politics-1of2.md - removing article: "[BREAKING] Market Crash"
   - title is missing or too short after cleaning
   - body is too short (12 words)

--- Review complete ---
Chunk files reviewed: 19
Articles parsed: 221
Exact duplicates removed: 3
Articles boosted by trending topic: 8
Articles removed for structural issues: 1
Formatting fixes applied: 4
Articles kept: 217
```
