# The Morning Wire

A personal, AI-curated morning newspaper. Every morning before sunrise, a
fresh edition is generated from configured RSS feeds: stories are
deduplicated, ranked, summarized, and arranged into a broadsheet layout
that loads instantly on desktop, tablet, or e-ink display.

This repository contains the **complete frontend** and a **typed mock API**
that mirrors the production Cloudflare backend contract. The mock layer
lets the UI run end-to-end with realistic data while the Cloudflare
pieces (D1, KV, R2, Cron Worker) are wired in.

## Stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript + Tailwind v4 |
| Routing / SSR | TanStack Start (file-based, Cloudflare Workers-ready) |
| Server state | TanStack Query |
| Validation | Zod |
| Icons | Lucide (used sparingly) |
| Fonts | Playfair Display · Source Serif 4 · Source Sans 3 · JetBrains Mono |
| Deploy target | Cloudflare Workers / Pages |

TanStack Start replaces the original spec's plain Vite + React Router DOM
setup. It runs on the same Cloudflare Workers runtime and exposes
file-based API routes under `src/routes/api/`, so the production
endpoints land in exactly the same place documented below.

## Routes

| Path | Purpose |
|---|---|
| `/` | Today's edition — full broadsheet layout |
| `/article/:slug` | One story: summary, key points, source transparency |
| `/section/:category` | All stories in a section |
| `/editions` | Archive of past editions |
| `/editions/:date` | A historical edition rendered in the same layout |
| `/search?q=` | Search headlines, summaries, sources, tags |
| `/saved` | Bookmarked reading list |
| `/settings` | Personalization, schedule, AI config, feeds |

## Mock data → real backend

All UI calls go through `src/lib/api.ts`. Each function is the typed
equivalent of one Cloudflare Pages Function endpoint:

| Client call | HTTP endpoint |
|---|---|
| `getLatestEdition()` | `GET /api/edition/latest` |
| `listEditions()` | `GET /api/editions` |
| `getEditionByDate(date)` | `GET /api/editions/:date` |
| `getArticle(slug)` | `GET /api/articles/:id` |
| `searchArticles(q)` | `GET /api/search?q=` |
| `getSavedArticles()` | `GET /api/saved` |
| `toggleSaved(id)` | `POST /api/saved/:id` / `DELETE /api/saved/:id` |
| `markRead(id)` | `POST /api/articles/:id/read` |
| `getSettings()` / `updateSettings()` | `GET` / `PUT /api/settings` |
| `listFeeds()` / `testFeed(id)` | `GET /api/feeds` / `POST /api/feeds/:id/test` |
| `triggerGeneration()` | `POST /api/admin/generate` |

To swap to the real backend, replace each function body with a `fetch()`
call. Zod schemas in `src/lib/types.ts` already validate responses.

## Cloudflare backend (scaffold)

The production deployment uses:

- **Workers / Pages Functions** under `src/routes/api/` (TanStack server routes)
- **D1** for persistent structured data (editions, articles, feeds, settings)
- **KV** for the `current_edition` pointer and rate-limit counters
- **R2** (optional) for proxied article images
- **A separate Cron-triggered Worker** for morning edition generation

### `wrangler.toml` example

```toml
name = "morning-wire"
compatibility_date = "2025-05-20"

[[d1_databases]]
binding = "DB"
database_name = "morning-wire"
database_id = "REPLACE_WITH_D1_ID"

[[kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_KV_ID"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "morning-wire-images"

[vars]
AI_PROVIDER = "lovable"
AI_MODEL = "google/gemini-3-flash-preview"

# Secrets: set via `wrangler secret put`
# - LOVABLE_API_KEY
# - ADMIN_TOKEN
```

### Cron Worker (`workers/cron/wrangler.toml`)

```toml
name = "morning-wire-cron"
main = "src/index.ts"
compatibility_date = "2025-05-20"

[triggers]
crons = ["30 5 * * *"]  # 05:30 daily; user-configurable via settings
```

The cron handler runs the generation pipeline as discrete stages:

```
fetch → parse → dedupe → cluster → rank → summarize → validate
      → write briefing → write editor's note → save draft → publish
```

Each stage is reusable and validated with Zod before persistence. The
`current_edition` KV pointer is only flipped after the draft passes
validation, so a failed run never overwrites a good edition.

## D1 schema

See the full schema in `src/lib/types.ts` and the schema notes in
`design.md`. Tables: `editions`, `articles`, `edition_articles`,
`article_key_points`, `sources`, `article_relationships`,
`saved_articles`, `read_articles`, `settings`, `generation_jobs`.

## Environment variables

Create `.dev.vars` (for `wrangler dev`):

```
LOVABLE_API_KEY=...      # AI gateway key, server-only
ADMIN_TOKEN=...          # protects /api/admin/*
```

Public config goes through `import.meta.env.VITE_*`.

## Local development

```bash
bun install
bun dev           # Vite dev server, mock API
```

## Deploying

```bash
bun run build
wrangler deploy   # main app
cd workers/cron && wrangler deploy   # scheduled generator
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