# Botwin's Morning Wire

A self-hosted, AI-assisted daily newspaper. It ingests news from open web
sources, lets an agent rewrite stories into neutral, propaganda-free copy,
stores the results, and publishes a validated edition as static JSON that a
TanStack Start frontend renders as a broadsheet-style page.

The entire workflow is designed to run on your machine: ingest, rewrite,
database population, and edition generation are local scripts and agent skills.
Cloudflare enters the picture only for hosting and long-term archive storage.

## What it does

1. **Fetch** — the `fetch-news` agent skill runs `npm run ingest:articles` to
   pull today's news from configured RSS, API, and HTML sources into
   `backend/db/news.db`.
2. **Clean** — the `clean-chunks` agent skill removes leftover chunk and rewrite
   files from the previous run.
3. **Chunk** — the `chunk-articles` agent skill splits the latest fetch run into
   manageable markdown chunk files in `drafts/rewrite_chunks/`.
4. **Rewrite** — the `rewrite-articles` agent skill deploys subagents to rewrite
   each chunk as neutral, Pulitzer-grade wire copy, using a per-category
   importance rubric. Subagents write their output to
   `drafts/rewrite_outputs/`.
5. **Review** — the `review-rewrite` agent skill removes duplicate coverage,
   bumps importance when multiple sources report the same topic, and fixes
   formatting issues in the chunk files.
6. **Assemble** — the `create-daily` agent skill combines the reviewed chunks
   into a single `drafts/daily.md`.
7. **Populate** — the `populate-depropdb` agent skill parses `drafts/daily.md`
   and inserts the rewritten articles into `backend/db/deprop.db`.
8. **Publish** — the `publish-dailywire` agent skill builds a schema-valid
   `NewspaperEdition` from `deprop.db`, picks the highest-importance article as
   the lead, writes `public/data/current-edition.json`, and archives the edition
   in Cloudflare D1 when credentials are configured.

The frontend then renders today's edition, section pages, article pages, search,
and an archive view.

## Stack

| Layer           | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| UI              | React 19 · TypeScript · Tailwind CSS v4                  |
| Framework / SSR | TanStack Start (file-based routes, Cloudflare-ready)     |
| Server state    | TanStack Query                                           |
| Validation      | Zod                                                      |
| Local data      | SQLite via Node's built-in `node:sqlite`                 |
| Archive data    | Cloudflare D1 (optional; static files are the fallback)  |
| Icons           | Lucide                                                   |
| Fonts           | Playfair Display · Source Serif 4 · Source Sans 3 · JetBrains Mono |
| Deploy target   | Cloudflare Pages                                         |

## Project layout

```text
agentskills/              # Agent skills for rewriting and publishing
backend/
  db/                     # SQLite databases (templates tracked, .db ignored)
  scripts/                # News fetchers and aggregation pipeline
migrations/               # D1 schema migrations
public/data/              # Generated edition JSON
scripts/                  # Edition generation, publishing, rollback helpers
src/
  routes/                 # TanStack Start routes, including API routes
  components/newspaper/   # Broadsheet UI components
  lib/                    # Schema, types, API client, layout engine
```

## Agent skills

Skills live under `agentskills/` and are mirrored to a local skill registry for
agent consumption. Each skill is a self-contained recipe the agent can execute.

| Skill                | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `fetch-news`         | Run the news ingest pipeline (`npm run ingest:articles`).            |
| `clean-chunks`       | Delete leftover chunk/rewrite files before a new rewrite pass.       |
| `chunk-articles`     | Split the latest fetch run into chunk files for subagents.           |
| `rewrite-articles`   | Deploy subagents to rewrite each chunk and assign per-category       |
|                      | importance scores.                                                   |
| `review-rewrite`     | Remove duplicates, boost trending topics, and fix formatting.        |
| `create-daily`       | Assemble reviewed chunk files into `drafts/daily.md`.                |
| `populate-depropdb`  | Parse `drafts/daily.md` and insert rewritten articles into           |
|                      | `backend/db/deprop.db`.                                              |
| `publish-dailywire`  | Generate a valid `NewspaperEdition` from `deprop.db`, rank by        |
|                      | importance, and write `public/data/current-edition.json`.            |

The `rewrite-articles` skill includes a style guide (`STYLE.md`) that every
subagent receives. The guide defines the neutral rewrite voice and a
per-category 1–10 importance rubric.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` starts the TanStack Start dev server. The site reads
`public/data/current-edition.json`, which is regenerated by the publish skill.

### Required environment

Copy `.env.example` to `.env` and fill in anything you need for fetching:

```bash
cp .env.example .env
```

For local dev the only hard requirement is the Ladder proxy if you use
Ladder-dependent fetchers:

```bash
npm run ladder:up
```

Cloudflare variables are only needed for deployment and D1 archiving.

## Running the daily pipeline

A full cycle is driven by eight agent skills. The agent should invoke each skill
in order:

```bash
# 1. Fetch fresh articles
#    Skill: fetch-news
#    Script: npm run ingest:articles

