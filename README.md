# Botwin's Daily Wire

A self-hosted, AI-assisted daily newspaper. It ingests news from public RSS feeds,
APIs, and publisher pages; rewrites stories into neutral, wire-style copy;
validates every rewrite; stores the results; and publishes a ranked edition as
static JSON that a TanStack Start frontend renders as a broadsheet-style page.

The pipeline is designed to run on your own machine, with Cloudflare handling
hosting and optional long-term archive storage.

> **Naming note:** the repository folder is `the-daily-ledger`, the skill docs
> call the product **Botwin's Daily Wire**, and several legacy assets still say
> **Botwin's Morning Wire**. This README uses **Daily Wire**; you may want to
> consolidate the naming in a future pass.

---

## What it does

1. **Fetch** — pull today's news from configured sources into a local SQLite
   database (`backend/db/news.db`).
2. **Clean** — remove leftover chunk and rewrite files from the previous run.
3. **Chunk** — split the latest fetch into category chunk files.
4. **Rewrite** — rewrite each article as neutral, factual wire copy via a local
   LLM, one article at a time.
5. **Validate** — check every rewrite for chain-of-thought, raw JSON, empty
   content, or second-person advice. Invalid rewrites are queued for a separate
   retry phase (`retry-invalid.ts`) that rewrites each one with a warning and
   either recovers it to the chunk output or quarantines it.
6. **Review** — remove duplicates, boost trending topics, and fix formatting.
7. **Assemble** — merge reviewed articles into `drafts/daily.md`.
8. **Populate** — insert the articles into `backend/db/deprop.db`.
9. **Publish** — generate a schema-valid edition JSON, pick a lead story, write
   `public/data/current-edition.json`, and optionally archive to Cloudflare D1.

The frontend then renders the edition, section pages, individual articles,
search, and an archive view.

---

## Architecture

The system has three layers:

- **Hermes skills** — four slash commands that start each phase.
- **Direct TypeScript scripts** — deterministic or LLM-backed scripts that the
  skills run internally.
- **TanStack Start frontend** — broadsheet UI and API routes.

### Hermes skills (slash commands)

| Skill | Purpose |
|-------|---------|
| `fetch-news` | Run the ingest pipeline (`npm run ingest:articles`). |
| `clean-chunks` | Delete leftover chunk/rewrite files. |
| `chunk-articles` | Split the latest fetch into chunks and auto-spawn `rewrite-articles`. |
| `publish-pipeline` | Orchestrate `review-rewrite` → `create-daily` → `populate-depropdb` → `publish-dailywire`. |

These skills are invoked through Hermes. The production scheduler currently
uses a Cloudflare webhook as the transport to reach Hermes, but the skills
themselves are Hermes slash commands, not webhook endpoints.

### Internal scripts

| Script | Purpose |
|--------|---------|
| `rewrite-articles` | Direct-LLM rewriter; validates each rewrite and queues failures for retry. |
| `retry-invalid` | Retry phase for failed validations: warning-prompt rewrite, validate, recover or quarantine. |
| `review-rewrite` | Deduplicate, boost trending topics, fix formatting. |
| `create-daily` | Assemble `drafts/daily.md`. |
| `populate-depropdb` | Parse `daily.md` and insert into `deprop.db`. |
| `publish-dailywire` | Build and validate `current-edition.json`; archive to D1 if configured. |

### Data flow

