---
name: publish-pipeline
description: Run the full post-rewrite pipeline (review-rewrite, create-daily, populate-depropdb, publish-dailywire) sequentially as one orchestrated step. Use after rewrite-articles has finished and before reading the published edition.
license: Proprietary
metadata:
  author: Botwin's Morning Wire
  version: "1.0"
---

# Publish Pipeline

Run the entire downstream pipeline in one shot: review the rewritten chunks,
create the daily digest, persist articles to the deprop database, and publish
the frontend edition JSON.

## When to use

- User asks to publish the daily edition, run the post-rewrite pipeline, or
  finalize the edition.
- User says "publish", "run publish pipeline", "build edition", or
  "/publish-pipeline".
- After `chunk-articles` has triggered `rewrite-articles` and the rewrite log
  shows `--- Rewrite articles complete ---`.

## Prerequisites

- Working directory is the repository root.
- `drafts/rewrite_outputs/` contains the rewritten chunk files.
- The previous pipeline step (`rewrite-articles`) has finished successfully.

## How to run

Use your **terminal tool** to execute this exact command from the repository root:

```bash
npx tsx agentskills/publish-pipeline/publish-pipeline.ts
```

Do not use the Python/code-execution tool. Do not change the command. Run it
exactly as shown.

The orchestrator runs these scripts in order:

1. `agentskills/review-rewrite/review-rewrite.ts`
2. `agentskills/create-daily/create-daily.ts`
3. `agentskills/populate-depropdb/populate-depropdb.ts`
4. `agentskills/publish-dailywire/publish-dailywire.ts`

If any step fails, the pipeline stops and reports which step failed.

## Expected output

Live progress is written to the terminal and to `logs/publish-pipeline.log`:

```text
=== Publish pipeline started ===
Steps: review-rewrite → create-daily → populate-depropdb → publish-dailywire
▶ Starting review-rewrite: /.../agentskills/review-rewrite/review-rewrite.ts
[review-rewrite] --- Review complete ---
[review-rewrite] Articles kept: 142
✅ review-rewrite completed
▶ Starting create-daily: /.../agentskills/create-daily/create-daily.ts
[create-daily] Wrote /.../drafts/daily.md
✅ create-daily completed
▶ Starting populate-depropdb: /.../agentskills/populate-depropdb/populate-depropdb.ts
[populate-depropdb] Inserted: 142
✅ populate-depropdb completed
▶ Starting publish-dailywire: /.../agentskills/publish-dailywire/publish-dailywire.ts
[publish-dailywire] Wrote 142 articles to /.../public/data/current-edition.json
✅ publish-dailywire completed
=== Publish pipeline finished in 45.2s ===
```

## Rules

- Do not run this until `rewrite-articles` has completed.
- Do not commit `drafts/daily.md`, `drafts/rewrite_outputs/`, or
  `public/data/current-edition.json` without checking them first.
- If a step fails, fix the underlying script and rerun the pipeline.
