import { createFileRoute } from "@tanstack/react-router";
import { loadEditionSummaries } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/editions")({
  server: {
    handlers: {
      GET: async () => {
        const summaries = await loadEditionSummaries();
        return new Response(JSON.stringify(summaries), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
