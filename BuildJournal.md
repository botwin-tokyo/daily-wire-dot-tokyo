# Build Journal — The Morning Wire

This journal records what happened during each implementation phase so the next agent (or a future maintainer) can pick up exactly where the previous work left off.

---

## Phase 1 — Canonical JSON Schema and TypeScript Contract

**Status:** Complete ✅

**Goal:** Define the exact JSON contract between the AI publishing pipeline and the frontend, and make it enforceable.

### What was created

| File                                    | Purpose                                                                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/schema.ts`                     | Canonical Zod schemas and TypeScript types for `NewspaperEdition`, `Article`, `Section`, `MarketSnapshot`, `WeatherSnapshot`, etc. Includes runtime validators `validateNewspaperEdition()` and `validateBusinessRules()`. |
| `schemas/newspaper-edition.schema.json` | Static JSON Schema (draft-07) that external agents can use to validate their output without importing TypeScript.                                                                                                          |
| `examples/example-edition.json`         | A known-good edition document covering all 18 articles from the existing mock data, plus masthead, utility bar, navigation, footer, market snapshot, weather snapshot, and generation metadata.                            |
| `scripts/validate-edition.ts`           | CLI that validates one or more JSON files against the Zod schema and business rules, printing a machine-readable report.                                                                                                   |

### What was modified

| File                  | Change                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types.ts`    | Re-exported canonical types from `src/lib/schema.ts` with `Newspaper*` aliases to avoid collisions with the existing legacy `Article` / `Edition` types that the components still use. |
| `package.json`        | Added `tsx` to devDependencies and added the `validate:edition` npm script.                                                                                                            |
| Existing source files | Prettier reformatted many existing `.tsx` files while fixing baseline lint errors. No logic was changed.                                                                               |

### Design decisions

- **Plain-text safety:** Added a `plainText(maxLength?)` helper that applies length limits first, then rejects HTML tags, `javascript:`, event handlers, and inline `style=` attributes.
- **Backward compatibility:** The legacy `Edition` / `Article` types in `src/lib/types.ts` are left untouched so the existing UI keeps compiling. An adapter layer will be introduced in Phase 2.
- **Repository-managed JSON:** Kept the content contract in the repo rather than a runtime database. This matches the planned publishing workflow where agents commit JSON files.

### Validation results

```bash
npm run validate:edition -- examples/example-edition.json
# ✅ Valid edition
#    editionId:    ed-2025-05-20-global
#    editionDate:  2025-05-20
#    status:       published
#    articles:     18
#    sections:     5
```

Intentionally invalid JSON was also rejected with clear schema errors.

### Commands that passed

```bash
npm run validate:edition -- examples/example-edition.json
npm run lint          # 0 errors, 9 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
```

### Notes / blockers

- The environment does not have `bun` installed, so `npm` was used with `--no-package-lock`. The repo still uses `bun.lock`; run `bun install` after pulling to regenerate/sync the lockfile if needed.
- Prettier had never been run across the entire repo, so the first `npm run format` touched many files. Going forward formatting should stay clean because lint now passes.

### Next step

Phase 2: place the canonical JSON in `public/data/` and wire the frontend loader to read it, producing a backward-compatible `Edition` object for the existing components.

---

## Phase 2 — Content File Model and Loader

**Status:** Complete ✅

**Goal:** Place the canonical JSON in the repository where the frontend can read it, and wire the existing UI to consume it instead of mock data.

### What was created

| File                                   | Purpose                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/data/current-edition.json`     | The live edition pointer. The site renders this file.                                                                                                   |
| `public/data/editions/2025-05-20.json` | Immutable archive copy of the example edition.                                                                                                          |
| `public/data/editions/index.json`      | Static manifest of available historical editions (used until Pages Functions replace it).                                                               |
| `src/lib/edition-loader.ts`            | Loads `NewspaperEdition` JSON from `public/data/`, validates it with Zod, and adapts it to the legacy `Edition` type via `newspaperEditionToEdition()`. |

### What was modified

| File             | Change                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api.ts` | `getLatestEdition`, `getEditionByDate`, `listEditions`, `getArticle`, `searchArticles`, and `getSavedArticles` now load from the JSON files. In dev, they fall back to mock data if loading fails. |

### Design decisions

- **SSR loading strategy:** During server-side rendering/pre-rendering the loader reads `public/data/...` directly from the filesystem. In the browser it fetches the same path. This avoids the "relative URL cannot be parsed by Node fetch" error. It is a temporary bridge until Phase 6 adds Pages Functions for Cloudflare Workers.
- **Adapter pattern:** The canonical `NewspaperEdition` type is kept separate from the legacy `Edition` type. `newspaperEditionToEdition()` maps fields and derives computed values (`updatedByAiAt` as HH:MM, `nextScheduledAt` as the next day at 05:30 UTC, `eyebrow` from `displayPosition`).
- **Status mapping:** The canonical status includes `draft`, which the legacy type does not. `draft` is mapped to `generating` for the frontend.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json
npm run lint          # 0 errors, 9 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run preview       # home page renders the JSON-driven lead headline
```

### Verification snippet

The production preview HTML now contains:

- `TOP STORY`
- `Global cities race to adapt to a changing climate`
- `Morning Briefing`

### Notes / blockers

- Filesystem reads in SSR will not work on Cloudflare Workers. Phase 6 will replace the filesystem branch with Pages Functions.
- `public/data/editions/index.json` is currently maintained by hand. The Publishing Agent will update it automatically in Phase 9.

### Next step

Phase 3: drive the masthead, utility bar, navigation, and footer from JSON so edition metadata can be changed without touching React components.

---

## Phase 3 — Edition Metadata Adapters

**Status:** Complete ✅

**Goal:** Drive the masthead, utility bar, navigation, and footer from JSON so edition metadata can be changed without touching React components.

### What was created

| File         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| No new files | Existing shell components were refactored to accept props. |

### What was modified

| File                                      | Change                                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/newspaper/UtilityBar.tsx` | Now accepts a `data: NewspaperUtilityBar` prop and renders date, weather, edition label, updated time, and next-edition text from JSON. Weather icon is mapped from JSON icon names to Lucide components. |
| `src/components/newspaper/Masthead.tsx`   | Now accepts a `data: NewspaperMasthead` prop. Title and tagline come from JSON.                                                                                                                           |
| `src/components/newspaper/SectionNav.tsx` | Now accepts a `data: NewspaperNavigation` prop and renders `items` and `moreLinks` from JSON. Hard-coded `SECTIONS` array removed.                                                                        |
| `src/components/newspaper/SiteFooter.tsx` | Now accepts a `data: NewspaperFooter` prop and renders copyright and links from JSON.                                                                                                                     |
| `src/components/newspaper/PageShell.tsx`  | Loads the latest `NewspaperEdition` via TanStack Query and passes masthead/utility-bar/navigation/footer data to the shell components. Provides sensible defaults while loading.                          |
| `src/routes/__root.tsx`                   | Added a root loader that preloads `newspaperEditionQuery` into the query client. `head()` now sets `<title>`, `og:title`, and `description` from the masthead and editor's note in the loaded edition.    |
| `src/lib/api.ts`                          | Added `getLatestNewspaperEdition()`, `newspaperEditionQuery`, and the `NewspaperEdition` type import.                                                                                                     |

### Design decisions

- **Loading strategy:** `PageShell` uses `useQuery` (non-suspense) so it can load metadata independently without forcing every route to suspend. The root route prefetches the same query so the data is usually already in the cache.
- **Defaults:** While the edition loads, shell components fall back to the original hard-coded defaults. This prevents layout flash.
- **`updatedAt` override:** `PageShell` still accepts an optional `updatedAt` prop (used by `/editions/$date`) and merges it over `utilityBar.updatedByAiAt`.

### Validation results

Production preview HTML confirmed the following JSON-driven strings:

- `The Morning Wire`
- `Your Personal Daily Intelligence`
- `May 20, 2025`
- `18°C Partly Cloudy`
- `Edition: Global`
- `Updated by AI at 05:30`
- `Next edition scheduled`
- Navigation: `Top Stories`, `World`, `Technology`, `Business`, `Science`, `Culture`
- Footer: `Privacy Policy`, `Terms of Service`, `Contact`
- `© 2025 The Morning Wire. All rights reserved.`

A dynamic check was performed by temporarily changing `utilityBar.dateLabel` to `"May 21, 2025"`, rebuilding, and previewing. The rendered page immediately showed the new date, confirming JSON-driven behavior.

### Commands that passed

```bash
npm run lint          # 0 errors, 9 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run preview       # shell metadata renders from JSON
```

### Notes / blockers

- `PageShell` loads the edition independently of the route data. In Phase 6 this may be consolidated once Pages Functions provide a single `/api/edition/latest` endpoint.
- The root route loader silently returns `undefined` on failure so the app never crashes; the shell falls back to defaults.

### Next step

Phase 4: remove the hard-coded article ID arrays from the home page and historical edition page, deriving left/center/right layout from `displayPosition` in the JSON.

---

## Phase 4 — Dynamic Layout Selection

**Status:** Complete ✅

**Goal:** Remove the hard-coded article ID arrays from the home page (`/`) and historical edition page (`/editions/$date`) so the front-page three-column layout is fully driven by `displayPosition` in the canonical JSON.

### What was created

