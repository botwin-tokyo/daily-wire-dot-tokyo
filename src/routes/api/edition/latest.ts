import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/edition/latest")({
  server: {
    handlers: {
      GET: async () => {
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
