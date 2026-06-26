# News aggregation scripts

Each script is a dedicated one-shot fetcher for a single source/category pair.
All scripts here are free to run: they either call a public API that requires no
key, or scrape publisher section pages through the local Ladder proxy / Firecrawl
and parse article HTML with Mozilla Readability.

Scripts that previously required paid API keys (NewsAPI, GNews, NewsData.io,
Currents, World News API, Mediastack, NYTimes, WSJ, Financial Times, The
Economist, and The Guardian Open Platform API) have been removed. Hard-paywalled
publishers are intentionally not supported.

## Running a script

```bash
npx tsx backend/scripts/hackernews-front-page.ts
```

Scripts that need the local Ladder proxy read `LADDER_URL` from the project root
`.env` file via `backend/scripts/lib/env.ts`.

## Validating every script

```bash
npm run ladder:up   # if you want to test the Ladder-based sources
npm run validate:aggregation
npm run ladder:down
```

This runs every script, captures its JSON output, and prints a summary table.
Scripts that need Ladder and don't have it running are reported as `missing key`
and the rest of the pipeline keeps working.

## Compiling fetched articles into the local database

```bash
npm run ingest:articles
```

`backend/scripts/compile-to-db.ts` runs each aggregation script one at a time,
parses the JSON it returns, and writes the articles into a local SQLite database
at `backend/db/news.db` (gitignored). Each execution creates a new `run` row;
articles are deduplicated within that run by URL.

The AI publishing agent can then query the database to browse the latest
articles before assembling an edition.

### Querying the database

You can inspect the database directly with any SQLite client, or use the helpers
in `backend/scripts/lib/db.ts`:

```ts
import { openDb, initSchema, getLatestArticles, getRunStats } from "./lib/db";

const db = openDb();
initSchema(db);

const articles = getLatestArticles(db, 50, { category: "technology" });
console.log(getRunStats(db));
```

### Schema

- `runs` — one row per ingest run (`id`, `startedAt`, `finishedAt`, counts).
- `articles` — one row per article (`id`, `runId`, `source`, `category`,
  `title`, `url`, `summary`, `publishedAt`, `imageUrl`, `author`, `language`,
  `fetchedAt`, `createdAt`). Unique on `(runId, url)`.

## Ladder-based sources

Ladder (`https://github.com/everywall/ladder`) is a local HTTP proxy that can
emulate crawler headers and strip paywall scripts. Some publishers also serve
bot challenges, so the Docker Compose stack includes FlareSolverr to solve those
pages before Ladder extracts the article HTML.

The scripts below scrape publisher section pages, route each discovered article
URL through the local Ladder + FlareSolverr stack or through Firecrawl, parse the
content with Mozilla Readability, and normalize it into the same article shape
the rest of the pipeline expects.

**Firecrawl:** Some publishers (e.g. Reuters) serve bot challenges that Ladder
and FlareSolverr cannot solve from this network. Those scripts route through
Firecrawl instead. Firecrawl works without an API key from many IPs; if your IP
is flagged, sign up for a free key at https://firecrawl.dev and add it as
`FIRECRAWL_API_KEY` in `.env`.

### Starting Ladder

```bash
npm run ladder:up
```

This uses `docker-compose.ladder.yml` to run Ladder on `http://localhost:8081`
(host port `8081` is used so it does not conflict with the dev server on `8080`).
Make sure `LADDER_URL=http://localhost:8081` is set in your root `.env` file.

FlareSolverr runs on `http://localhost:8191`; Ladder talks to it automatically.

### Legal / terms-of-service note

Ladder is intended for legitimate testing, research, and quality assurance. You
are responsible for ensuring that your use complies with the terms of service of
each publisher and all applicable laws. Do not use these scripts to redistribute
content you are not authorized to access.

### Ladder source scripts