| File                | Purpose                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/layout.ts` | Exports `deriveFrontPageLayout(edition)` which maps `displayPosition` to the legacy layout roles: `lead` (center), `left` (sidebar/brief), and `right` (imageFeature/major). Also exports `filterBySection`, `findArticleBySlug`, and `getRelatedArticles` helpers. |

### What was modified

| File                                        | Change                                                                                                                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/newspaper/MarketTable.tsx`  | Now accepts a `data: NewspaperMarketSnapshot` prop and renders source, lastUpdated, indices, currencies, and commodities from JSON. Falls back to the previous hard-coded values when no data is provided.                                            |
| `src/components/newspaper/WeatherStrip.tsx` | Now accepts a `data: NewspaperWeatherSnapshot` prop and renders locations from JSON. Falls back to the previous hard-coded defaults when no data is provided.                                                                                         |
| `src/routes/index.tsx`                      | Loads `NewspaperEdition` via `newspaperEditionQuery`, derives layout with `deriveFrontPageLayout()`, adapts to legacy `Edition`, and passes JSON-driven `MarketTable`/`WeatherStrip` data. Hard-coded `['a2','a3']` and `['a4','a5']` arrays removed. |
| `src/routes/editions.$date.tsx`             | Same dynamic-layout treatment for historical editions. Also passes the edition's own `updatedAt` to `PageShell`.                                                                                                                                      |
| `public/data/current-edition.json`          | Added `displayPosition` to every article and populated `marketSnapshot` and `weatherSnapshot`.                                                                                                                                                        |
| `public/data/editions/2025-05-20.json`      | Mirrored the current edition updates.                                                                                                                                                                                                                 |
| `examples/example-edition.json`             | Added `displayPosition` values to all articles and filled market/weather snapshots.                                                                                                                                                                   |
| `scripts/validate-edition.ts`               | Added checks that every article has a valid `displayPosition` and that all `displayPosition` values required for the front page are present at least once.                                                                                            |

### Design decisions

- **`displayPosition` as the source of truth:** The JSON contract now owns layout intent. The UI only needs to know how to map `displayPosition` values to visual slots. This lets an AI editor decide which story goes where without touching React code.
- **Backward-compatible fallback:** `MarketTable` and `WeatherStrip` keep their old hard-coded defaults as fallback props, so any page that has not been migrated yet still renders.
- **Layout helper is pure:** `deriveFrontPageLayout()` is a deterministic function of `NewspaperEdition` and is trivial to unit test in Phase 13.
- **Validation enforces layout safety:** The CLI now rejects editions that are missing required `displayPosition` values, preventing a publishing agent from generating a front page with no lead story.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 9 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run preview       # front-page layout and market/weather render from JSON
```

### Verification snippet

The production preview HTML confirmed the following JSON-driven layout:

- **Lead (center):** `TOP STORY` + `European leaders push for unified defense strategy`
- **Left column:** `Markets rise as inflation cools`
- **Right column:** `AI regulation frameworks take shape worldwide`, `Breakthrough in battery tech`
- **Market snapshot:** `Bloomberg`, `05:15`, `S&P 500`
- **Weather snapshot:** `AccuWeather`, `New York 18°C`

A temporary JSON change that moved a different article to `displayPosition: "lead"` correctly shifted the lead story in the rendered page.

### Notes / blockers

- The `deriveFrontPageLayout()` helper intentionally keeps only one article per display position for the legacy layout. If the JSON contains multiple `lead` stories, the first one is used.
- Market and weather fallbacks will be removed once all routes are confirmed to pass JSON data.

### Next step

Phase 5: generate section landing pages and article detail pages entirely from the JSON `sections` and `articles` arrays.

---

## Phase 5 — Section Pages and Article Page from JSON

**Status:** Complete ✅

**Goal:** Drive section copy (eyebrow, title, dek) and article lookup from the canonical JSON so `/world`, `/business`, `/technology`, `/science`, `/culture`, `/section/$category`, and `/article/$slug` are fully content-driven.

### What was created

| File         | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| No new files | Existing route files were refactored to use JSON-derived section data. |

### What was modified

| File                               | Change                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/types.ts`                 | Added `sections: SectionSchema[]` to the legacy `EditionSchema` so existing routes can access canonical section metadata without a second query.                                                                                                                         |
| `src/lib/edition-loader.ts`        | `newspaperEditionToEdition()` now passes `newspaper.sections` through to the legacy `Edition`.                                                                                                                                                                           |
| `src/lib/mock-edition.ts`          | Added a `sections` array to `MOCK_EDITION` matching the canonical categories and article ordering, keeping the dev fallback consistent.                                                                                                                                  |
| `src/routes/section.$category.tsx` | Replaced hard-coded `CATEGORY_COPY` lookups with `getSectionCopy(edition, category)`. The static `CATEGORY_COPY` map is kept as a fallback for unknown categories. The "Other sections" sidebar list now renders from `edition.sections` and respects `order`/`visible`. |
| `src/routes/world.tsx`             | Head meta now prefers JSON section copy via loader data, falling back to `CATEGORY_COPY`.                                                                                                                                                                                |
| `src/routes/business.tsx`          | Same as `world.tsx`.                                                                                                                                                                                                                                                     |
| `src/routes/technology.tsx`        | Same as `world.tsx`.                                                                                                                                                                                                                                                     |
| `src/routes/science.tsx`           | Same as `world.tsx`.                                                                                                                                                                                                                                                     |
| `src/routes/culture.tsx`           | Same as `world.tsx`.                                                                                                                                                                                                                                                     |
| `src/routes/article.$slug.tsx`     | Already consumed `getArticle()`, which now resolves against `public/data/current-edition.json`; verified that article detail pages render from JSON.                                                                                                                     |

### Design decisions

- **Legacy `Edition` carries canonical `sections`:** Adding `sections` to the legacy type is a small, safe extension that lets every existing route use one query while still supporting the canonical JSON contract.
- **Static fallback preserved:** `CATEGORY_COPY` remains for unknown or malformed categories and as a head-meta fallback before loader data is available.
- **Section order and visibility respected:** The sidebar "Other sections" list sorts by `order` and filters by `visible`, so the JSON can control navigation without code changes.
- **No route URL changes:** `/world`, `/business`, `/technology`, `/science`, and `/culture` continue to work as aliases to the shared section component.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run preview       # section and article pages render from JSON
```

### Verification snippet

Production preview HTML confirmed:

- `/world` title: `World — The Morning Wire` and eyebrow `The World Desk`
- `/business` title: `Business — The Morning Wire` and eyebrow `Markets & Business`
- `/technology`, `/science`, `/culture` titles and eyebrows correct
- `/section/world` mirrors `/world`
- `/article/global-cities-race-climate` renders headline, AI-generated summary, and source transparency
- `/article/ai-regulation-frameworks` renders the correct technology article

A dynamic check temporarily changed the world section in `current-edition.json` to `"label": "Global"` and `"eyebrow": "Global Affairs Desk"`. After rebuilding, `/world` and `/section/world` showed `Global — The Morning Wire` and `Global Affairs Desk`, confirming JSON-driven behavior.

### Notes / blockers

- The fast-refresh warning count increased from 9 to 10 because `section.$category.tsx` now exports `editionQuery`, `CATEGORY_COPY`, and `getSectionCopy`. This is a pre-existing pattern and not a runtime error.
- Article pages still rely on the legacy `getArticle()` adapter. Once Pages Functions are available in Phase 6, the same function can switch to `/api/articles/:slug` without changing route code.

### Next step

Phase 6: add TanStack Start API routes (Pages Functions) for `/api/edition/latest`, `/api/editions`, `/api/editions/:date`, `/api/articles/:id`, `/api/search`, and `/api/health`.

---

## Phase 6 — Pages Functions for Dynamic Data

**Status:** Complete ✅

**Goal:** Add TanStack Start server routes (Pages Functions) so the frontend can fetch editions, articles, search, and metadata from `/api/...` endpoints instead of reading JSON files directly.

### What was created

| File                               | Purpose                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/routes/api/edition/latest.ts` | GET `/api/edition/latest` — returns the current canonical edition JSON.                                      |
| `src/routes/api/editions.ts`       | GET `/api/editions` — returns the archive index.                                                             |
| `src/routes/api/editions/$date.ts` | GET `/api/editions/:date` — returns a historical edition by date.                                            |
| `src/routes/api/articles/$id.ts`   | GET `/api/articles/:id` — returns an article by slug or id from the current edition.                         |
| `src/routes/api/search.ts`         | GET `/api/search?q=...` — searches current edition headlines, summaries, tags, sources, and categories.      |
| `src/routes/api/health.ts`         | GET `/api/health` — returns deployment verification payload (schemaVersion, editionId, editionDate, status). |

### What was modified

| File             | Change                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api.ts` | `getLatestEdition`, `getLatestNewspaperEdition`, `getEditionByDate`, `getEditionByDateNewspaper`, `listEditions`, `getArticle`, and `searchArticles` now call `/api/...` endpoints in the browser while continuing to use the filesystem loader during SSR. This keeps server rendering fast and avoids relative-fetch failures in Node. |
| `vite.config.ts` | Added `nitro: true` under `tanstackStart` to force-enable the nitro deploy plugin for local parity.                                                                                                                                                                                                                                      |

### Design decisions

- **SSR-safe fallback:** The API client detects the runtime with `typeof window === "undefined"`. On the server it still reads `public/data/...` directly; in the browser it fetches the server routes. This avoids the Node `fetch` relative-URL problem and keeps builds independent of a running origin.
- **Canonical JSON over the wire:** API routes return `NewspaperEdition`, `NewspaperArticle`, etc., unchanged. The client adapts them to legacy `Edition`/`Article` shapes so existing components keep working.
- **Cache headers per endpoint:** Latest edition and search use `max-age=60, stale-while-revalidate=300`; historical editions are immutable with `max-age=31536000, immutable`.
- **404 for missing articles:** `/api/articles/:id` returns a JSON 404 instead of crashing.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run dev           # all /api routes return valid JSON
npm run preview       # static pages still SSR correctly from JSON
```

### Verification snippet

With `npm run dev` running on port 8080:

