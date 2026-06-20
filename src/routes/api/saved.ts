import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition, adaptArticle } from "@/lib/edition-loader";
import { getCloudflareEnv } from "@/lib/cloudflare";

export const Route = createFileRoute("/api/saved")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          return new Response(JSON.stringify({ error: "D1 not bound" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { results } = await db
          .prepare("SELECT article_id FROM saved_articles ORDER BY created_at DESC")
          .all<{ article_id: string }>();
        const ids = new Set(results?.map((r) => r.article_id) ?? []);
        const edition = await loadCurrentEdition();
        const articles = edition.articles.filter((a) => ids.has(a.id)).map(adaptArticle);
        return new Response(JSON.stringify(articles), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          return new Response(JSON.stringify({ error: "D1 not bound" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { articleId } = (await request.json()) as { articleId?: string };
        if (!articleId) {
          return new Response(JSON.stringify({ error: "articleId required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        await db
          .prepare("INSERT OR IGNORE INTO saved_articles (article_id) VALUES (?)")
          .bind(articleId)
          .run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      DELETE: async ({ request }) => {
        const db = getCloudflareEnv(request)?.DB;
        if (!db) {
          return new Response(JSON.stringify({ error: "D1 not bound" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { articleId } = (await request.json()) as { articleId?: string };
        if (!articleId) {
          return new Response(JSON.stringify({ error: "articleId required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        await db.prepare("DELETE FROM saved_articles WHERE article_id = ?").bind(articleId).run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