```text
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
│  fetch-news │ → │ clean-chunks│ → │chunk-articles│ → │ rewrite-articles │
└─────────────┘   └─────────────┘   └─────────────┘   └──────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────┐
                                                   │ validate + queue │
                                                   │ invalid rewrites │
                                                   └──────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────┐
                                                   │  retry-invalid   │
                                                   │ recover /        │
                                                   │ quarantine       │
                                                   └──────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────┐
                                                   │ publish-pipeline │
                                                   │ review → create  │
                                                   │ populate → publish│
                                                   └──────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────┐
                                                   │ current-edition  │
                                                   │      .json       │
                                                   └──────────────────┘
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19 · TypeScript 5.8 · Tailwind CSS v4 |
| Framework / SSR | TanStack Start with file-based routing |
| Router | `@tanstack/react-router` |
| Build | Vite 8 + Nitro Cloudflare Pages preset |
| Validation | Zod |
| Local data | SQLite via Node's built-in `node:sqlite` |
| Archive data | Cloudflare D1 (optional) |
| Server cache / rate limit | Cloudflare KV (optional) |
| Icons | Lucide React |
| Fonts | Playfair Display · Source Serif 4 · Source Sans 3 · JetBrains Mono |
| Text wrapping / fitting | [`@chenglou/pretext`](https://github.com/chenglou/pretext) |
| Deploy target | Cloudflare Pages |

The project relies on [`@chenglou/pretext`](https://github.com/chenglou/pretext)
for precise browser text measurement, fitting, and wrapping. It powers the
headline scaling (`FitText`) and article-body wrapping around obstacles
(`PretextWrappedText`, `PretextCanvasText`) used throughout the broadsheet
layout.

---

## Project layout

```text
agentskills/              # Hermes skills and supporting scripts
  fetch-news/
  clean-chunks/
  chunk-articles/
  publish-pipeline/
  rewrite-articles/       # STYLE.md, validator, direct-LLM rewriter
  review-rewrite/
  create-daily/
  populate-depropdb/
  publish-dailywire/
backend/
  db/                     # SQLite databases and templates
  scripts/                # ~50 per-source fetchers + shared lib
drafts/                   # Intermediate chunks, rewrites, daily.md
logs/                     # Skill and validator logs
migrations/               # D1 schema migrations
public/data/              # Generated edition JSON + archive
public/logos/             # Masthead logos
scripts/                  # Publish/rollback helpers
src/
  routes/                 # TanStack Start page and API routes
  components/newspaper/   # Broadsheet UI components
  lib/                    # Schema, types, API client, layout engine
  hooks/                  # use-local-weather, use-mobile
  test/                   # Test fixtures
```

---

## Running the pipeline

### Hermes-driven (production path)

The canonical execution path is through Hermes. The four slash-command calls,
in order, are:

1. `/fetch-news`
2. `/clean-chunks`
3. `/chunk-articles`
4. `/publish-pipeline`

The current scheduler sends these to Hermes via a Cloudflare webhook, but the
calls themselves are Hermes slash commands. Wait for
`logs/rewrite-articles.log` to report completion before triggering
`/publish-pipeline`.

### Locally, by hand

```bash
# 1. Fetch
npm run ingest:articles

# 2. Clean
npx tsx agentskills/clean-chunks/clean-chunks.ts

# 3. Chunk + auto-spawn rewrite
npx tsx agentskills/chunk-articles/chunk-articles.ts

# Wait for logs/rewrite-articles.log to finish