```bash
curl http://localhost:8080/api/health
# {"ok":true,"schemaVersion":"1.0.0","editionId":"ed-2025-05-20-global","editionDate":"2025-05-20","status":"published"}

curl http://localhost:8080/api/edition/latest | head -c 200
# {"schemaVersion":"1.0.0","editionId":"ed-2025-05-20-global",...

curl http://localhost:8080/api/editions
# [{"id":"ed-2025-05-20-global","editionDate":"2025-05-20",...

curl http://localhost:8080/api/articles/global-cities-race-climate | head -c 200
# {"id":"a1","slug":"global-cities-race-climate",...

curl 'http://localhost:8080/api/search?q=climate' | head -c 200
# [{"id":"a1","slug":"global-cities-race-climate",...
```

`npm run preview` confirmed the home page still SSRs correctly from JSON:

- `<title>The Morning Wire — Today's Edition</title>`
- Lead headline `European leaders push...` rendered.

### Notes / blockers

- `vite preview` serves the static client build only; the new `/api` endpoints are not reachable there because the local preview server is not a full nitro/Cloudflare Pages environment. The routes are verified under `npm run dev`, which runs the TanStack Start server. On Cloudflare Pages the same server route files will be served as Pages Functions.
- The `nitro: true` flag does not change local preview behavior, but it signals that the build should use the nitro deploy plugin (used by Cloudflare Pages) once deployed.
- Article and search API routes return canonical `NewspaperArticle` objects; `adaptArticle()` is used on the client to convert to the legacy `Article` type.

### Next step

Phase 7: move saved articles and settings from localStorage/mock to Cloudflare D1-backed Pages Functions (optional but recommended; keep localStorage fallback if D1 is not bound).

---

## Phase 7 — User State with D1 (Optional)

**Status:** Complete ✅ (D1-backed routes implemented; falls back to localStorage/mock when D1 is not bound)

**Goal:** Provide Cloudflare D1-backed persistence for saved articles and settings while keeping the existing localStorage/mock fallbacks so the app continues to work before bindings are configured.

### What was created

| File                          | Purpose                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/0001_initial.sql` | D1 schema for `saved_articles`, `read_articles`, and `settings`.                                                                                    |
| `src/env.d.ts`                | TypeScript declarations for Cloudflare bindings (`DB`, `KV`) used by server routes.                                                                 |
| `src/lib/cloudflare.ts`       | Helper `getCloudflareEnv(request)` that extracts `env` from a TanStack Start server request.                                                        |
| `src/routes/api/saved.ts`     | GET/POST/DELETE `/api/saved` — loads/saves/removes saved article IDs in D1. GET returns full `Article` objects by joining with the current edition. |
| `src/routes/api/settings.ts`  | GET/PUT `/api/settings` — reads/writes the settings blob in D1.                                                                                     |

### What was modified

| File                       | Change                                                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api.ts`           | `getSavedArticles`, `toggleSaved`, `getSettings`, and `updateSettings` now call `/api/saved` and `/api/settings` in the browser. If the API returns an error (e.g., D1 not bound), they fall back to the previous localStorage/mock behavior. `isSaved` and `markRead` remain localStorage-based for now. |
| `src/lib/error-capture.ts` | Added explicit `Event` parameter types to `addEventListener` callbacks after `@cloudflare/workers-types` changed inference.                                                                                                                                                                               |
| `package.json`             | Added `@cloudflare/workers-types` to devDependencies.                                                                                                                                                                                                                                                     |

### Design decisions

- **Conditional D1 usage:** Server routes check `getCloudflareEnv(request)?.DB`. If the binding is missing they return 503 (saved) or the mock defaults (settings). This lets the code be deployed incrementally: bind D1 in Phase 10 and state persistence turns on automatically.
- **Client-side fallback:** The browser API functions catch failures and fall back to localStorage for saved articles and `MOCK_SETTINGS` for settings. This preserves all existing UX before D1 is provisioned.
- **Settings stored as a single JSON blob:** The settings object is small and versioned by the frontend schema, so a single row (`id = 1`) is the simplest D1 model.
- **Saved articles store IDs only:** The server joins saved IDs with the current edition to return full article objects, avoiding stale content in the DB.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run dev           # /api/settings returns mock defaults; /api/saved returns 503 when D1 is not bound
```

### Verification snippet

With `npm run dev` running on port 8080:

```bash
curl http://localhost:8080/api/settings | head -c 120
# {"personalization":{"preferredCategories":["world","technology","business","science"],...

curl http://localhost:8080/api/saved
# {"error":"D1 not bound"}
```

The `/saved` page continues to render using the localStorage fallback when D1 is unavailable.

### Notes / blockers

- D1 cannot be exercised end-to-end locally until `wrangler.toml` (Phase 10) is created and the database is bound. The migration file and API routes are ready for that step.
- Read-state (`markRead`) is still localStorage-only. The migration includes a `read_articles` table so a future route can move it to D1 with the same pattern.
- Adding `@cloudflare/workers-types` introduced a minor type-check change in `error-capture.ts`; it was fixed with explicit event parameter types.

### Next step

Phase 8: wire validation CLI into CI with GitHub Actions so every data change is checked automatically.

---

## Phase 8 — Validation CLI and CI Integration

**Status:** Complete ✅

**Goal:** Ensure every commit that touches edition JSON is validated automatically in CI, and strengthen the local validation CLI with source-allowlist and layout checks.

### What was created

| File                                     | Purpose                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/validate-edition.yml` | Runs `validate:edition` on every push/PR that changes `public/data/`, `examples/`, schema, or the validation script.              |
| `.github/workflows/deploy.yml`           | Runs lint, typecheck, validation, and build on every push/PR to `main`/`master`. Deployment step is commented out until Phase 10. |

### What was modified

| File                          | Change                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/validate-edition.ts` | Added `--production` flag. Added `checkDisplayPositions()` to ensure the front page has at least one `lead`, `sidebar`, and `imageFeature` article. Added `checkSourceAllowlist()` with an approved-domain list; warnings in normal mode, failures in `--production` mode. |

### Design decisions

- **Schema + business rules stay in `src/lib/schema.ts`:** The CLI calls the same Zod validators and business-rule checker used by the frontend loader, so there is a single source of truth.
- **Allowlist is a runtime concern, not schema:** Sources evolve, so the allowlist lives in the validation CLI. CI runs without `--production` and reports warnings; the production publishing pipeline can use `--production` to enforce it.
- **Workflows use Bun:** They rely on the committed `bun.lock` and `bun install --frozen-lockfile`, matching the project's declared package manager.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)

npm run validate:edition -- --production public/data/current-edition.json
# ✅ Valid edition (current)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run validate:edition -- --production public/data/current-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
```

### Verification snippet

- Running `validate:edition` on current/archive/example files reports all valid.
- Running with `--production` on `current-edition.json` also passes because all source/original URLs are in the approved list.
- A test edition with a source domain outside the allowlist prints a warning in normal mode and fails in production mode.

### Notes / blockers

- The deploy workflow intentionally does not push to Cloudflare Pages yet. It will be enabled in Phase 10 once `wrangler.toml` and the `CLOUDFLARE_API_TOKEN` secret are in place.
- The workflows use `oven-sh/setup-bun@v2`. If the repository switches to Node/npm in the future, only the install step needs to change.

### Next step

Phase 9: create the Publishing Agent script that writes archive files, atomically updates the current-edition pointer, runs tests, commits, pushes, and verifies deployment.

---

## Phase 9 — Publishing Automation

**Status:** Complete ✅

**Goal:** Provide a publishing agent script that takes a validated draft edition, writes the archive file, atomically updates the current-edition pointer, runs quality checks, commits, pushes, and optionally verifies Cloudflare Pages deployment.

### What was created

| File                               | Purpose                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `scripts/publish-edition.ts`       | Publishing agent CLI.                                                                   |
| `scripts/lib/git.ts`               | Minimal git helpers (`stageFiles`, `commit`, `push`, `getHeadSha`, `getCurrentBranch`). |
| `scripts/lib/validation-report.ts` | Reusable `validateEdition()` report builder used by the publishing agent.               |

### What was modified

| File           | Change                              |
| -------------- | ----------------------------------- |
| `package.json` | Added `publish:edition` npm script. |

### Design decisions

- **Draft-first workflow:** The script reads a draft JSON file (e.g., from `drafts/YYYY-MM-DD.json`), validates it, then copies it into the canonical locations. This matches the agent handoff from the Compilation/Validation agents.
- **Atomic current-edition replacement:** The script overwrites `public/data/current-edition.json` after the archive copy is written, so a failed validation never leaves the live pointer pointing at a bad file.
- **Pre-publish quality gate:** Before committing, the script runs `validate:edition`, `lint`, `tsc --noEmit`, and `build`. If any step fails, the script exits without pushing.
- **Git-aware but not git-mutating in dry-run:** `--dry-run` prints every file change and command that would run, making it safe to test in CI or locally.
- **Optional Cloudflare Pages polling:** If `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set, the script polls the Pages deployments API for the commit SHA. Otherwise it logs that the check is skipped.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
npm run publish:edition -- --draft public/data/current-edition.json --date 2025-05-21 --dry-run --skip-deploy-check
```

### Verification snippet

Dry-run output:

```text
[dry-run] Reading draft: .../public/data/current-edition.json
✅ Valid edition
   editionId:    ed-2025-05-20-global
   editionDate:  2025-05-20
   editionNumber: 42
[dry-run] Publishing edition ed-2025-05-20-global (#42) for 2025-05-21

Dry-run — would perform the following:
  cp public/data/current-edition.json .../public/data/editions/2025-05-21.json
  cp public/data/current-edition.json .../public/data/current-edition.json
  bun run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-21.json
  bun run lint
  bunx tsc --noEmit
  bun run build
  git add public/data/editions/2025-05-21.json public/data/current-edition.json
  git commit -m "edition(publish): 2025-05-21 (#42)"
  git push origin feature/json-driven-publishing-plan
  poll Cloudflare Pages deployment (if credentials present)
```

