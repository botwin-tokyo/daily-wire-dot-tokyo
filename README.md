# Botwin's Morning Wire

A self-hosted, AI-assisted daily newspaper. It ingests news from public RSS feeds,
APIs, and publisher pages; rewrites stories into neutral, wire-style copy;
validates every rewrite; stores the results; and publishes a ranked edition as
schema-valid JSON. A TanStack Start frontend renders each edition as a
broadsheet-style page and serves it from Cloudflare Pages, with Cloudflare D1 as
the source of truth for live editions.

> **Naming note:** the GitHub repository is `TianJieHeng/botwinmorningwireapp`
> and the deployed Pages project and domain are `botwins-morning-wire`. The
> product name used in this README is **Botwin's Morning Wire**.

---

## Executive summary

Botwin's Morning Wire is a fully autonomous news product:

- **Ingests** hundreds of stories per day from configured RSS / API / web
  sources.
- **Rewrites** every story with a local LLM into neutral, factual, wire-style
  copy.
- **Validates** each rewrite for chain-of-thought leaks, raw JSON artifacts,
  second-person advice, and empty content; invalid items are retried or
  quarantined.
- **Ranks** stories, picks a lead, and assembles a front-page layout.
- **Publishes** the edition to Cloudflare D1 so the live site updates
  immediately — no rebuild or Git push required.
- **Renders** the edition as a responsive broadsheet with section pages,
  article pages, search, and archive views.

The pipeline is designed to run on your own machine under Hermes, with
Cloudflare handling global hosting and long-term storage. The current scheduler
triggers the pipeline via a Cloudflare webhook that reaches Hermes each morning.

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
   local static copies for dev fallback, and **upsert the canonical edition to
   Cloudflare D1**. The live site reads from D1 first and only falls back to
   static files when D1 is not bound.

The frontend then renders the edition, section pages, individual articles,
search, and an archive view.

---

## System architecture

The system has four layers:

- **Hermes skills** — four slash commands that start each phase.
- **Direct TypeScript scripts** — deterministic or LLM-backed scripts that the
  skills run internally.
- **Cloudflare platform** — D1 (canonical edition storage), KV (rate limiting /
  future caching), and Pages (global hosting and edge SSR).
