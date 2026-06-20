#!/usr/bin/env node
/**
 * Publishing Agent for The Morning Wire.
 *
 * Usage:
 *   npm run publish:edition -- --draft drafts/2025-05-21.json --date 2025-05-21
 *   npm run publish:edition -- --draft drafts/2025-05-21.json --date 2025-05-21 --dry-run
 *
 * Steps:
 *   1. Validate the draft JSON.
 *   2. Copy it to public/data/editions/{date}.json.
 *   3. Atomically replace public/data/current-edition.json.
 *   4. Run validate:edition, lint, typecheck, build, test.
 *   5. Commit and push.
 *   6. Optionally poll Cloudflare Pages for deployment verification.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { validateEdition, formatReport } from "./lib/validation-report";
import { getCurrentBranch, stageFiles, commit, push, getHeadSha } from "./lib/git";
import { createLogger } from "./lib/logger";

const logger = createLogger("publish-agent");

interface Args {
  draft: string;
  date?: string;
  branch?: string;
  dryRun: boolean;
  skipDeployCheck: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const draftIndex = args.indexOf("--draft");
  const dateIndex = args.indexOf("--date");
  const branchIndex = args.indexOf("--branch");
  if (draftIndex === -1 || !args[draftIndex + 1]) {
    logger.error(
      "Usage: publish-edition.ts --draft <path> [--date YYYY-MM-DD] [--branch <branch>] [--dry-run] [--skip-deploy-check]",
    );
    process.exit(1);
  }
  return {
    draft: args[draftIndex + 1],
    date: dateIndex !== -1 ? args[dateIndex + 1] : undefined,
    branch: branchIndex !== -1 ? args[branchIndex + 1] : undefined,
    dryRun: args.includes("--dry-run"),
    skipDeployCheck: args.includes("--skip-deploy-check"),
  };
}

function runCommand(label: string, command: string): void {
  logger.info(`Running ${label}`, { command });
  execSync(command, { stdio: "inherit" });
}

async function pollCloudflarePages(
  editionId: string,
  commitSha: string,
): Promise<{ ok: boolean; message: string }> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT ?? "morning-wire";

  if (!token || !accountId) {
    return {
      ok: true,
      message: "CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID not set; skipping deployment check.",
    };
  }

  logger.info("Polling Cloudflare Pages deployment", { projectName, commitSha, editionId });

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`;

  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, message: `Cloudflare API error: ${response.status} ${text}` };
    }
    const data = (await response.json()) as {
      result?: Array<{
        deployment_trigger?: { metadata?: { commit_hash?: string } };
        latest_stage?: { status?: string };
        url?: string;
      }>;
    };
    const deployment = data.result?.find(
      (d) => d.deployment_trigger?.metadata?.commit_hash === commitSha,
    );
    if (deployment) {
      const status = deployment.latest_stage?.status;
      if (status === "success") {
        return { ok: true, message: `Deployment successful: ${deployment.url}` };
      }
      if (status === "failure") {
        return { ok: false, message: "Cloudflare Pages deployment failed." };
      }
      logger.info("Deployment in progress", { status: status ?? "unknown", attempt });
    } else {
      logger.info("Deployment not found yet", { attempt });
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }

  return { ok: false, message: "Timed out waiting for Cloudflare Pages deployment." };
}

async function main() {
  const args = parseArgs();

  const draftPath = resolve(args.draft);
  logger.info("Reading draft", { draftPath, dryRun: args.dryRun });

  let raw: string;
  try {
    raw = readFileSync(draftPath, "utf-8");
  } catch (error) {
    logger.error("Cannot read draft", { error: (error as Error).message });
    process.exit(1);
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    logger.error("Invalid JSON in draft", { error: (error as Error).message });
    process.exit(1);
  }

  const report = validateEdition(value);
  logger.info("Validation report", { report: formatReport(report) });
  if (!report.ok || !report.editionDate) {
    process.exit(1);
  }

  const edition = value as { editionDate: string; editionNumber: number; editionId: string };
  const date = args.date ?? edition.editionDate;
  const archivePath = resolve(`public/data/editions/${date}.json`);
  const currentPath = resolve("public/data/current-edition.json");
  const relativeArchive = `public/data/editions/${date}.json`;
  const relativeCurrent = "public/data/current-edition.json";

  logger.info("Publishing edition", {
    editionId: edition.editionId,
    editionNumber: edition.editionNumber,
    date,
    dryRun: args.dryRun,
  });

  if (args.dryRun) {
    logger.info("Dry-run complete", {
      steps: [
        `cp ${args.draft} ${archivePath}`,
        `cp ${args.draft} ${currentPath}`,
        `npm run validate:edition -- ${relativeCurrent} ${relativeArchive}`,
        "npm run lint",
        "npx tsc --noEmit",
        "npm run test",
        "npm run build",
        `git add ${relativeArchive} ${relativeCurrent}`,
        `git commit -m "edition(publish): ${date} (#${edition.editionNumber})"`,
        `git push origin ${args.branch ?? getCurrentBranch()}`,
        "poll Cloudflare Pages deployment (if credentials present)",
      ],
    });
    process.exit(0);
  }

  if (!existsSync(dirname(archivePath))) {
    mkdirSync(dirname(archivePath), { recursive: true });
  }
  copyFileSync(draftPath, archivePath);
  copyFileSync(draftPath, currentPath);
  logger.info("Wrote edition files", { archivePath, currentPath });

  try {
    runCommand("Validate", `npm run validate:edition -- ${relativeCurrent} ${relativeArchive}`);
    runCommand("Lint", "npm run lint");
    runCommand("Typecheck", "npx tsc --noEmit");
    runCommand("Test", "npm run test");
    runCommand("Build", "npm run build");
  } catch (error) {
    logger.error("Pre-publish checks failed", { error: (error as Error).message });
    process.exit(1);
  }

  const branch = args.branch ?? getCurrentBranch();
  const commitMessage = `edition(publish): ${date} (#${edition.editionNumber})`;
  try {
    stageFiles([relativeArchive, relativeCurrent]);
    commit(commitMessage);
    push(branch);
  } catch (error) {
    logger.error("Git operation failed", { error: (error as Error).message });
    process.exit(1);
  }

  const commitSha = getHeadSha();
  logger.info("Committed and pushed", { commitSha, branch, editionId: edition.editionId });

  if (!args.skipDeployCheck) {
    try {
      const result = await pollCloudflarePages(edition.editionId, commitSha);
      if (result.ok) {
        logger.info("Deployment verified", { message: result.message });
      } else {
        logger.error("Deployment verification failed", { message: result.message });
        process.exit(1);
      }
    } catch (error) {
      logger.error("Deployment check error", { error: (error as Error).message });
      process.exit(1);
    }
  } else {
    logger.info("Skipped deployment check");
  }
}

main().catch((error) => {
  logger.error("Unexpected error", { error: (error as Error).message });
  process.exit(1);
});