### Notes / blockers

- The real (non-dry-run) script runs `bun` commands. In environments without `bun`, the script can be updated to use `npm run` instead.
- Cloudflare Pages polling is a placeholder implementation; it needs the Pages project name and API token to be fully functional.
- The script assumes the current working directory is the repository root and that `git` is configured.

### Next step

Phase 10: create `wrangler.toml`, configure Cloudflare Pages bindings, and enable the deploy workflow.

---

## Phase 10 — Cloudflare Pages and Wrangler Config

**Status:** Complete ✅

**Goal:** Add Cloudflare Pages / Wrangler configuration so the project can be deployed to Pages with KV and D1 bindings wired up.

### What was created

| File                | Purpose                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `wrangler.toml`     | Cloudflare Pages configuration with KV, D1, public vars, and a placeholder for secrets. |
| `.dev.vars.example` | Template for local-only secrets.                                                        |

### What was modified

| File                           | Change                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                 | Added `deploy` script: `wrangler pages deploy .output/public --project-name=morning-wire`.                                                                                                     |
| `.github/workflows/deploy.yml` | Added a `deploy` job that builds the app and deploys `.output/public` to Cloudflare Pages using `cloudflare/wrangler-action@v3`. It runs only on `main`/`master` after the build job succeeds. |

### Design decisions

- **Placeholder IDs:** `wrangler.toml` contains `REPLACE_WITH_KV_NAMESPACE_ID` and `REPLACE_WITH_D1_DATABASE_ID`. The config is valid and ready to use once the real IDs are filled in from the Cloudflare dashboard.
- **`.output/public` build output:** Matches the planned TanStack Start / nitro output directory for Cloudflare Pages. Local Vite builds still output to `dist/` for static preview.
- **Secrets via `wrangler secret put`:** `ADMIN_TOKEN` is not committed; it is set through Wrangler or the dashboard.
- **GitHub Actions secrets:** The deploy job expects `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
```

### Verification snippet

- `wrangler.toml` exists with `name = "morning-wire"`, KV binding `KV`, D1 binding `DB`, and vars `EDITION_SCHEMA_VERSION` / `SITE_URL`.
- `.github/workflows/deploy.yml` now has a `deploy` job using `cloudflare/wrangler-action@v3`.
- `.dev.vars.example` is tracked; `.dev.vars` is gitignored.

### Notes / blockers

- Actual deployment will fail until the KV namespace and D1 database are created and their IDs are inserted into `wrangler.toml`.
- The project name in the workflow (`morning-wire`) must match the Cloudflare Pages project name.
- Local `wrangler pages dev` is not tested because D1/KV bindings are not yet provisioned.

### Next step

Phase 11: decide where the generation pipeline runs. The final decision is on your machine; Cloudflare only hosts the built site.

---

## Phase 11 — Local Generation and Publishing Agent

**Status:** Complete ✅ (revised: no Cloudflare Cron Worker)

**Goal:** Make generation and publishing run locally on your machine, then push a validated edition JSON to git so Cloudflare Pages rebuilds the site.

### Decision change

The original plan called for a separate Cloudflare Cron Worker (`workers/cron/`). That has been removed. Generation runs on your machine and the site update flows through git, not through a scheduled Worker.

### What is used instead

| File                          | Purpose                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/publish-edition.ts`  | Local Publishing Agent: validates a draft JSON, writes archive + current edition, tests, commits, pushes, and optionally polls the Pages deployment. |
| `scripts/rollback-edition.ts` | Local Rollback Agent: restores a historical edition, runs checks, commits, pushes.                                                                   |
| `scripts/lib/logger.ts`       | Structured JSON logger for both agents.                                                                                                              |

### Design decisions

- **Your machine is the agent runner.** You produce a draft edition JSON and hand it to `npm run publish:edition`.
- **Git is the deployment trigger.** Committing and pushing `public/data/current-edition.json` causes Cloudflare Pages to rebuild and publish.
- **Validation before commit.** The Publishing Agent refuses to commit unless the edition passes schema + business-rule checks, lint, typecheck, tests, and build.
- **Scheduling is your choice.** Use cron, LaunchAgent, calendar node, or any scheduler on your machine to call the Publishing Agent.

### Validation results

```bash
npm run publish:edition -- --draft examples/example-edition.json --date 2025-05-20 --dry-run --skip-deploy-check
# ✅ Dry-run prints all steps without side effects

npm run rollback:edition -- --date 2025-05-20 --dry-run --verify
# ✅ Dry-run prints rollback steps
```

### Commands that passed

```bash
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run test          # 35 tests pass
npm run build         # client + server builds succeed
```

### Notes

- The `workers/cron/` directory and the `generation_jobs` D1 migration have been removed.
- `PUBLISH_WEBHOOK` / `NOTIFICATION_WEBHOOK` logic from the old Worker is no longer present; if you want notifications, you can add a webhook call to the Publishing Agent later.

### Next step

Phase 12: security hardening (rate limiting, admin auth, input sanitization, secret isolation).

---

## Phase 12 — Security Hardening

**Status:** Complete ✅

**Goal:** Lock down admin endpoints, add KV-backed rate limiting, ensure secrets stay server-side, and document security practices.

### What was created

| File                               | Purpose                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/rate-limit.ts`            | KV-backed sliding-window rate limiter used by admin routes.                                                                                |
| `src/routes/api/admin/generate.ts` | POST `/api/admin/generate` protected by `ADMIN_TOKEN` and rate-limited to 5 requests/hour per client IP.                                   |
| `src/routes/api/admin/rollback.ts` | POST `/api/admin/rollback` protected by `ADMIN_TOKEN`, rate-limited, and copies a historical edition to `current-edition.json` in SSR/dev. |

### What was modified

| File           | Change                                                |
| -------------- | ----------------------------------------------------- |
| `src/env.d.ts` | Added `ADMIN_TOKEN` to the `CloudflareEnv` interface. |

### Design decisions

- **Bearer token auth:** Admin routes read `Authorization: Bearer <token>` and compare it to `env.ADMIN_TOKEN` (Cloudflare binding) or `process.env.ADMIN_TOKEN` (local dev). If no token is configured, requests are rejected.
- **Rate limiting with KV:** `createRateLimiter` stores a counter key (`rate:{context}:{identifier}`) in KV with a 1-hour TTL. This limits `/api/admin/generate` to 5 calls per hour per IP.
- **Graceful degradation:** If KV is not bound, the rate limiter allows the request and logs a warning so local dev still works.
- **No secrets in client bundles:** `ADMIN_TOKEN` is never referenced from `import.meta.env.VITE_*` or passed to the browser. It lives only in server route code and Wrangler secrets.
- **Input sanitization:** All user-facing text is still validated by the canonical Zod schema (no HTML/JS/event handlers). Admin routes validate JSON bodies and date formats.
- **Source allowlist:** Already enforced by `validate:edition --production` from Phase 8.

### Validation results

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
# ✅ Valid edition (current)
# ✅ Valid edition (2025-05-20 archive)
# ✅ Valid edition (examples)
```

### Commands that passed

```bash
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
```

### Verification snippet

With `ADMIN_TOKEN=test-token npm run dev` running on port 8084:

```bash
curl -s -X POST http://localhost:8084/api/admin/generate
# {"error":"Unauthorized"}

curl -s -X POST -H "Authorization: Bearer wrong" http://localhost:8084/api/admin/generate
# {"error":"Unauthorized"}

curl -s -X POST -H "Authorization: Bearer test-token" http://localhost:8084/api/admin/generate
# {"ok":true,"jobId":"job-...","message":"Generation request accepted."}
```

### Notes / blockers

- The rollback endpoint uses `node:fs` to overwrite `public/data/current-edition.json`. This works in local SSR/dev but not in Cloudflare Pages Functions, where the filesystem is read-only. A production rollback should be performed by the Publishing Agent (`scripts/publish-edition.ts`) or via git revert.
- Rate-limit identifiers rely on `CF-Connecting-IP`. In local dev this is `unknown`, so all local requests share one bucket; set `ADMIN_TOKEN` only when testing.

### Next step

Phase 13: add tests for the schema, layout helper, and validation CLI.

---

## Phase 13 — Testing

**Status:** Complete ✅

**Goal:** Add unit test coverage for the schema, layout derivation, API client, and JSON-driven components, plus a CI workflow that runs them.

### What was created

| File                                           | Purpose                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `vitest.config.ts`                             | Vitest configuration with jsdom environment and `@/` path resolution.         |
| `src/test/setup.ts`                            | Registers `@testing-library/jest-dom` matchers.                               |
| `src/test/fixtures.ts`                         | Minimal valid `NewspaperEdition` fixture for tests.                           |
| `src/test/router.tsx`                          | Test helper for components that need TanStack Router context.                 |
| `src/lib/schema.test.ts`                       | Schema and business-rule tests (valid/invalid/unsafe content/duplicate IDs).  |
| `src/lib/layout.test.ts`                       | Front-page layout derivation tests.                                           |
| `src/lib/api.test.ts`                          | Server-side loader and API client tests.                                      |
| `src/components/newspaper/components.test.tsx` | Component tests for `Masthead`, `UtilityBar`, `SiteFooter`, and `SectionNav`. |
| `.github/workflows/test.yml`                   | CI workflow that runs tests, lint, typecheck, and build.                      |

### What was modified

| File                | Change                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`      | Added `test`, `test:watch`, and `test:e2e` scripts; added `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/dom` dev dependencies.                                                               |
| `tsconfig.json`     | Added `vitest/globals` and `@testing-library/jest-dom` to `compilerOptions.types`.                                                                                                                                                         |
| `src/lib/schema.ts` | Hardened URL validation: `source.url`, `originalUrl`, `canonicalUrl`, market/weather `sourceUrl`, banner/footer links must be HTTPS or root-relative, and forbidden protocols (`javascript:`, `data:`, `vbscript:`, `file:`) are rejected. |

