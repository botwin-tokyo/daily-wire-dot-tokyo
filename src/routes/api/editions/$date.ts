import { createFileRoute } from "@tanstack/react-router";
import { loadEditionByDate } from "@/lib/edition-loader";

export const Route = createFileRoute("/api/editions/$date")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const edition = await loadEditionByDate(params.date);
        return new Response(JSON.stringify(edition), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
