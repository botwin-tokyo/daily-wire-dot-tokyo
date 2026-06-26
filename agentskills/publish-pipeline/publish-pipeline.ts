#!/usr/bin/env node
/**
 * Post-rewrite pipeline orchestrator.
 *
 * Runs the four downstream steps sequentially:
 *   1. review-rewrite
 *   2. create-daily
 *   3. populate-depropdb
 *   4. publish-dailywire
 *
 * Run from the repository root:
 *   npx tsx agentskills/publish-pipeline/publish-pipeline.ts
 */

import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { spawn } from "node:child_process";

const LOG_DIR = pathResolve(process.cwd(), "logs");
const LOG_FILE = pathResolve(LOG_DIR, "publish-pipeline.log");

interface Step {
  name: string;
  script: string;
}

const STEPS: Step[] = [
  { name: "review-rewrite", script: "agentskills/review-rewrite/review-rewrite.ts" },
  { name: "create-daily", script: "agentskills/create-daily/create-daily.ts" },
  { name: "populate-depropdb", script: "agentskills/populate-depropdb/populate-depropdb.ts" },
  { name: "publish-dailywire", script: "agentskills/publish-dailywire/publish-dailywire.ts" },
];

function initLogger(): void {
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(LOG_FILE, "", "utf-8");
}

function log(...parts: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${parts.join(" ")}`;
  console.log(line);
  appendFileSync(LOG_FILE, `${line}\n`, "utf-8");
}

function runStep(step: Step): Promise<void> {
  return new Promise<void>((done, fail) => {
    const scriptPath = pathResolve(process.cwd(), step.script);
    log(`▶ Starting ${step.name}: ${scriptPath}`);

    const child = spawn("npx", ["tsx", scriptPath], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString("utf-8");
      stdout += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) log(`[${step.name}] ${line}`);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString("utf-8");
      stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) log(`[${step.name}:stderr] ${line}`);
      }
    });

    child.on("error", (err) => {
      log(`❌ ${step.name} failed to spawn: ${err.message}`);
      fail(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        log(`✅ ${step.name} completed`);
        done();
      } else {
        const msg = `${step.name} exited with code ${code}`;
        log(`❌ ${msg}`);
        if (stderr.trim()) log(`❌ ${step.name} stderr:\n${stderr}`);
        fail(new Error(msg));
      }
    });
  });
}

async function main(): Promise<void> {
  initLogger();
  log("=== Publish pipeline started ===");
  log(`Steps: ${STEPS.map((s) => s.name).join(" → ")}`);

  const start = Date.now();

  for (const step of STEPS) {
    try {
      await runStep(step);
    } catch (err) {
      log("=== Publish pipeline aborted ===");
      log(`Failed at step: ${step.name}`);
      process.exitCode = 1;
      return;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`=== Publish pipeline finished in ${elapsed}s ===`);
}

main().catch((err) => {
  log(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
