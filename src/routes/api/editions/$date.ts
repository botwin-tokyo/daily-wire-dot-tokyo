import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { loadEditionByDate } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/editions/$date")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const db = getCloudflareEnv(request)?.DB;
        const date = params.date;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(JSON.stringify({ error: "Invalid date format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!db) {
          // D1 is not bound; fall back to the static archive file for local dev.
          try {
            const edition = await loadEditionByDate(date);
            return new Response(JSON.stringify(edition), {
              headers: { "Content-Type": "application/json" },
            });
          } catch {
            return new Response(JSON.stringify({ error: "Edition not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const { results } = await db
          .prepare("SELECT edition_json FROM editions WHERE edition_date = ?")
          .bind(date)
          .all<{ edition_json: string }>();

        const row = results?.[0];
        if (!row) {
          return new Response(JSON.stringify({ error: "Edition not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(row.edition_json, {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
