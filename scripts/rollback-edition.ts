#!/usr/bin/env node
/**
 * Rollback Agent for Botwin's Morning Wire.
 *
 * Restores a historical edition by copying its archive file to
 * public/data/current-edition.json, optionally running validation/tests,
 * committing, and pushing.
 *
 * Usage:
 *   npm run rollback:edition -- --date 2025-05-20
 *   npm run rollback:edition -- --date 2025-05-20 --dry-run
 *   npm run rollback:edition -- --date 2025-05-20 --verify --branch main
 */

import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { loadEditionByDate } from "../src/lib/edition-loader";
import { getCurrentBranch, stageFiles, commit, push, getHeadSha } from "./lib/git";
import { createLogger } from "./lib/logger";

const logger = createLogger("rollback-agent");

interface Args {
  date: string;
  dryRun: boolean;
  verify: boolean;
  branch?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const dateIndex = args.indexOf("--date");
  const branchIndex = args.indexOf("--branch");
  if (dateIndex === -1 || !args[dateIndex + 1]) {
    logger.error(
      "Usage: rollback-edition.ts --date YYYY-MM-DD [--branch <branch>] [--dry-run] [--verify]",
    );
    process.exit(1);
  }
  return {
    date: args[dateIndex + 1],
    dryRun: args.includes("--dry-run"),
    verify: args.includes("--verify"),
    branch: branchIndex !== -1 ? args[branchIndex + 1] : undefined,
  };
}

function runCommand(label: string, command: string): void {
  logger.info(`Running ${label}`, { command });
  execSync(command, { stdio: "inherit" });
}

async function main() {
  const args = parseArgs();
  const date = args.date;
  const archivePath = resolve(`public/data/editions/${date}.json`);
  const currentPath = resolve("public/data/current-edition.json");
  const relativeArchive = `public/data/editions/${date}.json`;
  const relativeCurrent = "public/data/current-edition.json";

  if (!existsSync(archivePath)) {
    logger.error("Archive file not found", { date, archivePath });
    process.exit(1);
  }

  let edition: { editionId: string; editionNumber: number };
  try {
    const loaded = await loadEditionByDate(date);
    edition = { editionId: loaded.editionId, editionNumber: loaded.editionNumber };
    logger.info("Loaded historical edition", {
      editionId: edition.editionId,
      editionNumber: edition.editionNumber,
      date,
    });
  } catch (error) {
    logger.error("Historical edition failed validation", { date, error: (error as Error).message });
    process.exit(1);
  }

  if (args.dryRun) {
    logger.info("Dry-run — would perform rollback", {
      date,
      editionId: edition.editionId,
      steps: [
        `cp ${relativeArchive} ${relativeCurrent}`,
        ...(args.verify
          ? [
              "npm run validate:edition",
              "npm run lint",
              "npx tsc --noEmit",
              "npm run test",
              "npm run build",
            ]
          : []),
        `git add ${relativeCurrent}`,
        `git commit -m "edition(rollback): ${date} (#${edition.editionNumber})"`,
        `git push origin ${args.branch ?? getCurrentBranch()}`,
      ],
    });
    process.exit(0);
  }

  copyFileSync(archivePath, currentPath);
  logger.info("Copied archive to current-edition.json", { date, currentPath });

  if (args.verify) {
    try {
      runCommand("Validate", `npm run validate:edition -- ${relativeCurrent} ${relativeArchive}`);
      runCommand("Lint", "npm run lint");
      runCommand("Typecheck", "npx tsc --noEmit");
      runCommand("Test", "npm run test");
      runCommand("Build", "npm run build");
    } catch (error) {
      logger.error("Rollback verification failed", { error: (error as Error).message });
      process.exit(1);
    }
  }

  const branch = args.branch ?? getCurrentBranch();
  const commitMessage = `edition(rollback): ${date} (#${edition.editionNumber})`;
  try {
    stageFiles([relativeCurrent]);
    commit(commitMessage);
    push(branch);
  } catch (error) {
    logger.error("Git operation failed", { error: (error as Error).message });
    process.exit(1);
  }

  const commitSha = getHeadSha();
  logger.info("Rollback committed and pushed", {
    commitSha,
    branch,
    date,
    editionId: edition.editionId,
  });
}

main().catch((error) => {
  logger.error("Unexpected error", { error: (error as Error).message });
  process.exit(1);
});
