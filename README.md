# The Morning Wire

A personal, AI-curated morning newspaper. Editions are published as
plain JSON on your machine, validated, committed, and pushed to
Cloudflare Pages. The frontend reads that JSON and renders a broadsheet
layout that loads instantly on desktop, tablet, or e-ink display.

This repository contains the **complete frontend**, a **validation CLI**,
and a **local Publishing Agent**. No Cloudflare Cron Worker is used —
generation and publishing happen on your machine and flow into the site
through git.

## Stack

| Layer         | Choice                                                             |
| ------------- | ------------------------------------------------------------------ |
| UI            | React 19 + TypeScript + Tailwind v4                                |
| Routing / SSR | TanStack Start (file-based, Cloudflare Workers-ready)              |
| Server state  | TanStack Query                                                     |
| Validation    | Zod                                                                |
| Icons         | Lucide (used sparingly)                                            |
| Fonts         | Playfair Display · Source Serif 4 · Source Sans 3 · JetBrains Mono |
| Deploy target | Cloudflare Pages                                                   |

TanStack Start replaces the original spec's plain Vite + React Router DOM
setup. It runs on the same Cloudflare Workers runtime and exposes
file-based API routes under `src/routes/api/`, so the production
endpoints land in exactly the same place documented below.

## Routes

| Path                 | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `/`                  | Today's edition — full broadsheet layout            |
| `/article/:slug`     | One story: summary, key points, source transparency |
| `/section/:category` | All stories in a section                            |
| `/editions`          | Archive of past editions                            |
| `/editions/:date`    | A historical edition rendered in the same layout    |
| `/search?q=`         | Search headlines, summaries, sources, tags          |
| `/saved`             | Bookmarked reading list                             |
| `/settings`          | Personalization, schedule, AI config, feeds         |

## Mock data → real backend

All UI calls go through `src/lib/api.ts`. Each function is the typed
equivalent of one Cloudflare Pages Function endpoint:

| Client call                          | HTTP endpoint                                   |
| ------------------------------------ | ----------------------------------------------- |
| `getLatestEdition()`                 | `GET /api/edition/latest`                       |
| `listEditions()`                     | `GET /api/editions`                             |
| `getEditionByDate(date)`             | `GET /api/editions/:date`                       |
| `getArticle(slug)`                   | `GET /api/articles/:id`                         |
| `searchArticles(q)`                  | `GET /api/search?q=`                            |
| `getSavedArticles()`                 | `GET /api/saved`                                |
| `toggleSaved(id)`                    | `POST /api/saved/:id` / `DELETE /api/saved/:id` |
| `markRead(id)`                       | `POST /api/articles/:id/read`                   |
| `getSettings()` / `updateSettings()` | `GET` / `PUT /api/settings`                     |
| `listFeeds()` / `testFeed(id)`       | `GET /api/feeds` / `POST /api/feeds/:id/test`   |
| `triggerGeneration()`                | `POST /api/admin/generate`                      |

To swap to the real backend, replace each function body with a `fetch()`
call. Zod schemas in `src/lib/types.ts` already validate responses.

## Cloudflare backend (scaffold)

The production deployment uses:

- **Cloudflare Pages** for hosting the built site.
- **Pages Functions** under `src/routes/api/` for dynamic API routes.
- **D1** (optional) for persistent structured data (saved articles, settings, feeds).
- **KV** for rate-limit counters and admin metadata.
- **R2** (optional) for proxied article images.

Generation and publishing run on your machine, not on Cloudflare. The site
updates when you push a new `public/data/current-edition.json` to git and
Cloudflare Pages rebuilds.

### `wrangler.toml`

The root `wrangler.toml` configures the Pages project. Replace placeholder
IDs with real values from your Cloudflare dashboard.

