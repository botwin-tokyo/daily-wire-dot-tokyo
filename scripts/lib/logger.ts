/**
 * Structured JSON logger for publishing and rollback scripts.
 *
 * Writes one JSON object per line so logs can be streamed to Cloudflare
 * Logpush, Loki, or GitHub Actions without parsing free-form text.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  editionDate?: string;
  editionId?: string;
  jobId?: string;
  commitSha?: string;
  [key: string]: unknown;
}

export function createLogger(service: string) {
  function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      ...meta,
    };

    console.log(JSON.stringify(entry));
  }

  return {
    debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  };
}
