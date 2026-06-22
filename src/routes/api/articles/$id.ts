import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/articles/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const edition = await loadCurrentEdition();
        const article = edition.articles.find((a) => a.id === params.id || a.slug === params.id);
        if (!article) {
          return new Response(JSON.stringify({ error: "Article not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(article), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
