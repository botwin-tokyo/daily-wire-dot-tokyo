---
name: publish-dailywire
description: Generate a valid NewspaperEdition JSON from the rewritten articles stored in backend/db/deprop.db and write it to public/data/current-edition.json.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Publish Daily Wire

Generate the site's edition JSON from the neutralized articles in
`backend/db/deprop.db`.

## When to use

- User says "publish", "generate edition", "make the edition", or
  "create current-edition.json".
- After `deprop.db` has been populated by the `populate-depropdb` skill.

## Prerequisites

- Working directory is the repository root.
- `backend/db/deprop.db` contains rewritten articles from the latest populate run.
- `backend/db/deprop.db` will be created from the template if missing, but it
  will be empty until populated.

## How to run

```bash
npx tsx agentskills/publish-dailywire/publish-dailywire.ts
```

## What the script does

1. Reads every article in `deprop.db` from the latest populate run, sorted by
   `importance` descending.
2. Builds valid `Article`, `Section`, and `Navigation` objects.
3. Picks the highest-importance article as the lead story.
4. Runs the edition through `validateNewspaperEdition` and
   `validateBusinessRules`.
5. Writes:
   - `public/data/current-edition.json`
   - `public/data/editions/{YYYY-MM-DD}.json`
   - `public/data/editions/index.json`

## Expected output

```text
Wrote 42 articles to /.../public/data/current-edition.json
Wrote archive to /.../public/data/editions/2026-06-21.json
Wrote index to /.../public/data/editions/index.json
```

## Troubleshooting

- **"No rewritten articles found"**: `deprop.db` is empty. Run
  `rewrite-articles` to create `drafts/daily.md`, then run
  `populate-depropdb` to fill the database.
- **Validation failed**: The script prints the exact schema or business-rule
  errors. Fix the underlying article data and re-run.