| Script                         | Source pages scraped                                                      | Category   | Requires                       |
| ------------------------------ | ------------------------------------------------------------------------- | ---------- | ------------------------------ |
| `ladder-washingtonpost.ts`     | [Washington Post](https://www.washingtonpost.com)                         | mixed      | `LADDER_URL`                   |
| `ladder-techcrunch.ts`         | [TechCrunch](https://techcrunch.com)                                      | technology | `LADDER_URL`                   |
| `ladder-macrumors.ts`          | [MacRumors](https://www.macrumors.com)                                    | technology | `LADDER_URL`                   |
| `ladder-theverge.ts`           | [The Verge](https://www.theverge.com)                                     | technology | `LADDER_URL`                   |
| `ladder-arstechnica.ts`        | [Ars Technica](https://arstechnica.com)                                   | technology | `LADDER_URL`                   |
| `ladder-theregister.ts`        | [The Register](https://www.theregister.com)                               | technology | `LADDER_URL`                   |
| `ladder-9to5mac.ts`            | [9to5Mac](https://9to5mac.com)                                            | technology | `LADDER_URL`                   |
| `bbc-world.ts`                 | [BBC World](https://www.bbc.com/news/world)                               | world      | Ladder (Firecrawl fallback)    |
| `bbc-business.ts`              | [BBC Business](https://www.bbc.com/news/business)                         | business   | Ladder (Firecrawl fallback)    |
| `bbc-technology.ts`            | [BBC Technology](https://www.bbc.com/news/technology)                     | technology | Ladder (Firecrawl fallback)    |
| `bbc-science.ts`               | [BBC Science](https://www.bbc.com/news/science)                           | science    | Ladder (Firecrawl fallback)    |
| `ap-world.ts`                  | [AP World](https://apnews.com/world-news)                                 | world      | Ladder (Firecrawl fallback)    |
| `aljazeera-world.ts`           | [Al Jazeera World](https://www.aljazeera.com/news)                        | world      | Ladder (Firecrawl fallback)    |
| `stripes-world.ts`             | [Stars and Stripes Theaters](https://www.stripes.com/theaters/)           | world      | Ladder (Firecrawl fallback)    |
| `warontherocks-world.ts`       | [War on the Rocks](https://warontherocks.com/)                            | world      | Ladder (Firecrawl fallback)    |
| `twz-technology.ts`            | [The War Zone](https://www.twz.com/)                                      | technology | Ladder (Firecrawl fallback)    |
| `guardian-world.ts`            | [The Guardian World RSS](https://www.theguardian.com/world/rss)           | world      | none (public RSS)              |
| `guardian-business.ts`         | [The Guardian Business RSS](https://www.theguardian.com/business/rss)     | business   | none (public RSS)              |
| `guardian-technology.ts`       | [The Guardian Technology RSS](https://www.theguardian.com/technology/rss) | technology | none (public RSS)              |
| `guardian-science.ts`          | [The Guardian Science RSS](https://www.theguardian.com/science/rss)       | science    | none (public RSS)              |
| `france24-world.ts`            | [France24 World RSS](https://www.france24.com/en/rss)                     | world      | none (public RSS)              |
| `politico-world.ts`            | [Politico Defense RSS](https://rss.politico.com/defense.xml)              | world      | none (public RSS)              |
| `ladder-reuters-world.ts`      | [Reuters World](https://www.reuters.com/world/)                           | world      | Firecrawl (no key, or API key) |
| `ladder-reuters-business.ts`   | [Reuters Business](https://www.reuters.com/business/)                     | business   | Firecrawl (no key, or API key) |
| `ladder-reuters-technology.ts` | [Reuters Technology](https://www.reuters.com/technology/)                 | technology | Firecrawl (no key, or API key) |

If `LADDER_URL` is missing or Ladder is not reachable, these scripts are reported
as `missing key` by the validation/ingest runners and the rest of the pipeline
keeps working.

**Reachability note:** The tech sources (TechCrunch, MacRumors, The Verge, Ars
Technica, The Register, 9to5Mac) and Washington Post are generally accessible
through Ladder. BBC, AP, Al Jazeera, Stars and Stripes, War on the Rocks, and
The War Zone are also fetched through Ladder with an automatic Firecrawl fallback.
The Guardian, France24, and Politico are fetched from their public RSS feeds.
Reuters is only reachable through Firecrawl; on networks where the no-key quota is
exhausted it returns zero articles unless a `FIRECRAWL_API_KEY` is supplied.
Hard-paywalled publishers such as NYTimes, WSJ, Financial Times, and The Economist
are intentionally not supported because they cannot be fetched reliably without a
subscription.

## Source inventory

| Script                         | Source                                                                    | Category   | Requires           |
| ------------------------------ | ------------------------------------------------------------------------- | ---------- | ------------------ |
| `hackernews-front-page.ts`     | [Hacker News / Algolia](https://hn.algolia.com/api)                       | front page | none               |
| `spaceflight-science.ts`       | [Spaceflight News API](https://api.spaceflightnewsapi.net/v4/docs/)       | science    | none               |
| `ladder-washingtonpost.ts`     | [Washington Post](https://www.washingtonpost.com)                         | mixed      | Ladder             |
| `ladder-techcrunch.ts`         | [TechCrunch](https://techcrunch.com)                                      | technology | Ladder             |
| `ladder-macrumors.ts`          | [MacRumors](https://www.macrumors.com)                                    | technology | Ladder             |
| `ladder-theverge.ts`           | [The Verge](https://www.theverge.com)                                     | technology | Ladder             |
| `ladder-arstechnica.ts`        | [Ars Technica](https://arstechnica.com)                                   | technology | Ladder             |
| `ladder-theregister.ts`        | [The Register](https://www.theregister.com)                               | technology | Ladder             |
| `ladder-9to5mac.ts`            | [9to5Mac](https://9to5mac.com)                                            | technology | Ladder             |
| `bbc-world.ts`                 | [BBC World](https://www.bbc.com/news/world)                               | world      | Ladder / Firecrawl |
| `bbc-business.ts`              | [BBC Business](https://www.bbc.com/news/business)                         | business   | Ladder / Firecrawl |
| `bbc-technology.ts`            | [BBC Technology](https://www.bbc.com/news/technology)                     | technology | Ladder / Firecrawl |
| `bbc-science.ts`               | [BBC Science](https://www.bbc.com/news/science)                           | science    | Ladder / Firecrawl |
| `ap-world.ts`                  | [AP World](https://apnews.com/world-news)                                 | world      | Ladder / Firecrawl |
| `aljazeera-world.ts`           | [Al Jazeera World](https://www.aljazeera.com/news)                        | world      | Ladder / Firecrawl |
| `stripes-world.ts`             | [Stars and Stripes Theaters](https://www.stripes.com/theaters/)           | world      | Ladder / Firecrawl |
| `warontherocks-world.ts`       | [War on the Rocks](https://warontherocks.com/)                            | world      | Ladder / Firecrawl |
| `twz-technology.ts`            | [The War Zone](https://www.twz.com/)                                      | technology | Ladder / Firecrawl |
| `guardian-world.ts`            | [The Guardian World RSS](https://www.theguardian.com/world/rss)           | world      | none (public RSS)  |
| `guardian-business.ts`         | [The Guardian Business RSS](https://www.theguardian.com/business/rss)     | business   | none (public RSS)  |
| `guardian-technology.ts`       | [The Guardian Technology RSS](https://www.theguardian.com/technology/rss) | technology | none (public RSS)  |
| `guardian-science.ts`          | [The Guardian Science RSS](https://www.theguardian.com/science/rss)       | science    | none (public RSS)  |
| `france24-world.ts`            | [France24 World RSS](https://www.france24.com/en/rss)                     | world      | none (public RSS)  |
| `politico-world.ts`            | [Politico Defense RSS](https://rss.politico.com/defense.xml)              | world      | none (public RSS)  |
| `ladder-reuters-world.ts`      | [Reuters World](https://www.reuters.com/world/)                           | world      | Firecrawl          |
| `ladder-reuters-business.ts`   | [Reuters Business](https://www.reuters.com/business/)                     | business   | Firecrawl          |
| `ladder-reuters-technology.ts` | [Reuters Technology](https://www.reuters.com/technology/)                 | technology | Firecrawl          |

## Output format

Every script prints a single JSON object:

```json
{
  "source": "hackernews",
  "category": "front-page",
  "fetchedAt": "2026-06-19T12:00:00.000Z",
  "count": 20,
  "articles": [
    {
      "source": "Hacker News",
      "title": "...",
      "url": "...",
      "summary": "...",
      "publishedAt": "...",
      "imageUrl": "...",
      "author": "...",
      "category": "technology",
      "language": "en"
    }
  ]
}
```

## Environment variables

Copy the root `.env.example` to `.env` and set `LADDER_URL` if you want to use
the Ladder-based sources. `FIRECRAWL_API_KEY` is optional.

| Variable            | Required by                               | Description                                       |
| ------------------- | ----------------------------------------- | ------------------------------------------------- |
| `LADDER_URL`        | `ladder-*.ts` and Ladder-fallback scripts | URL of the local Ladder proxy                     |
| `FIRECRAWL_API_KEY` | Firecrawl / fallback scripts              | Optional Firecrawl key if your IP is rate-limited |

## Discovery phase notes

These scripts are intentionally lightweight. Their purpose is to confirm which
sources are reachable, what data shape they return, and how reliably full
articles can be extracted. The next phase will feed normalized articles from
these scripts into the edition compiler.
