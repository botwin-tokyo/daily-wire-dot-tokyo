/**
 * Ladder proxy helpers for paywalled article fetching.
 *
 * Ladder (https://github.com/everywall/ladder) is a local HTTP proxy that can
 * emulate crawler headers and strip paywall scripts. These helpers route a
 * target URL through a Ladder instance so backend aggregation scripts can
 * extract article content from publisher pages.
 */

import { getEnv } from "./env";

const DEFAULT_TIMEOUT_MS = 30_000;

export function getLadderUrl(): string {
  const url = getEnv("LADDER_URL");
  if (!url) {
    throw new Error("Missing environment variable: LADDER_URL");
  }
  return url.replace(/\/$/, "");
}

export function isLadderConfigured(): boolean {
  return !!getEnv("LADDER_URL");
}

export async function fetchViaLadder(
  targetUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const ladderUrl = getLadderUrl();
  const proxyUrl = `${ladderUrl}/api/${targetUrl}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      throw new Error(
        `Ladder returned HTTP ${response.status} for ${targetUrl}: ${body.slice(0, 200)}`,
      );
    }

    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof (parsed as { body?: string }).body === "string") {
        return (parsed as { body: string }).body;
      }
    } catch {
      // Not the Ladder JSON wrapper; return the raw response.
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
