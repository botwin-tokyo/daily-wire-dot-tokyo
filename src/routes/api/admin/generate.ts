import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { createRateLimiter } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/admin/generate")({
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
        const allowed = await rateLimiter.allow(`admin:generate:${clientId}`, 5);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        // In production this would enqueue or trigger the generation pipeline.
        // For now it returns a deterministic job id so callers can poll status.
        const jobId = `job-${Date.now()}`;
        return new Response(
          JSON.stringify({
            ok: true,
            jobId,
            message: "Generation request accepted.",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
