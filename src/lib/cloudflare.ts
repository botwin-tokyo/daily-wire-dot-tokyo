/**
 * Extract Cloudflare bindings from a TanStack Start server request.
 *
 * Nitro v3 on Cloudflare Pages attaches the runtime context to the request
 * as `request.runtime.cloudflare.env`. Some older/local shims use
 * `request.context.cloudflare.env`. If neither is present we also fall back
 * to the global `__env__` injected by the Nitro Cloudflare handler.
 */
export function getCloudflareEnv(request: Request): Env | undefined {
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

  return (globalThis as unknown as { __env__?: Env }).__env__;
}