# 4. Publish pipeline
npx tsx agentskills/publish-pipeline/publish-pipeline.ts
```

Individual scripts can also be run directly for debugging:

```bash
npx tsx agentskills/rewrite-articles/rewrite-articles.ts
npx tsx agentskills/rewrite-articles/retry-invalid.ts
npx tsx agentskills/review-rewrite/review-rewrite.ts
npx tsx agentskills/create-daily/create-daily.ts
npx tsx agentskills/populate-depropdb/populate-depropdb.ts
npx tsx agentskills/publish-dailywire/publish-dailywire.ts
```

---

## Local development

```bash
npm install
npm run dev
```

`npm run dev` starts the TanStack Start dev server. The site reads
`public/data/current-edition.json`, which is regenerated by the publish script.

### Environment

Copy `.env.example` to `.env` and fill in the values you need:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|----------|---------|
| `LADDER_URL` | Proxy for fetching publisher pages. |
| `FIRECRAWL_API_KEY` | Optional fallback for hard-to-fetch sources. |
| `BRAIN_API_URL` | LLM endpoint used for rewrites and validation. |
| `BRAIN_API_KEY` | API key for the LLM endpoint. |
| `BRAIN_MODEL` | Model name used for rewrites and validation. |
| `CLOUDFLARE_ACCOUNT_ID` | Required for D1 archive writes. |
| `D1_DATABASE_ID` | D1 database UUID for archive writes. |
| `CLOUDFLARE_API_TOKEN` | API token with D1 edit permissions. |
| `ADMIN_TOKEN` | Protects admin API routes if enabled. |

For local dev the only hard requirement is the Ladder proxy if you use
Ladder-dependent fetchers:

```bash
npm run ladder:up
```

Cloudflare variables are only needed for deployment and D1 archiving.

---

## Frontend routes

| Path | Purpose |
|------|---------|
| `/` | Today's edition — broadsheet layout |
| `/article/:slug` | Individual story with source transparency |
| `/section/:category` | Stories grouped by section |
| `/world`, `/war`, `/technology`, `/business`, `/science`, `/culture`, `/crypto`, `/politics`, `/weather` | Dedicated category pages |
| `/editions` | Archive of past editions |
| `/editions/:date` | Historical edition rendered like today's |
| `/search?q=` | Search headlines, summaries, sources, and tags |
| `/settings` | Personalization, schedule, feeds, and AI config |
| `/pretext-demo` | Demo page for the Pretext text-wrapping engine |

## API routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/edition/latest` | Returns `public/data/current-edition.json` |
| `GET /api/editions` | Lists archived edition summaries (D1 or static fallback) |
| `GET /api/editions/:date` | Returns a historical edition (D1 or static fallback) |
| `GET /api/articles/:id` | Looks up a single article from today's edition |
| `GET /api/search?q=` | Searches today's articles |
| `GET /api/settings` | Returns user settings |
| `GET /api/crypto-ticker` | Crypto market ticker |
| `GET /api/stock-ticker` | Stock ticker |
| `GET /api/world-markets-ticker` | World markets ticker |
| `GET /api/health` | Health check |
| `POST /api/admin/generate` | Rate-limited admin generate trigger |
| `POST /api/admin/rollback` | Rate-limited admin rollback |

---

## Deployment

The site deploys to Cloudflare Pages.

1. **Provision D1:**

   ```bash
   wrangler d1 create morning-wire
   ```

   Copy the returned database ID into `wrangler.toml` under
   `[[d1_databases]] database_id`.

2. **Apply migrations:**

   ```bash
   wrangler d1 execute morning-wire --file=migrations/0001_initial.sql
   wrangler d1 execute morning-wire --file=migrations/0002_create_editions_table.sql
   ```

3. **Set secrets:**

   ```bash
   wrangler secret put ADMIN_TOKEN
   ```

4. **Create a Pages project** and bind the D1 database (`DB`) and KV namespace
   (`KV`).

5. **Build and deploy:**

   ```bash
   npm run build
   npm run deploy
   ```

The publish script archives editions to D1 when the Cloudflare env vars are
set; otherwise it falls back to static files in `public/data/editions/`.

---

## Safety and transparency

- Only neutral, rewritten summaries and metadata are displayed; original URLs
  are preserved for verification.
- AI-generated content is labeled in `aiDisclosure` fields.
- API keys and tokens are never exposed to the browser.
- Source reliability and confidence scores are stored per article.
- Bad rewrites are detected by the validator and quarantined before publication.

---

## Known issues / rough edges

- **Naming drift:** the repo folder, product name, and legacy assets disagree on
  whether this is "Daily Wire" or "Morning Wire".
- **Generated data committed:** `public/data/current-edition.json` and archive
  files are tracked even though they are pipeline outputs.
- **Legacy scripts:** `scripts/generate-edition-from-db.ts` is mostly superseded
  by `publish-dailywire`. `scripts/publish-edition.ts` and
  `scripts/rollback-edition.ts` reference an `npm run validate:edition` script
  that no longer exists.
- **Hardcoded path:** `clean-chunks.ts` still hardcodes an absolute repo path.

---

## License

Proprietary — Botwin's Daily Wire.
