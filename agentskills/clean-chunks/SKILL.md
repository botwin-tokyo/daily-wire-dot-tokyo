---
name: clean-chunks
description: Delete leftover rewrite chunk/output directories and the previous day's drafts/daily.md before running rewrite-articles.
license: Proprietary
metadata:
  author: Botwin's Morning Wire
  version: "1.2"
---

# Clean Chunks

Remove stale intermediate files from the previous rewrite pass so the next
`rewrite-articles` run starts fresh.

## When to use

- Immediately after `fetch-news` and immediately before `rewrite-articles`.
- User says "clean chunks", "clear rewrite files", "delete old chunks", or
  "start fresh".

## What it deletes

Only files inside `drafts/` that are produced by the rewrite pipeline:

- `drafts/rewrite_chunks/`
- `drafts/rewrite_outputs/`
- `drafts/rewrite_parts/`
- `drafts/rewrite_repair_outputs/`
- `drafts/rewrite_repairs/`
- `drafts/daily.md`

It does **not** touch `backend/db/news.db`, `backend/db/deprop.db`, or any
edition JSON in `public/data/`.

## How to run

Use your **terminal tool** to execute this exact command from the repository root:

```bash
npx tsx agentskills/clean-chunks/clean-chunks.ts
```

Do not use the Python/code-execution tool. Do not change the command.

## Expected output

```text
--- Clean chunks complete ---
Removed:
  - drafts/rewrite_chunks
  - drafts/rewrite_outputs
  - drafts/rewrite_parts
  - drafts/rewrite_repair_outputs
  - drafts/rewrite_repairs
  - drafts/daily.md
```

If there is nothing to clean, it prints `Nothing to remove.` and exits
successfully.
