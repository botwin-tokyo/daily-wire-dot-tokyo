import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition } from "@/lib/edition-loader";
import { CURRENT_SCHEMA_VERSION } from "@/lib/schema";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const edition = await loadCurrentEdition();
        return new Response(
          JSON.stringify({
            ok: true,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            editionId: edition.editionId,
            editionDate: edition.editionDate,
            status: edition.status,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
            },
          },
        );
      },
    },
  },
});