# 2. Clean leftover chunk/rewrite files
#    Skill: clean-chunks
#    Script: npx tsx agentskills/clean-chunks/clean-chunks.ts

# 3. Chunk the latest fetch run
#    Skill: chunk-articles
#    Script: npx tsx agentskills/chunk-articles/chunk-articles.ts

# 4. Rewrite each chunk (agentic — subagents)
#    Skill: rewrite-articles
#    Writes: drafts/rewrite_outputs/{category}-{n}of{m}.md

# 5. Review and deduplicate rewritten chunks
#    Skill: review-rewrite
#    Script: npx tsx agentskills/review-rewrite/review-rewrite.ts

# 6. Assemble drafts/daily.md
#    Skill: create-daily
#    Script: npx tsx agentskills/create-daily/create-daily.ts

# 7. Populate deprop.db
#    Skill: populate-depropdb
#    Script: npx tsx agentskills/populate-depropdb/populate-depropdb.ts

# 8. Publish the edition
#    Skill: publish-dailywire
#    Script: npx tsx agentskills/publish-dailywire/publish-dailywire.ts
```

Steps 4 and 5 are the most open-ended: the agent reads source material, applies
the style guide, assigns per-category importance scores, and removes duplicate
coverage. The other steps are deterministic scripts.

## Edition JSON

The canonical edition shape is defined in `src/lib/schema.ts` and validated with
Zod. Two reference files are included:

- `drafts/template-edition.json` — minimal schema-valid skeleton.
- `examples/example-edition.json` — fuller example edition.

`publish-dailywire` validates the edition against `src/lib/schema.ts` before
writing `current-edition.json`; any schema or business-rule errors are printed
to the terminal.

## Cloudflare deployment

The site deploys to Cloudflare Pages. Before deploying you need to provision
Cloudflare resources and update `wrangler.toml`.

1. **Create a D1 database:**

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

4. **Create a Pages project** and bind the D1 database (`DB`).

5. **Deploy:**

   ```bash
   npm run build
   npm run deploy
   ```

   The build is output to `.output/`; `npm run deploy` publishes that directory
   to Cloudflare Pages.

The publish skill archives editions to D1 when `CLOUDFLARE_ACCOUNT_ID`,
`D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN` are set as environment variables.
Until then it falls back to static files in `public/data/editions/`, which is
fine for local development.

## Environment variables

See `.env.example` for the full list. Important variables:

| Variable                  | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `LADDER_URL`              | Proxy for fetching publisher pages.                         |
| `FIRECRAWL_API_KEY`       | Optional fallback for hard-to-fetch sources.                |
| `CLOUDFLARE_ACCOUNT_ID`   | Required for D1 archive writes from the publish skill.      |
| `D1_DATABASE_ID`          | D1 database UUID for archive writes.                        |
| `CLOUDFLARE_API_TOKEN`    | API token with D1 edit permissions.                         |
| `ADMIN_TOKEN`             | Protects admin API routes if you enable them.               |

## Routes

| Path                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `/`                  | Today's edition — broadsheet layout                  |
| `/article/:slug`     | Individual story with source transparency            |
| `/section/:category` | Stories grouped by section                           |
| `/editions`          | Archive of past editions                             |
| `/editions/:date`    | Historical edition rendered in the same layout       |
| `/search?q=`         | Search headlines, summaries, sources, and tags       |
| `/settings`          | Personalization, schedule, feeds, and AI config      |

## API routes

Server routes under `src/routes/api/` become Cloudflare Pages Functions in
production:

| Endpoint              | Description                                     |
| --------------------- | ----------------------------------------------- |
| `GET /api/edition/latest` | Returns `public/data/current-edition.json`  |
| `GET /api/editions`       | Lists archived edition summaries (D1 or static fallback) |
| `GET /api/editions/:date` | Returns a historical edition (D1 or static fallback)     |
| `GET /api/articles/:id`   | Looks up a single article from today's edition |
| `GET /api/search?q=`      | Searches today's articles                       |
| `GET /api/settings`       | Returns user settings                           |

## Safety and transparency

- Only neutral, rewritten summaries and metadata are displayed. Original URLs
  are preserved for verification.
- AI-generated content is labeled in `aiDisclosure` fields.
- API keys and tokens are never exposed to the browser.
- Source reliability scores and confidence scores are stored per article.

## License

Proprietary — Botwin's Daily Wire.
