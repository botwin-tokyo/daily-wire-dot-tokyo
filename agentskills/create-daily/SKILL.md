---
name: create-daily
description: Assemble rewritten chunk files from drafts/rewrite_outputs/ into a single drafts/daily.md.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Create Daily

Combine the rewritten chunk files in `drafts/rewrite_outputs/` into one
`drafts/daily.md` file, grouped by lowercase category.

## When to use

- User says "assemble daily", "create daily.md", "merge chunks", or "build
  daily.md".
- After the `rewrite-articles` subagents have written their outputs and before
  `review-rewrite`.

## Prerequisites

- `drafts/rewrite_outputs/` contains one `.md` file per rewritten chunk.
- Each chunk file uses the standard daily.md format with `## category` and
  `### Title` headings.

## How it works

1. Reads every `.md` file in `drafts/rewrite_outputs/`.
2. Parses each file into articles, preserving `**Importance:**` and
   `**Topics:**` metadata.
3. Groups articles by lowercase category.
4. Writes a single `drafts/daily.md` with the neutral-brief header and all
   articles.

## How to run

From the repository root:

```bash
npx tsx agentskills/create-daily/create-daily.ts
```

## Expected output

```text
Parsed 12 articles from business-1of1.md
Parsed 18 articles from politics-1of2.md
Parsed 17 articles from politics-2of2.md
...

--- Create daily complete ---
Chunk files read: 19
Articles assembled: 221
Categories: business, politics, technology, world, ...
Wrote /.../drafts/daily.md
```