### Design decisions

- **Vitest + jsdom:** Chosen because it integrates cleanly with the existing Vite setup and supports React Testing Library without a separate Jest configuration.
- **Fixture-driven tests:** A single minimal valid edition fixture keeps schema tests focused and avoids depending on production JSON files.
- **Server-side API tests:** `api.test.ts` uses the `// @vitest-environment node` directive so `isServer()` returns `true` and exercises the filesystem loader path.
- **Component mocking:** Router-dependent components are tested with a lightweight `vi.mock` of `@tanstack/react-router` rather than spinning up a full router, keeping tests fast and stable.
- **URL hardening:** While writing the unsafe-content tests, the schema was tightened so `javascript:` URLs fail validation at the schema level rather than relying solely on the plain-text regex.

### Validation results

```bash
npm run test
# Test Files  4 passed (4)
# Tests       35 passed (35)
```

### Commands that passed

```bash
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
npm run lint          # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit      # no TypeScript errors
npm run build         # client + server builds succeed
```

### Test coverage highlights

- ✅ Valid edition passes schema and business rules.
- ✅ Missing or mismatched `schemaVersion` is rejected.
- ✅ HTML/event-handler strings are rejected in plain-text fields.
- ✅ `javascript:` URLs are rejected.
- ✅ Missing `image.alt` is rejected.
- ✅ Duplicate article ids/slugs and broken `leadStoryId` / section / related / briefing references are rejected.
- ✅ Layout helper derives lead/left/right columns and excludes the lead story from side columns.
- ✅ API loaders read current, historical, and index JSON; article lookup and search work server-side.
- ✅ `Masthead`, `UtilityBar`, `SiteFooter`, and `SectionNav` render JSON-driven content.

### Notes / blockers

- **E2E tests are not implemented yet.** The `test:e2e` script prints a placeholder message. Playwright smoke tests can be added later without blocking the build.
- The component test for `SectionNav` mocks `useLocation` to verify active-state styling.

### Next step

Phase 14: monitoring and rollback tooling (rollback script, structured logging, deployment notifications).

---

## Phase 14 — Monitoring and Rollback Tooling

**Status:** Complete ✅

**Goal:** Make production failures recoverable without manual code edits, add structured logging to agents, and wire deployment notifications.

### What was created

| File                          | Purpose                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `scripts/rollback-edition.ts` | Rollback Agent: copies a historical edition to `current-edition.json`, optionally runs validation/tests, commits, and pushes. |
| `scripts/lib/logger.ts`       | Structured JSON logger shared by the Publishing and Rollback agents.                                                          |

### What was modified

| File                         | Change                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `package.json`               | Added `rollback:edition` script.                                                                                            |
| `scripts/publish-edition.ts` | Replaced ad-hoc `console.log` output with structured JSON logging; added `npm run test` to the pre-publish checks.          |
| `workers/cron/src/index.ts`  | Replaced ad-hoc `console.log/error` with structured JSON logs; added optional `NOTIFICATION_WEBHOOK` post-job notification. |
| `.github/workflows/test.yml` | CI workflow now runs unit tests, lint, typecheck, and build on every push/PR.                                               |

### Design decisions

- **Rollback workflow:** The rollback script mirrors the Publishing Agent's safety checks: validate the historical file, copy it to `current-edition.json`, run lint/typecheck/tests/build if `--verify` is passed, then commit and push with the `edition(rollback):` convention.
- **Dry-run support:** Both agents support `--dry-run` and print the exact steps they would execute, making them safe to test in CI or locally.
- **Structured JSON logging:** All agent logs are single-line JSON objects with `timestamp`, `level`, `message`, `service`, and relevant metadata. This makes them compatible with log aggregation services without extra parsing.
- **Deployment verification:** The Publishing Agent polls Cloudflare Pages deployments by commit SHA when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set.
- **Admin rollback endpoint:** `/api/admin/rollback` (from Phase 12) remains protected by `ADMIN_TOKEN` and KV rate-limiting. The new script provides a git-based rollback path for production.

### Validation results

```bash
npm run rollback:edition -- --date 2025-05-20 --dry-run --verify
# {"timestamp":"...","level":"info","message":"Dry-run — would perform rollback",...}

npm run publish:edition -- --draft examples/example-edition.json --date 2025-05-20 --dry-run --skip-deploy-check
# {"timestamp":"...","level":"info","message":"Dry-run complete",...}
```

### Commands that passed

```bash
npm run test            # 35 tests pass
npm run lint            # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit        # no TypeScript errors
npm run build           # client + server builds succeed
npm run validate:edition -- public/data/current-edition.json public/data/editions/2025-05-20.json examples/example-edition.json
```

### Rollback acceptance criteria

- ✅ `rollback:edition` dry-run prints all intended steps without side effects.
- ✅ Real rollback would copy the archive file to `current-edition.json`, run checks with `--verify`, commit, and push.
- ✅ Admin rollback endpoint is protected and rate-limited.
- ✅ Publishing and rollback agents emit structured JSON logs.

### Notes / blockers

- **Filesystem rollback in Pages Functions:** The `/api/admin/rollback` endpoint writes `public/data/current-edition.json` using `node:fs`, which works locally but not in Cloudflare Pages Functions. The script-based rollback (`npm run rollback:edition`) is the production-grade path.
- **Webhook notifications are opt-in:** If you want external notifications, add a webhook call to the Publishing Agent or your local scheduler.
- **E2E / Playwright tests remain future work** and are documented as a placeholder.

### Definition of Done progress

All phases required to make the app "ready for agent setup" are now complete:

- ✅ Canonical JSON schema and TypeScript contract
- ✅ JSON content files and loaders
- ✅ Metadata adapters and dynamic layout
- ✅ Section/article pages from JSON
- ✅ Pages Functions and API routes
- ✅ D1 stubs with localStorage fallback
- ✅ Validation CLI and CI checks
- ✅ Publishing automation
- ✅ Cloudflare Pages / Wrangler configuration
- ✅ Local Publishing Agent generation pipeline (no Cloudflare Cron Worker)
- ✅ Security hardening
- ✅ Unit tests and CI workflow
- ✅ Monitoring and rollback tooling

The next major workstream (outside this build phase) is agent setup and integration.

---

## Phase 15 — News Aggregation Scripts

**Status:** Complete ✅

**Goal:** Create dedicated, source-specific news aggregation scripts that make real HTTP API calls, normalize the results, and can be validated automatically.

### What was created

| File                                       | Purpose                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/scripts/lib/types.ts`             | Shared `NormalizedArticle` and `AggregationResult` types.                                                                                             |
| `backend/scripts/lib/env.ts`               | Loads `.env` and provides `getEnv()` / `requireEnv()`.                                                                                                |
| `backend/scripts/lib/fetch.ts`             | Shared `fetchJson()`, `buildResult()`, `printResult()`, and `saveResult()` helpers.                                                                   |
| `backend/scripts/hackernews-front-page.ts` | Fetches Hacker News front page via Algolia; no API key.                                                                                               |
| `backend/scripts/spaceflight-science.ts`   | Fetches space/science articles from Spaceflight News API; no API key.                                                                                 |
| `backend/scripts/guardian-*.ts`            | Fetches world, technology, business, and science from The Guardian Open Platform; falls back to the public `test` key when `GUARDIAN_KEY` is not set. |
| `backend/scripts/newsapi-*.ts`             | Fetches general, technology, business, and science from NewsAPI.                                                                                      |
| `backend/scripts/gnews-*.ts`               | Fetches general, technology, and business from GNews.                                                                                                 |
| `backend/scripts/newsdata-*.ts`            | Fetches world, technology, and business from NewsData.io.                                                                                             |
| `backend/scripts/currents-*.ts`            | Fetches technology and business from Currents API.                                                                                                    |
| `backend/scripts/worldnewsapi-*.ts`        | Fetches technology and business from World News API.                                                                                                  |
| `backend/scripts/mediastack-*.ts`          | Fetches technology and business from Mediastack.                                                                                                      |
| `backend/scripts/validate.ts`              | Runs every aggregation script and prints a status table plus a JSON report.                                                                           |
| `backend/scripts/README.md`                | Source inventory, usage, output format, and environment-variable docs.                                                                                |
| `.env.example`                             | Template for all required API keys.                                                                                                                   |

### What was modified

| File            | Change                                                          |
| --------------- | --------------------------------------------------------------- |
| `package.json`  | Added `validate:aggregation` script and `dotenv` devDependency. |
| `tsconfig.json` | Added `backend/**/*.ts` to `include` and `"node"` to `types`.   |

### Design decisions

- **One script per source/category:** Each file is self-contained, imports shared helpers, and exports an `aggregate()` function so it can be run standalone or imported by the validation runner.
- **No RSS:** All scripts call REST APIs directly.
- **Normalized output:** Every script emits the same `AggregationResult` shape, making it easy to feed results into the edition compiler later.
- **Graceful key handling:** Scripts that require an API key throw a clear `Missing environment variable` error; the validation runner reports these as "missing key" rather than failures.
- **Guardian fallback:** The Guardian allows unauthenticated development requests with the `test` key, so those scripts fall back to `test` when `GUARDIAN_KEY` is not set. This lets the scripts validate immediately while still supporting a production key.
- **Reddit removed:** Reddit's public JSON endpoints now return 403 without OAuth, so the Reddit scripts were removed and replaced with working no-key sources (Hacker News, Spaceflight News API, and Guardian test key).

### Validation results

```bash
npm run validate:aggregation
# Summary: 6 ok, 20 missing key, 0 error
#
# OK sources without keys:
#   - hackernews/front-page (20 articles)
#   - spaceflight/science (25 articles)
#   - guardian/world, technology, business, science (25 articles each)
#
# Missing-key sources (add keys to .env to enable):
#   - newsapi, gnews, nytimes, newsdata, currents, worldnewsapi, mediastack
```

### Commands that passed

```bash
npm run validate:aggregation   # 6 ok, 20 missing key, 0 error
npm run lint                   # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit               # no TypeScript errors
```

### Notes / blockers

- The 20 "missing key" statuses are expected because no `.env` file with production API keys exists yet. Once keys are added, those scripts will return live articles.
- The validation runner intentionally ignores `tsx`'s env-injection prefix when parsing JSON output, so stdout chatter does not break the report.
- The next step is to wire these aggregation scripts into the Publishing Agent so it can compile normalized articles into an edition JSON draft.

---

## Phase 16 — Article Ingest Pipeline and Local SQLite Database

**Status:** Complete ✅

**Goal:** Run every aggregation script sequentially, store the normalized articles in a local database, and give the AI publishing agent a queryable article pool.

### What was created

| File                               | Purpose                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/scripts/lib/db.ts`        | `node:sqlite` wrapper: opens `backend/db/news.db`, initializes schema, inserts/query articles, and tracks ingest runs.                                                         |
| `backend/scripts/lib/runner.ts`    | Shared `runScript()` helper used by both the validation runner and the compiler. Returns a discriminated union so callers can safely narrow success vs. missing-key vs. error. |
| `backend/scripts/compile-to-db.ts` | Data compiler: discovers every aggregation script, runs them one at a time, and inserts fetched articles into SQLite.                                                          |
| `backend/db/news.db`               | Local SQLite database created on first ingest (gitignored).                                                                                                                    |

