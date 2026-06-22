/**
 * Shared helper for executing aggregation scripts via `tsx` and parsing their
 * JSON output. Used by both the validation runner and the database compiler.
 */

import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { AggregationResult } from "./types";

interface ScriptResultBase {
  script: string;
  source: string;
  category: string;
  durationMs: number;
}

export interface ScriptOkResult extends ScriptResultBase {
  status: "ok";
  result: AggregationResult;
}

export interface ScriptFailedResult extends ScriptResultBase {
  status: "missing-key" | "skipped" | "error";
  error?: string;
}

export type ScriptResult = ScriptOkResult | ScriptFailedResult;

const SCRIPTS_DIR = resolve(import.meta.dirname ?? "..", "..");
const TSX_PATH = resolve(process.cwd(), "node_modules/.bin/tsx");

export function listScriptFiles(): string[] {
  return readdirSync(SCRIPTS_DIR)
    .filter((name) => name.endsWith(".ts"))
    .filter((name) => !name.startsWith("lib"))
    .filter((name) => name !== "validate.ts" && name !== "compile-to-db.ts")
    .map((name) => resolve(SCRIPTS_DIR, name))
    .filter((path) => statSync(path).isFile());
}

function extractJsonPayload(stdout: string): string {
  const lines = stdout.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return lines.slice(i).join("\n");
    }
  }
  return stdout.trim();
}

const SCRIPT_TIMEOUT_MS = 120_000;

export function runScript(file: string): Promise<ScriptResult> {
  const basename = file.split("/").pop() ?? file;
  const [source, category] = basename.replace(/\.ts$/, "").split("-");
  const start = Date.now();

  return new Promise((resolvePromise) => {
    const child = spawn(TSX_PATH, [file], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      const durationMs = Date.now() - start;
      resolvePromise({
        script: basename,
        source: source ?? "unknown",
        category: category ?? "unknown",
        status: "error",
        error: `Timed out after ${SCRIPT_TIMEOUT_MS}ms`,
        durationMs,
      });
    }, SCRIPT_TIMEOUT_MS);

    function finish(result: ScriptResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolvePromise(result);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - start;

      if (code === 0) {
        const payload = extractJsonPayload(stdout);
        try {
          const parsed = JSON.parse(payload) as AggregationResult;
          finish({
            script: basename,
            source: parsed.source ?? source ?? "unknown",
            category: parsed.category ?? category ?? "unknown",
            status: "ok",
            result: parsed,
            durationMs,
          });
        } catch {
          finish({
            script: basename,
            source: source ?? "unknown",
            category: category ?? "unknown",
            status: "error",
            error: "Script exited 0 but stdout was not valid JSON",
            durationMs,
          });
        }
        return;
      }

      const errorText = (stderr || stdout).trim();
      const isMissingKey = errorText.includes("Missing environment variable");
      const isSkipped = errorText.includes("Firecrawl quota exhausted");
      finish({
        script: basename,
        source: source ?? "unknown",
        category: category ?? "unknown",
        status: isMissingKey ? "missing-key" : isSkipped ? "skipped" : "error",
        error: errorText.slice(0, 300),
        durationMs,
      });
    });

    child.on("error", (err) => {
      finish({
        script: basename,
        source: source ?? "unknown",
        category: category ?? "unknown",
        status: "error",
        error: `Failed to spawn: ${err.message}`,
        durationMs: Date.now() - start,
      });
    });
  });
}