```toml
name = "morning-wire"
compatibility_date = "2025-06-19"
pages_build_output_dir = ".output/public"

[[kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_KV_NAMESPACE_ID"

[[d1_databases]]
binding = "DB"
database_name = "morning-wire"
database_id = "REPLACE_WITH_D1_DATABASE_ID"

[vars]
EDITION_SCHEMA_VERSION = "1.0.0"
SITE_URL = "https://morning-wire.pages.dev"

# Secrets: set via `wrangler secret put` or the Cloudflare dashboard:
# - ADMIN_TOKEN
```

## Draft templates

Two ready-made JSON files show the exact shape of an edition:

- `drafts/template-edition.json` — a minimal, schema-valid skeleton with placeholder text. Copy it and fill in your content.
- `examples/example-edition.json` — a full, realistic edition with 18 articles, markets, weather, and all sections.

Validate any draft before publishing:

```bash
npm run validate:edition -- drafts/my-draft.json
```

## Publishing an edition

Put your draft edition JSON somewhere (for example `drafts/2025-05-21.json`)
and run the Publishing Agent:

```bash
npm run publish:edition -- --draft drafts/2025-05-21.json --date 2025-05-21
```

This will:

1. Validate the draft against the schema and business rules.
2. Copy it to `public/data/editions/2025-05-21.json`.
3. Overwrite `public/data/current-edition.json`.
4. Run lint, typecheck, tests, and build.
5. Commit and push.
6. Poll Cloudflare Pages for deployment success (if `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID` are set).

Use `--dry-run` to see what it would do without touching anything.

## Rolling back

To restore a previous edition:

```bash
npm run rollback:edition -- --date 2025-05-20 --verify
```

This copies the archive back to `current-edition.json`, runs all checks,
commits as `edition(rollback): 2025-05-20 (#...)`, and pushes.

## Scheduling the local agent

Since generation runs locally, schedule it however you want on your machine:

```bash
# Example cron entry that runs every day at 5:30 AM
30 5 * * * cd /Users/ryokobotwin/Desktop/newsapp/the-daily-ledger && npm run publish:edition -- --draft drafts/$(date +\%Y-\%m-\%d).json --date $(date +\%Y-\%m-\%d)
```

Or trigger it from a calendar node, Hazel rule, or any local scheduler.

## D1 schema

See the full schema in `src/lib/types.ts` and the schema notes in
`design.md`. Tables: `saved_articles`, `read_articles`, `settings`,
`feeds`.

## Environment variables

Create `.dev.vars` (for `wrangler dev`):

```
LOVABLE_API_KEY=...      # AI gateway key, server-only
ADMIN_TOKEN=...          # protects /api/admin/*
```

Public config goes through `import.meta.env.VITE_*`.

## Local development

```bash
npm install
npm run dev       # Vite dev server, reads public/data/current-edition.json
```

## Deploying

Pushing to `main` triggers the GitHub Action in `.github/workflows/deploy.yml`.

Or deploy manually:

```bash
npm run build
npm run deploy
```

## Design

The visual language is derived directly from the broadsheet reference and
`design.md`. Tokens live in `src/styles.css`:

- Warm newsprint `--paper` (#F5F0E8) instead of pure white
- Charcoal `--ink` (#1A1A1A) instead of pure black (e-ink friendly)
- Color used **only** as semantic signal: `--accent-red` for top-story
  eyebrows, `--accent-gold` for AI editor markers, `--positive` /
  `--negative` for market data, `--live-dot` for edition status
- `Playfair Display` for the masthead and headlines; `Source Serif 4` for
  reading copy; `Source Sans 3` for UI; `JetBrains Mono` for market and
  timestamp data
- All images are rendered with a `grayscale(100%)` filter

## Safety

- We **never** reproduce full original article text. Only AI summaries,
  short excerpts, metadata, and links to the original publisher are
  displayed.
- AI-generated content is clearly labeled.
- API keys are server-side only; the browser only sees whether a provider
  is configured.
- Feed text is sanitized; admin mutation endpoints are protected by
  `ADMIN_TOKEN` (swap for Cloudflare Access in production).