### What was modified

| File                          | Change                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `backend/scripts/validate.ts` | Refactored to use the shared `runner.ts` helper instead of duplicating spawn/parse logic. |
| `.gitignore`                  | Added `backend/db/*.db` and `backend/db/*.db-*` so the local database is never committed. |
| `package.json`                | Added `ingest:articles` script.                                                           |
| `backend/scripts/README.md`   | Added ingest, schema, and database-querying documentation.                                |

### Design decisions

- **Sequential execution:** `compile-to-db.ts` runs scripts one at a time to avoid hammering APIs and to keep logs readable.
- **Built-in SQLite:** Uses Node's native `node:sqlite` module, so no extra native dependency is needed.
- **Run tracking:** Each ingest creates a `runs` row with counts, making it easy to see what succeeded and when.
- **Per-run deduplication:** `articles` has a unique index on `(runId, url)`, so the same article arriving from multiple scripts within one run is stored only once.
- **Missing-key tolerance:** Scripts without configured keys are logged but do not stop the pipeline; the agent can still work with whatever sources are available.

### Validation results

```bash
npm run ingest:articles
# Starting ingest run #2 for 26 scripts...
# ✅ guardian/business: 25 fetched, 25 inserted (0 dupes)
# ✅ guardian/science: 25 fetched, 25 inserted (0 dupes)
# ✅ guardian/technology: 25 fetched, 25 inserted (0 dupes)
# ✅ guardian/world: 25 fetched, 25 inserted (0 dupes)
# ✅ hackernews/front-page: 20 fetched, 20 inserted (0 dupes)
# ✅ spaceflight/science: 25 fetched, 25 inserted (0 dupes)
# ⏸️ (20 scripts skipped due to missing API keys)
# Run #2: 6 ok, 20 missing key, 0 error
# Articles inserted this run: 145
# Database totals: 2 runs, 145 articles
```

```bash
npm run validate:aggregation
# Summary: 6 ok, 20 missing key, 0 error
```

### Commands that passed

```bash
npm run ingest:articles
npm run validate:aggregation
npm run lint                   # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit               # no TypeScript errors
npm run test                   # 35 tests pass
npm run build                  # client + server builds succeed
```

### Notes / blockers

- The database file is local-only and gitignored. If you move to a different machine or CI, you'll need to rerun `npm run ingest:articles` to populate it.
- 20 sources are still waiting on API keys. Once keys are added to `.env`, the same pipeline will ingest from all 26 scripts.
- The next step is to build the AI edition compiler that reads from `backend/db/news.db` and produces a `drafts/edition-YYYY-MM-DD.json` file.

---

## Phase 17 — Interactive Typography with Pretext

**Status:** Complete ✅

**Goal:** Review Cheng Lou's `pretext` library and integrate its text-measurement/layout engine so the newspaper can break out of rigid rectangular text boxes.

### What is Pretext?

Pretext (`@chenglou/pretext`) is a small, browser-native text measurement and layout library. It splits text into segments, measures them once with an off-screen canvas, then exposes fast, pure-arithmetic layout functions. The key benefit for this project is `layoutNextLineRange()`, which lets you flow text one line at a time with a _different available width per line_ — perfect for wrapping copy around images, charts, or other obstacles without relying on CSS hacks.

### What was created

| File                                            | Purpose                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/pretext/PretextCanvasText.tsx`  | Canvas-based renderer that uses Pretext to flow a paragraph around draggable rectangular obstacles. Supports pointer drag and DPR-aware rendering.                                  |
| `src/components/pretext/FitText.tsx`            | DOM headline component that uses Pretext + binary search to fit text to a container width/height and line limit, reacting to resize.                                                |
| `src/components/pretext/PretextWrappedText.tsx` | DOM body-text component that uses Pretext to flow paragraphs around fixed rectangular obstacles (e.g., images). Renders real selectable `<span>`s plus a visually-hidden full copy. |
| `src/components/pretext/index.ts`               | Public exports for the components.                                                                                                                                                  |
| `src/routes/pretext-demo.tsx`                   | Demo page at `/pretext-demo` with a `FitText` headline and an interactive canvas paragraph that wraps around a draggable box.                                                       |

### What was modified

| File                                           | Change                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                                 | Added `@chenglou/pretext` dependency.                                                                                                                                                                        |
| `routeTree.gen.ts`                             | Auto-regenerated by TanStack Router to include `/pretext-demo`.                                                                                                                                              |
| `src/components/newspaper/LeadStory.tsx`       | `FitText` headline; eyebrow `FitText`; summary wrapped around the lead image with `PretextWrappedText`.                                                                                                      |
| `src/components/newspaper/SidebarStory.tsx`    | `FitText` headline and eyebrow.                                                                                                                                                                              |
| `src/components/newspaper/RightStory.tsx`      | `FitText` headline and eyebrow; summary wrapped around the thumbnail with `PretextWrappedText`.                                                                                                              |
| `src/components/newspaper/Masthead.tsx`        | Masthead title and tagline now use `FitText`.                                                                                                                                                                |
| `src/components/newspaper/MorningBriefing.tsx` | Section heading uses `FitText`.                                                                                                                                                                              |
| `src/components/newspaper/AIEditorsNote.tsx`   | Section heading uses `FitText`.                                                                                                                                                                              |
| `src/components/newspaper/WeatherStrip.tsx`    | "Weather Overview" heading uses `FitText`.                                                                                                                                                                   |
| `src/routes/article.$slug.tsx`                 | `FitText` on `<h1>`, category eyebrow, and every section `<h2>`; hero image moved into the summary and wrapped with `PretextWrappedText`; 404 title uses `FitText`.                                          |
| `src/routes/section.$category.tsx`             | `FitText` on masthead eyebrow/title, lead headline, lead eyebrow, sidebar headings, and "Key points"; lead summary wrapped around the image with `PretextWrappedText`; unknown-section title uses `FitText`. |
| `src/routes/editions.tsx`                      | `FitText` page eyebrow/title and archive list headlines.                                                                                                                                                     |
| `src/routes/saved.tsx`                         | `FitText` page eyebrow/title.                                                                                                                                                                                |
| `src/routes/search.tsx`                        | `FitText` page eyebrow/title.                                                                                                                                                                                |
| `src/routes/settings.tsx`                      | `FitText` page eyebrow/title and each section `<h2>` title.                                                                                                                                                  |
| `src/components/newspaper/components.test.tsx` | Mocked `@/components/pretext` so component tests run without a canvas implementation in jsdom.                                                                                                               |

### Design decisions

- **Canvas for layout freedom, DOM for accessibility:** The canvas demo trades native text selection for the ability to wrap around arbitrary obstacles. A visually-hidden plain-text copy can be added for screen readers if this moves to production article pages.
- **FitText for every headline:** `FitText` was promoted from the demo into all headline sites — home lead, sidebar/right cards, article page, section masthead/lead, and all static page titles. It renders a semantic `<span>` inside the existing `<h1>` / `<h2>` / `<h3>`, runs only on the client, and recalculates on resize.
- **Default image wrapping with CSS floats:** Story cards, the home lead story, the section lead, and the article page now use `float-right` figures inside `flow-root` containers. This is the browser's native text-wrapping behavior, so _all_ text — eyebrow, headline, byline, meta, summary — wraps around the image by default without JavaScript.
- **PretextWrappedText for advanced shapes:** `PretextWrappedText` is kept as a reusable component for non-rectangular or interactive wraps, but the default image/text pairing uses CSS floats because they are reliable, accessible, and work before hydration.
- **Client-only:** Pretext needs `Intl.Segmenter` and Canvas 2D, which are unavailable during SSR. Components guard against server rendering and only prepare/measure on the client.
- **Named system fonts:** Pretext warns that `system-ui` is unreliable on macOS, so production headlines use `"Playfair Display", Georgia, serif` and body copy uses `"Source Sans 3", system-ui, Arial, sans-serif` for predictable measurements.
- **Tuned per context:** Each headline site has its own `minFontSize`, `maxFontSize`, `maxLines`, and `lineHeightRatio`; each wrapped summary has font size and line height matching its CSS slot.
- **Obstacles relative to the container:** `PretextWrappedText` accepts obstacles with `right`/`bottom` offsets so the parent doesn't need to know the exact container width to place a right-aligned image.
- **Reusable building blocks:** `FitText` can be dropped onto any headline, `PretextWrappedText` can wrap any paragraph around rectangular media, and `PretextCanvasText` can accept draggable obstacles for more complex editorial spreads.

### Validation results

```bash
npm run dev -- --port 3000
open -a "Chromium" "http://localhost:3000/"
# Homepage loads; masthead, lead, sidebar, and right-column headlines scale to their slots.
# The lead story summary wraps around the lead image; right-column summaries wrap around thumbnails.

