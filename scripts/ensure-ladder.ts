#!/usr/bin/env node
/**
 * Ensure Docker Desktop and the Ladder proxy are running before scrapes.
 *
 * Usage:
 *   npx tsx scripts/ensure-ladder.ts
 *   npm run ensure:ladder
 *
 * This is also called automatically at the start of `npm run ingest:articles`.
 */

import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);

const COMPOSE_FILE = "docker-compose.ladder.yml";
const LADDER_URL = "http://127.0.0.1:8081";
const DOCKER_START_TIMEOUT_MS = 60_000;
const LADDER_READY_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isDockerRunning(): Promise<boolean> {
  try {
    await exec("docker info");
    return true;
  } catch {
    return false;
  }
}

async function startDocker(): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error(
      `Auto-starting Docker is only supported on macOS. Please start Docker manually on ${process.platform}.`,
    );
  }
  console.error("Docker Desktop is not running. Starting it now...");
  await exec("open -a Docker");

  const deadline = Date.now() + DOCKER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isDockerRunning()) {
      console.error("Docker Desktop is up.");
      return;
    }
    await sleep(2_000);
  }
  throw new Error("Docker Desktop did not start in time.");
}

async function areLadderContainersRunning(): Promise<boolean> {
  try {
    const { stdout } = await exec(`docker compose -f ${COMPOSE_FILE} ps --format json`);
    const lines = stdout
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const containers = lines.map((line) => JSON.parse(line)) as Record<string, unknown>[];
    return containers.length >= 2 && containers.every((c) => c?.State === "running");
  } catch {
    return false;
  }
}

async function startLadder(): Promise<void> {
  console.error("Ladder containers are not running. Starting Ladder + FlareSolverr...");
  await exec(`docker compose -f ${COMPOSE_FILE} up -d --build`);
}

async function waitForLadder(): Promise<void> {
  const deadline = Date.now() + LADDER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(LADDER_URL, { method: "GET" });
      if (response.status < 500) {
        console.error("Ladder proxy is responding.");
        return;
      }
    } catch {
      // Ladder is not ready yet.
    }
    await sleep(1_000);
  }
  throw new Error("Ladder proxy did not become ready in time.");
}

export async function ensureLadder(): Promise<void> {
  if (!(await isDockerRunning())) {
    await startDocker();
  }

  if (!(await areLadderContainersRunning())) {
    await startLadder();
  }

  await waitForLadder();
}

async function main(): Promise<void> {
  await ensureLadder();
  console.error("Ladder is ready for scrapes.");
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