- **TanStack Start frontend** — broadsheet UI, API routes, and server-side
  rendering at the edge.

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
| `publish-dailywire` | Build and validate the edition; upsert to D1 when Cloudflare credentials are present; write static files for local fallback. |

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
                                                   │  Cloudflare D1   │
                                                   │ canonical edition │
                                                   └──────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────┐
                                                   │  Cloudflare Pages │
                                                   │  SSR + static UI  │
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
| Canonical archive | Cloudflare D1 |
| Server cache / rate limit | Cloudflare KV |
| Icons | Lucide React |
| Fonts | Playfair Display · Source Serif 4 · Source Sans 3 · JetBrains Mono |
| Text wrapping / fitting | [`@chenglou/pretext`](https://github.com/chenglou/pretext) |
| Deploy target | Cloudflare Pages (Git-connected) |
| Edge runtime | Cloudflare Workers (`nodejs_compat`) |

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
public/data/              # Generated edition JSON (local dev fallback)
public/logos/             # Masthead logos
scripts/                  # Publish/rollback helpers and run checks
src/
  routes/                 # TanStack Start page and API routes
  components/newspaper/   # Broadsheet UI components
  lib/                    # Schema, types, API client, layout engine
  hooks/                  # use-local-weather, use-mobile
  test/                   # Test fixtures
.github/workflows/        # Optional manual GitHub Actions deploy
wrangler.toml             # Cloudflare Pages / Workers bindings
.env.example              # Local environment template
.dev.vars.example         # Local Cloudflare dev-secrets template
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
`public/data/current-edition.json`, which is regenerated by the publish script
when D1 is not bound locally.

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
| `CLOUDFLARE_ACCOUNT_ID` | Required for D1 archive writes and deploys. |
| `D1_DATABASE_ID` | D1 database UUID for archive writes. |
| `CLOUDFLARE_API_TOKEN` | API token with D1 edit and Pages edit permissions. |
| `ADMIN_TOKEN` | Protects admin API routes. |

For local dev the only hard requirement is the Ladder proxy if you use
Ladder-dependent fetchers:

```bash
npm run ladder:up
```

Cloudflare variables are only needed for deployment and D1 archiving. If you
want `wrangler pages dev` to use local secrets, copy `.dev.vars.example` to
`.dev.vars` and set `ADMIN_TOKEN` there.

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
| `GET /api/edition/latest` | Returns the latest edition (D1 primary; static fallback) |
| `GET /api/editions` | Lists archived edition summaries (D1 primary; static fallback) |
| `GET /api/editions/:date` | Returns a historical edition (D1 primary; static fallback) |
| `GET /api/articles/:id` | Looks up a single article from today's edition |
| `GET /api/search?q=` | Searches today's articles |
| `GET /api/settings` | Returns user settings |
| `GET /api/crypto-ticker` | Crypto market ticker |
| `GET /api/stock-ticker` | Stock ticker |
| `GET /api/world-markets-ticker` | World markets ticker |
| `GET /api/health` | Health check |
| `POST /api/admin/generate` | Rate-limited admin generate trigger (requires `ADMIN_TOKEN`) |
| `POST /api/admin/rollback` | Rate-limited admin rollback (requires `ADMIN_TOKEN`) |

All edition-reading routes prefer D1. If the `DB` binding is unavailable, they
fall back to the static files in `public/data/`. This makes local development
work without Cloudflare credentials while keeping production fully dynamic.

---

## Cloudflare deployment

The site deploys to **Cloudflare Pages** and is connected to the GitHub repo.
Pushing to `main` triggers a production build and deploy. Pushing any other
branch triggers a preview deploy with its own URL.

### Current production environment

| Resource | Value |
|----------|-------|
| Pages project | `botwins-morning-wire` |
| Domain | `https://botwins-morning-wire.pages.dev` |
| D1 database binding | `DB` (`d56e6544-68a6-45a8-9282-73be8186f37d`) |
| KV namespace binding | `KV` (`3b05b707785a4c1c8ae5d41b4fa0189b`) |
| Compatibility date | `2025-06-19` |
| Compatibility flags | `nodejs_compat` |

### Initial provisioning

1. **Create the D1 database:**

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

3. **Create a KV namespace** (optional; used for rate limiting):

   ```bash
   wrangler kv namespace create KV
   ```

   Copy the namespace ID into `wrangler.toml` under `[[kv_namespaces]] id`.

4. **Set secrets:**

   ```bash
   wrangler pages secret put ADMIN_TOKEN --project-name=botwins-morning-wire
   ```

5. **Create a Pages project** and bind the D1 database (`DB`) and KV namespace
   (`KV`). The Git integration should point at `main` as the production branch.

6. **Build and deploy manually** (optional; Git auto-deploy is the default):

   ```bash
   npm run build
   npm run deploy
   ```

---

## D1 as the source of truth

Cloudflare D1 is the canonical store for published editions. When
`publish-dailywire` runs with `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`, and
`CLOUDFLARE_API_TOKEN` set, it:

1. Validates the generated edition against the Zod schema.
2. Writes `public/data/current-edition.json` and `public/data/editions/:date.json`
   for local dev and static fallback.
3. Upserts the edition into the `editions` table in D1.

The live site reads from D1 on every request. This means:

- **No rebuild is required** when a new edition is published.
- **No Git push is required** for daily content updates.
- The static files are only used when D1 is not bound (local dev) or as a
  degraded-mode fallback.

---

## CI/CD and Git auto-deploy

The repository includes `.github/workflows/deploy.yml` as an optional **manual**
workflow. It is disabled from automatic triggers because the GitHub runner does
not have the daily edition data; the canonical path is Cloudflare Pages' native
Git integration, which builds on every push.

### Branch behavior

| Branch | Deploy environment |
|--------|--------------------|
| `main` | Production (`botwins-morning-wire.pages.dev`) |
| anything else | Preview (`https://<hash>.botwins-morning-wire.pages.dev`) |

### Monitoring a deploy

```bash
npx wrangler pages deployment list --project-name=botwins-morning-wire
npx wrangler pages deployment tail --project-name=botwins-morning-wire
```

If a Git auto-deploy ever serves 404s while the code is correct, it is usually
a Cloudflare Pages asset-dedup glitch caused by a commit that only changes
non-build files (e.g., `.env.example`). The fix is to push a commit that
changes an actual source file or to redeploy manually.

---

## Operations runbook

### Publish a new edition manually

```bash
npx tsx agentskills/publish-pipeline/publish-pipeline.ts
```

The site will reflect the new edition immediately once D1 reports the upsert
success.

### Roll back to the previous edition

Use the admin endpoint with the bearer token:

```bash
curl -X POST https://botwins-morning-wire.pages.dev/api/admin/rollback \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Verify the live API

```bash
curl https://botwins-morning-wire.pages.dev/api/edition/latest
curl https://botwins-morning-wire.pages.dev/api/editions
curl https://botwins-morning-wire.pages.dev/api/health
```

### Redeploy manually if Git deploy fails

```bash
npm run build
npm run deploy
```

---

## Security

- **Secrets stay out of the repo.** Real credentials live in `.env` (gitignored)
  and in Cloudflare's encrypted secrets store. Only placeholders are in
  `.env.example` and `.dev.vars.example`.
- **No keys reach the browser.** `ADMIN_TOKEN`, `CLOUDFLARE_API_TOKEN`, and
  D1/KV identifiers are only used in server-side code.
- **Admin routes are bearer-token protected** and KV-backed rate limited.
- **Only neutral, rewritten summaries and metadata are displayed.** Original
  URLs are preserved for verification.
- **AI-generated content is labeled** in `aiDisclosure` fields.
- **Source reliability and confidence scores** are stored per article.
- **Bad rewrites are detected by the validator** and quarantined before
  publication.

---

## Known issues / roadmap

- **Naming drift:** resolved in the README and GitHub repo name; some legacy
  assets may still reference older names.
- **Generated data no longer committed:** `public/data/current-edition.json` and
  archive files are now local dev fallbacks; the canonical store is D1.
- **Legacy scripts:** `scripts/generate-edition-from-db.ts` is mostly superseded
  by `publish-dailywire`. `scripts/publish-edition.ts` and
  `scripts/rollback-edition.ts` are helpers that may drift from the main
  pipeline.
- **Hardcoded path:** `clean-chunks.ts` still hardcodes an absolute repo path.
- **Monitoring:** runtime alerting is not yet wired; tail logs via Wrangler or
  the Cloudflare dashboard.

---

## License

Proprietary — Botwin's Morning Wire.
