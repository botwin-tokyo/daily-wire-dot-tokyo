/**
 * Extract Cloudflare bindings from a TanStack Start server request or the
 * global runtime env injected by the Nitro Cloudflare handler.
 *
 * Nitro v3 on Cloudflare Pages attaches the runtime context to the request
 * as `request.runtime.cloudflare.env`. Some older/local shims use
 * `request.context.cloudflare.env`. When no request is available (e.g. during
 * SSR data fetching) we fall back to the global `__env__` set by the handler.
 */
export function getCloudflareEnv(request?: Request): Env | undefined {
  if (request) {
    const runtimeEnv = (
      request as unknown as {
        runtime?: { cloudflare?: { env?: Env } };
      }
    ).runtime?.cloudflare?.env;

    if (runtimeEnv) return runtimeEnv;

    const contextEnv = (
      request as unknown as {
        context?: { cloudflare?: { env?: Env } };
      }
    ).context?.cloudflare?.env;

    if (contextEnv) return contextEnv;
  }

  return (globalThis as unknown as { __env__?: Env }).__env__;
}
