import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition, loadCurrentEditionFromD1 } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
        const edition =
          (await loadCurrentEditionFromD1(request)) ?? (await loadCurrentEdition());
        if (!q) {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
          });
        }
        const results = edition.articles.filter((a) =>
          [a.headline, a.summary, a.source.name, a.category, ...a.tags]
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
