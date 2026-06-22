import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { MOCK_SETTINGS } from "@/lib/mock-edition";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/api/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          return new Response(JSON.stringify(MOCK_SETTINGS), {
            headers: { "Content-Type": "application/json" },
          });
        }
        const row = await db
          .prepare("SELECT payload FROM settings WHERE id = 1")
          .first<{ payload: string }>();
        if (!row) {
          return new Response(JSON.stringify(MOCK_SETTINGS), {
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(row.payload, {
          headers: { "Content-Type": "application/json" },
        });
      },
      PUT: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          return new Response(JSON.stringify({ error: "D1 not bound" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const payload = JSON.stringify((await request.json()) as Settings);
        await db
          .prepare(
            `INSERT INTO settings (id, payload, updated_at) VALUES (1, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
          )
          .bind(payload)
          .run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
