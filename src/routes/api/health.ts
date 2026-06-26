import { createFileRoute } from "@tanstack/react-router";
import { loadCurrentEdition, loadCurrentEditionFromD1 } from "@/lib/edition-loader";
import { CURRENT_SCHEMA_VERSION } from "@/lib/schema";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const edition =
          (await loadCurrentEditionFromD1(request).catch(() => undefined)) ??
          (await loadCurrentEdition().catch(() => undefined));

        return new Response(
          JSON.stringify({
            ok: true,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            editionId: edition?.editionId ?? null,
            editionDate: edition?.editionDate ?? null,
            status: edition?.status ?? null,
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
