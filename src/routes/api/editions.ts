import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { loadEditionSummaries } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/editions")({
  head: () => ({ meta: [{ title: "Edition Archive API" }] }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          // D1 is not bound; fall back to the static index file for local dev.
          try {
            const summaries = await loadEditionSummaries();
            return new Response(JSON.stringify(summaries), {
              headers: { "Content-Type": "application/json" },
            });
          } catch {
            return new Response(JSON.stringify([]), {
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const { results } = await db
          .prepare(
            `
            SELECT
              edition_date AS editionDate,
              status,
              story_count AS storyCount,
              lead_headline AS leadHeadline,
              categories
            FROM editions
            ORDER BY edition_date DESC
          `,
          )
          .all<{
            editionDate: string;
            status: string;
            storyCount: number;
            leadHeadline: string;
            categories: string;
          }>();

        const summaries = (results ?? []).map((row) => ({
          id: `ed-${row.editionDate}-dailywire`,
          editionDate: row.editionDate,
          status: row.status,
          storyCount: row.storyCount,
          leadHeadline: row.leadHeadline,
          categories: JSON.parse(row.categories) as string[],
        }));

        return new Response(JSON.stringify(summaries), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
