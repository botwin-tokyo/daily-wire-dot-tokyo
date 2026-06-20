/**
 * Extract Cloudflare bindings from a TanStack Start server request.
 *
 * In a Cloudflare Pages/Workers runtime the request object has
 * `request.context.cloudflare.env`. During local non-Cloudflare dev this is
 * undefined, so callers must fall back to filesystem or localStorage behavior.
 */
export function getCloudflareEnv(request: Request): Env | undefined {
  return (
    (
      request as unknown as {
        context?: { cloudflare?: { env?: Env } };
      }
    ).context?.cloudflare?.env ?? undefined
  );
}
