# Agent Guidelines — Botwin's Morning Wire

This repository contains the frontend, backend ingestion pipeline, and agent
skills for Botwin's Morning Wire. Follow these guidelines when modifying code.

## Project structure

- `agentskills/` — Agent skill recipes. Each folder contains a `SKILL.md` and
  sometimes a helper script. Mirror new skills to the local skill registry
  when asked.
- `backend/scripts/` — News fetchers and the `compile-to-db.ts` ingest runner.
- `backend/db/` — SQLite databases. Only `.template` files are committed;
  working `.db` files are generated at runtime and are gitignored.
- `migrations/` — D1 SQL migrations.
- `public/data/` — Generated edition JSON. `current-edition.json` is the source
  of truth for the frontend.
- `src/routes/` — TanStack Start routes, including Pages Functions under
  `src/routes/api/`.
- `src/lib/schema.ts` — Canonical Zod schemas for editions and articles.

## Working conventions

- Run `npm run lint`, `npx tsc --noEmit`, `npm run test`, and `npm run build`
  before committing any non-trivial change.
- Use the existing code style. Prettier is configured; run `npm run format` if
  lint reports formatting errors.
- Do not commit local databases, `.env` files, or temporary rewrite batches in
  `drafts/rewrite_*/`.
- Do not force-push or rewrite published git history.
- Keep changes minimal. Prefer editing existing files over adding new ones
  unless the change genuinely needs a new module.

## Agent skills

Skills under `agentskills/` are the primary interface for non-deterministic
work. Each skill should:

- Declare when it should be used.
- List prerequisites.
- Provide step-by-step instructions.
- Reference any required style guide or script.
- Be self-contained enough that an agent can execute it without reading the
  rest of the codebase.

When adding a new skill, include a `SKILL.md`. If the skill needs a helper
script, keep it in the same folder and reference it from the skill doc.

## Database notes

- `backend/db/news.db` is created from `backend/db/news.db.template` on first
  open if it does not exist.
- `backend/db/deprop.db` is created from `backend/db/deprop.db.template` on
  first open if it does not exist.
- Both share the same schema: `runs` and `articles` tables.

## Deployment

Cloudflare deployment is optional for local development but required for the
public site and D1 archive. See `README.md` for the deployment checklist.
