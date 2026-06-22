---
name: populate-depropdb
description: Parse the agent-written drafts/daily.md file and insert the rewritten articles into backend/db/deprop.db.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "1.0"
---

# Populate Deprop DB

After the `rewrite-articles` skill has produced `drafts/daily.md`, run this skill
to parse that file and insert the rewritten articles into `backend/db/deprop.db`.

## When to use

- User says "populate deprop", "fill deprop db", "save rewrites to deprop", or
  "store daily.md in the database".
- After `drafts/daily.md` has been created or updated.

## Prerequisites

- Working directory is the repository root.
- `drafts/daily.md` exists and follows the format produced by the
  `rewrite-articles` skill.
- `backend/db/deprop.db` will be created automatically from
  `backend/db/deprop.db.template` if it is missing.

## How to run

```bash
npx tsx agentskills/populate-depropdb/populate-depropdb.ts
```

The script reads `drafts/daily.md` by default. To point it at a different file:

```bash
npx tsx agentskills/populate-depropdb/populate-depropdb.ts path/to/other-daily.md
```

## What the script does

1. Parses `drafts/daily.md` for category headings (`## Category`) and article
   headings (`### Title`).
2. Extracts the source name and original URL from the `**Source:**` and
   `**Original:**` metadata lines.
3. Collects the article body as the `content` field.
4. Validates every article before touching the database.
5. Skips any article whose URL is already in `deprop.db`.
6. Inserts the rest under a new run and prints a summary.

## Expected daily.md format

The script expects the same format the `rewrite-articles` skill writes:

```markdown
# Botwin's Daily Wire — Neutral Brief

Generated: 2026-06-21

---

## World

### [Neutral rewritten headline]

**Source:** original-source-name  
**Original:** [original article URL]

Neutral rewritten article body.

---

## Politics

### [Neutral rewritten headline]

**Source:** original-source-name  
**Original:** [original article URL]

Neutral rewritten article body.
```

## Idempotency

Articles are matched by URL. Running the script twice on the same `daily.md`
will not create duplicates.

## Expected output

```text
--- Populate complete ---
Run #N
Parsed from daily.md: 42
Already in DB: 0
Inserted: 42
```

## Troubleshooting

- **"No articles found"**: The markdown headings do not match the expected
  format. Make sure categories are `## Heading` and article titles are
  `### Heading`.
- **Validation error**: An article is missing a title, URL, or body. Review the
  file and re-run.
- **Already in DB**: The script skipped a URL because it exists in
  `deprop.db`. This is normal and safe.
