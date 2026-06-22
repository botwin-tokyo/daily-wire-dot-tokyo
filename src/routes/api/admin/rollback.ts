import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { createRateLimiter } from "@/lib/rate-limit";
import { loadEditionByDate } from "@/lib/edition-loader";
import { writeFileSync } from "node:fs";

export const Route = createFileRoute("/api/admin/rollback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getCloudflareEnv(request);
        const adminToken = env?.ADMIN_TOKEN ?? process.env.ADMIN_TOKEN;

        const auth = request.headers.get("Authorization");
        if (!adminToken || auth !== `Bearer ${adminToken}`) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const clientId = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const rateLimiter = createRateLimiter(() => env?.KV);
        const allowed = await rateLimiter.allow(`admin:rollback:${clientId}`, 5);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { date?: string };
        try {
          body = (await request.json()) as { date?: string };
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const date = body?.date;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(JSON.stringify({ error: "Missing or invalid date" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const edition = await loadEditionByDate(date);
          // Write current-edition.json. This works in local SSR/dev; in a
          // Cloudflare Pages deployment the filesystem is read-only, so a
          // production rollback should use the Publishing Agent or git revert.
          writeFileSync("public/data/current-edition.json", JSON.stringify(edition, null, 2));
          return new Response(
            JSON.stringify({
              ok: true,
              editionId: edition.editionId,
              message: `Rolled current edition back to ${date}.`,
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: `Rollback failed: ${(error as Error).message}` }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