open -a "Chromium" "http://localhost:3000/article/global-cities-race-climate"
# Article page loads; the <h1> fits neatly and the AI summary wraps around the hero image.

open -a "Chromium" "http://localhost:3000/section/world"
# Section page loads; masthead, lead headline, and sidebar headings scale; lead summary wraps around the image.

open -a "Chromium" "http://localhost:3000/saved"
open -a "Chromium" "http://localhost:3000/search"
open -a "Chromium" "http://localhost:3000/settings"
open -a "Chromium" "http://localhost:3000/editions"
# Static page titles and settings section titles are flush and consistent.

open -a "Chromium" "http://localhost:3000/pretext-demo"
# Demo still works: headline scales and the paragraph reflows around the draggable obstacle.
```

### Commands that passed

```bash
npm run format     # all touched files formatted
npm run lint       # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit   # no TypeScript errors
npm run test       # 35 tests pass
npm run build      # client + server builds succeed
```

### Notes / blockers

- `FitText` is now applied to virtually every heading/eyebrow in the app: masthead, navigation page titles, article/section/lead headlines, card headlines, section sidebar headings, and static page titles.
- Every story image now floats right inside a `flow-root` container, so all text in the card/article wraps around it by default. This applies to the home lead story, homepage right-column cards, section lead, and article-page hero image.
- Because canvas text is not selectable, production integration of `PretextCanvasText` should pair it with a hidden semantic copy.
- Pretext does not yet support server-side rendering; any full-page canvas use must remain client-rendered.
- Component tests mock `@/components/pretext` so they don't need a canvas implementation in jsdom.

---

## Phase 18 — Ladder Proxy for Paywalled Sources

**Status:** Complete ✅

**Goal:** Integrate the Ladder HTTP proxy so the news pipeline can fetch full articles from openly accessible publishers by scraping their section pages and routing each article through Ladder for extraction. Hard-paywalled publishers (NYTimes, WSJ, FT, The Economist) are intentionally excluded because they cannot be fetched reliably without a subscription.

### What was created

| File                                           | Purpose                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.ladder.yml`                    | Runs Ladder on host port `8081` and FlareSolverr on `8191`, with a mounted local rules directory.                         |
| `backend/scripts/lib/ladder-rules/`            | Local Ladder ruleset: downloaded community rules plus custom `useFlareSolverr` flags for the target publishers.           |
| `backend/scripts/lib/ladder.ts`                | `fetchViaLadder(url)` and `isLadderConfigured()` helpers. Reads `LADDER_URL` from `.env`.                                 |
| `backend/scripts/lib/extract.ts`               | `extractArticleFromHtml()` using `@mozilla/readability` + `jsdom`; returns title, byline, summary, image, date, language. |
| `backend/scripts/lib/ladder-source.ts`         | Shared `aggregateFromLadderPages()` runner; supports Ladder or Firecrawl per page.                                        |
| `backend/scripts/lib/firecrawl.ts`             | `fetchViaFirecrawl()` helper for publishers that block Ladder. Supports no-key and API-key usage.                         |
| `backend/scripts/ladder-washingtonpost.ts`     | Scrapes Washington Post section pages and extracts articles via Ladder.                                                   |
| `backend/scripts/ladder-reuters-world.ts`      | Scrapes Reuters World section and extracts articles via Firecrawl.                                                        |
| `backend/scripts/ladder-reuters-business.ts`   | Scrapes Reuters Business section and extracts articles via Firecrawl.                                                     |
| `backend/scripts/ladder-reuters-technology.ts` | Scrapes Reuters Technology section and extracts articles via Firecrawl.                                                   |
| `backend/scripts/ladder-techcrunch.ts`         | Scrapes TechCrunch category pages and extracts articles via Ladder.                                                       |
| `backend/scripts/ladder-macrumors.ts`          | Scrapes MacRumors section pages and extracts articles via Ladder.                                                         |
| `backend/scripts/ladder-theverge.ts`           | Scrapes The Verge section pages and extracts articles via Ladder.                                                         |
| `backend/scripts/ladder-arstechnica.ts`        | Scrapes Ars Technica section pages and extracts articles via Ladder.                                                      |
| `backend/scripts/ladder-theregister.ts`        | Scrapes The Register section pages and extracts articles via Ladder.                                                      |
| `backend/scripts/ladder-9to5mac.ts`            | Scrapes 9to5Mac section pages and extracts articles via Ladder.                                                           |

### What was modified

| File                               | Change                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `package.json`                     | Added `@mozilla/readability` and `@types/jsdom` devDependencies; added `ladder:up` / `ladder:down` scripts. |
| `.env.example`                     | Added `LADDER_URL=http://localhost:8081`.                                                                   |
| `backend/scripts/README.md`        | Added Ladder setup, source inventory, and legal/ToS disclaimer.                                             |
| `backend/scripts/validate.ts`      | Already supports the new scripts; `LADDER_URL` missing results in `missing-key` status.                     |
| `backend/scripts/compile-to-db.ts` | Already discovers and runs the new scripts via `listScriptFiles()`.                                         |

### Design decisions

- **Ladder + FlareSolverr run locally via Docker.** Ladder strips paywall scripts and rewrites requests; FlareSolverr solves Cloudflare / bot challenges for publishers that require it. The stack binds Ladder to host port `8081` to avoid the dev server on `8080`.
- **`LADDER_URL` is optional.** If it is not set or Ladder is unreachable, the new scripts report `missing-key` and the rest of the pipeline keeps working.
- **Page scraping discovery.** Scripts fetch publisher section pages through Ladder or Firecrawl, extract article links with site-specific regexes, and then fetch each article page through the same fetcher for Readability extraction.
- **Firecrawl for bot-challenged publishers.** Reuters serves a captcha/bot challenge that Ladder cannot solve from this network, so Reuters scripts route through Firecrawl. Firecrawl works without an API key from many IPs; an optional `FIRECRAWL_API_KEY` can be added to `.env` if an IP is flagged.
- **Hard-paywalled publishers excluded.** NYTimes, WSJ, FT, and The Economist were tested and could not be fetched reliably without a subscription, so they are not supported by these scripts.
- **Ladder link rewriting handled.** Ladder rewrites `href` values so links are browsable through the proxy UI (e.g. `/https://example.com//article`). The runner unwraps and normalizes those back to absolute publisher URLs.
- **Fail-soft extraction.** If a single article fails to parse, the script logs the error and continues with the rest of the feed.
- **Plain-text summaries.** Readability returns HTML content; we strip tags to match the existing `summary` field format.
- **Legal disclaimer included.** The README clearly states that users must comply with publisher terms and applicable law.

### Commands that passed

```bash
npm install -D @mozilla/readability @types/jsdom
npm run format     # all touched files formatted
npm run lint       # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit   # no TypeScript errors
npm run test       # 35 tests pass
npm run build      # client + server builds succeed
```

### Usage

```bash
# Start Ladder
npm run ladder:up

# Validate all aggregation scripts (Ladder scripts will show ok if Ladder is running)
npm run validate:aggregation

# Ingest articles into the local SQLite database
npm run ingest:articles

# Stop Ladder
npm run ladder:down
```

### Notes / blockers

- Ladder must be running and reachable for the new scripts to return articles. If it is not running, they are reported as `missing-key` and skipped.
- Live test results (current network / IP):
  - ✅ TechCrunch — full articles extracted.
  - ✅ MacRumors — full articles extracted.
  - ✅ Washington Post — full articles extracted.
  - ✅ The Verge — full articles extracted.
  - ✅ Ars Technica — full articles extracted.
  - ✅ The Register — full articles extracted.
  - ✅ 9to5Mac — full articles extracted.
  - ✅ Reuters World — full articles extracted via Firecrawl.
  - ✅ Reuters Business — full articles extracted via Firecrawl.
  - ✅ Reuters Technology — full articles extracted via Firecrawl.
- The new scripts are intended for legitimate research/QA use only, as noted in the Ladder README and the project disclaimer.

---

## Phase 19 — Free Publisher Scrapers via Ladder, RSS, and Firecrawl Fallback

**Status:** Complete ✅

**Goal:** Replace every API-key-required aggregation script with free publisher scrapers. Most publishers are fetched through the local Ladder proxy; public RSS feeds are used where they expose clean article links and metadata; and Firecrawl is kept as an automatic fallback for bot-challenged pages.

### What was removed

| Script(s) removed                        | Reason                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `nytimes-*.ts`                           | Requires an API key and hard-paywalled articles.                    |
| `wsj-*.ts`                               | Hard-paywalled; cannot be fetched reliably without a subscription.  |
| `financial-times-*.ts` / `ft-*.ts`       | Hard-paywalled; cannot be fetched reliably without a subscription.  |
| `economist-*.ts`                         | Hard-paywalled; cannot be fetched reliably without a subscription.  |
| `newsapi-*.ts`                           | Requires a paid NewsAPI key.                                        |
| `gnews-*.ts`                             | Requires a paid GNews key.                                          |
| `newsdata-*.ts`                          | Requires a paid NewsData.io key.                                    |
| `currents-*.ts`                          | Requires a paid Currents API key.                                   |
| `worldnewsapi-*.ts`                      | Requires a paid World News API key.                                 |
| `mediastack-*.ts`                        | Requires a paid Mediastack key.                                     |
| `guardian-*.ts` (Open Platform versions) | Replaced by RSS ingestion; the public `test` key is no longer used. |

