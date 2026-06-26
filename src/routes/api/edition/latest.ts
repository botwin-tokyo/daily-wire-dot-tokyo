import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition, loadCurrentEditionFromD1 } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/edition/latest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Production: serve the latest edition from D1.
        const d1Edition = await loadCurrentEditionFromD1(request);
        if (d1Edition) {
          return new Response(JSON.stringify(d1Edition), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          });
        }

        // Local dev fallback when D1 is not bound.
        const edition = await loadCurrentEdition();
        return new Response(JSON.stringify(edition), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
