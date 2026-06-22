/**
 * Minimal git helpers used by the publishing agent.
 */
import { execSync } from "node:child_process";

export function getCurrentBranch(): string {
  return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
}

export function hasStagedChanges(): boolean {
  try {
    const output = execSync("git diff --cached --stat", { encoding: "utf-8" });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

export function stageFiles(paths: string[]): void {
  if (paths.length === 0) return;
  execSync(`git add ${paths.map((p) => JSON.stringify(p)).join(" ")}`, { stdio: "inherit" });
}

export function commit(message: string): void {
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit" });
}

export function push(branch?: string): void {
  const target = branch ?? getCurrentBranch();
  execSync(`git push origin ${JSON.stringify(target)}`, { stdio: "inherit" });
}

export function getHeadSha(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
}