### What was created

| File                                     | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `backend/scripts/bbc-world.ts`           | Scrapes BBC World section via Ladder with Firecrawl fallback.                  |
| `backend/scripts/bbc-business.ts`        | Scrapes BBC Business section via Ladder with Firecrawl fallback.               |
| `backend/scripts/bbc-technology.ts`      | Scrapes BBC Technology section via Ladder with Firecrawl fallback.             |
| `backend/scripts/bbc-science.ts`         | Scrapes BBC Science section via Ladder with Firecrawl fallback.                |
| `backend/scripts/ap-world.ts`            | Scrapes AP World News section via Ladder with Firecrawl fallback.              |
| `backend/scripts/aljazeera-world.ts`     | Scrapes Al Jazeera News section via Ladder with Firecrawl fallback.            |
| `backend/scripts/stripes-world.ts`       | Scrapes Stars and Stripes theater sections via Ladder with Firecrawl fallback. |
| `backend/scripts/warontherocks-world.ts` | Scrapes War on the Rocks homepage via Ladder with Firecrawl fallback.          |
| `backend/scripts/twz-technology.ts`      | Scrapes The War Zone homepage via Ladder with Firecrawl fallback.              |
| `backend/scripts/guardian-world.ts`      | Ingests The Guardian World RSS feed.                                           |
| `backend/scripts/guardian-business.ts`   | Ingests The Guardian Business RSS feed.                                        |
| `backend/scripts/guardian-technology.ts` | Ingests The Guardian Technology RSS feed.                                      |
| `backend/scripts/guardian-science.ts`    | Ingests The Guardian Science RSS feed.                                         |
| `backend/scripts/france24-world.ts`      | Ingests the France24 English RSS feed.                                         |
| `backend/scripts/politico-world.ts`      | Ingests the Politico Defense RSS feed.                                         |
| `backend/scripts/lib/rss-source.ts`      | Shared `aggregateFromRssFeeds()` runner for RSS/Atom feeds.                    |

### What was modified

| File                                                                                                                                       | Change                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/scripts/lib/ladder-source.ts`                                                                                                     | Added automatic Ladder ↔ Firecrawl fallback. Per-page `useFirecrawl` now chooses the primary fetcher; if it fails, the other fetcher is tried before giving up.                                                    |
| `backend/scripts/lib/extract.ts`                                                                                                           | Added optional `titleSelector` to capture real headlines before Readability mutates the DOM; added URL-slug title fallback for missing/generic titles; suppressed noisy JSDOM CSS-parse warnings.                  |
| `backend/scripts/lib/firecrawl.ts`                                                                                                         | Restored and hardened: skips array-valued `og:title` metadata, builds a synthetic HTML document so Readability can extract titles/dates/images, and exposes markdown-discovered links for JS-rendered index pages. |
| `.env.example`                                                                                                                             | Reduced to `LADDER_URL` and the optional `FIRECRAWL_API_KEY`. All paid API keys removed.                                                                                                                           |
| `backend/scripts/README.md`                                                                                                                | Updated source inventory, environment-variable docs, and disclaimer to reflect Ladder/RSS/Firecrawl split.                                                                                                         |
| `scripts/validate-edition.ts`                                                                                                              | Added `bbc.com`, `france24.com`, and `politico.com` to the approved source allowlist.                                                                                                                              |
| `backend/scripts/lib/runner.ts`                                                                                                            | Raised per-script timeout to 120 seconds so slow-but-working Ladder sources can finish.                                                                                                                            |
| `backend/scripts/lib/ladder-source.ts`                                                                                                     | Deduplicates articles by URL before building the result, so the same story linked from multiple section pages is only returned once.                                                                               |
| `ladder-washingtonpost.ts`                                                                                                                 | Reduced from 4 sections × 5 articles to 3 sections × 2 articles for reliable Ladder completion.                                                                                                                    |
| `scripts/validate-edition.ts`                                                                                                              | Added `stripes.com`, `warontherocks.com`, and `twz.com` to the approved source allowlist.                                                                                                                          |
| `ladder-techcrunch.ts`, `ladder-macrumors.ts`, `ladder-theverge.ts`, `ladder-arstechnica.ts`, `ladder-theregister.ts`, `ladder-9to5mac.ts` | Recategorized result output from `mixed` to `technology`.                                                                                                                                                          |
| `backend/scripts/lib/ladder-rules/01-custom.yaml`                                                                                          | Added `reuters.com` to the `useFlareSolverr` rule set in an attempt to bypass its bot challenge.                                                                                                                   |

### Design decisions

- **Free-only sources:** No script in `backend/scripts/` requires a paid API key. The only optional secret is `FIRECRAWL_API_KEY`, and Firecrawl works without a key from many networks.
- **Ladder first, Firecrawl fallback:** BBC, AP, Al Jazeera, Stars and Stripes, War on the Rocks, and The War Zone are fetched through the local Ladder proxy. If Ladder is blocked, the runner automatically retries through Firecrawl. This keeps the pipeline working when the no-key Firecrawl quota is exhausted.
- **RSS where it is cleaner:** The Guardian, France24, and Politico expose public RSS feeds with full metadata, so those scripts ingest directly from the feeds. This avoids intermittent Ladder blocks and JS-rendered index pages.
- **Category-specific scraping:** BBC scripts target dedicated section pages (`/business`, `/technology`, `/science`). AP's category pages are not section-specific, so only `ap-world.ts` is kept. Politico, Stars and Stripes, and War on the Rocks are filed under `world` because the project schema does not have a `politics`/`war` section yet; The War Zone is filed under `technology`.
- **Readability extraction:** Article HTML from Ladder/Firecrawl is parsed with `@mozilla/readability` so the pipeline receives the same normalized title, summary, date, and image fields.
- **Headline overrides:** Some publishers (Stars and Stripes, War on the Rocks) have generic or player-related `<title>` tags. `LadderPage` accepts an optional `titleSelector` so the real headline can be pulled from the correct element before Readability mutates the DOM. A URL-slug fallback handles cases like The War Zone where title metadata is missing entirely.
- **Markdown link fallback:** JS-rendered index pages sometimes return HTML with no usable anchor tags; Firecrawl's markdown extraction still contains the article URLs, so those are injected as hidden `<a>` tags for the shared link extractor.
- **Tech sources recategorized:** TechCrunch, MacRumors, The Verge, Ars Technica, The Register, and 9to5Mac now report `technology` instead of `mixed`.
- **Hard-paywalled publishers excluded:** NYTimes, WSJ, Financial Times, and The Economist remain unsupported because they cannot be fetched reliably without a subscription.

### Validation results

```bash
npm run validate:aggregation
# Summary: 27 ok, 0 missing key, 0 error
#
# OK sources:
#   - aljazeera/world (5)
#   - ap/world (5)
#   - bbc/business, science, technology, world (5 each)
#   - france24/world (5)
#   - guardian/business, science, technology, world (5 each)
#   - hackernews/front-page (20)
#   - politico/world (5)
#   - reuters/business (0), reuters/technology (0), reuters/world (0)
#   - spaceflight/science (25)
#   - stripes/world (15)
#   - warontherocks/world (5)
#   - twz/technology (5)
#   - ladder/9to5mac (12), ladder/arstechnica (10), ladder/theverge (12), ladder/theregister (9)
#   - ladder-macrumors (15), ladder-techcrunch (15), ladder-washingtonpost (6)
```

Live test results (current network / IP):

- ✅ BBC World/Business/Technology/Science — full articles extracted via Ladder.
- ✅ AP World — full articles extracted via Ladder.
- ✅ Al Jazeera World — full articles extracted via Ladder.
- ✅ Stars and Stripes — full articles extracted via Ladder; theater sections used for discovery and h1 used for headlines.
- ✅ War on the Rocks — full articles extracted via Ladder; article headline pulled from h1.
- ✅ The War Zone — full articles extracted via Ladder; headline pulled from h1 with URL-slug fallback.
- ✅ The Guardian World/Business/Technology/Science — clean RSS ingestion.
- ✅ France24 World — clean RSS ingestion.
- ✅ Politico Defense — clean RSS ingestion.
- ⚠️ Reuters World/Business/Technology — still blocked by a bot challenge that FlareSolverr cannot solve; returns articles only when Firecrawl credits are available.

### Commands that passed

```bash
npm run format     # all touched files formatted
npm run lint       # 0 errors, 10 pre-existing fast-refresh warnings
npx tsc --noEmit   # no TypeScript errors
npm run test       # 35 tests pass
npm run build      # client + server builds succeed
```

### Notes / blockers

- The temporary test scripts (`test-firecrawl.ts`, `test-firecrawl2.ts`, `test-links.ts`, `test-links2.ts`) were removed after verification.
- `FIRECRAWL_API_KEY` is optional. If Firecrawl starts returning rate-limit or bot errors, add a free key to `.env`.
- The per-script runner timeout was raised to 120 seconds so slow-but-working Ladder sources (MacRumors, TechCrunch, Washington Post) can finish.
- Washington Post coverage was reduced from 4 sections × 5 articles to 3 sections × 2 articles so it completes reliably through the Ladder proxy.
- CSS parse warnings from JSDOM are now suppressed in `backend/scripts/lib/extract.ts` to keep logs clean.
- The next step is to wire the new free sources into the edition compiler / Publishing Agent so they can populate draft editions.
