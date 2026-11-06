#!/usr/bin/env node
// Guarded automatic rollback for the production release workflow.
//
// This is the second half of the fail-closed release: the workflow deploys main
// immediately, then live-smokes the payment rails. When that smoke reports an
// application failure, this controller reverts production to the previous READY
// deployment.
//
// It refuses to act when production no longer serves the deployment this run
// released. A queued newer release may already own production, and reverting it
// would undo a healthy release. Infrastructure failures never reach this script:
// the workflow retries them instead (see `scripts/lib/live-smoke-classification.mjs`).
//
// Environment:
//   EXPECTED_DEPLOYMENT_ID  Required. The deployment this run released.
//   VERCEL_TOKEN            Required. Same token as the release workflow.
//   VERCEL_PROJECT_ID       Optional when VERCEL_DEPLOY_HOOK_URL is present.
//   VERCEL_DEPLOY_HOOK_URL  Used only to derive the project id.
//   VERCEL_TEAM_ID          Optional. Required for team-owned projects.
//   ROLLBACK_BASE_URL       Optional. Defaults to https://www.oracleinsight.xyz.
//
// Exit codes: 0 rolled back and verified (or deliberately skipped), 1 rollback
// failed, 2 configuration or argument error.

import { realpathSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ReleaseRollbackError,
  configFromEnv,
  readProductionDeployment,
  runReleaseRollback,
} from './release-rollback.mjs';

export function projectIdFromDeployHook(hookUrl) {
  const match = new URL(hookUrl).pathname.match(/\/v1\/integrations\/deploy\/(prj_[A-Za-z0-9]+)\//);
  if (!match) {
    throw new ReleaseRollbackError(
      'Cannot identify the Vercel project from VERCEL_DEPLOY_HOOK_URL. Set VERCEL_PROJECT_ID instead.',
      2
    );
  }
  return match[1];
}

export async function guardAndRollback({
  expectedDeploymentId,
  token,
  projectId,
  teamId,
  baseUrl,
  fetcher = globalThis.fetch,
  log = console.log,
  readProduction = readProductionDeployment,
  rollback = runReleaseRollback,
  now,
  sleep,
}) {
  if (!expectedDeploymentId) {
    throw new ReleaseRollbackError(
      'EXPECTED_DEPLOYMENT_ID is missing; cannot prove production still serves this release. Refusing an automatic rollback.',
      2
    );
  }

  const current = await readProduction({ token, projectId, teamId, fetcher });
  if (current.id !== expectedDeploymentId) {
    log(
      `::warning::Production serves ${current.id}, not ${expectedDeploymentId} that this run released. ` +
        'A newer release owns production, so this run does not roll back.'
    );
    return { status: 'skipped', current };
  }

  log(`Production still serves ${current.id}; rolling back to the previous READY deployment.`);
  const result = await rollback({
    token,
    projectId,
    teamId,
    baseUrl,
    to: 'previous',
    execute: true,
    fetcher,
    now,
    sleep,
    log,
  });

  log(
    `::notice::Automatic rollback switched production from ${current.id} to ${result.target.id} ` +
      `(${result.target.commitSha?.slice(0, 7) ?? 'unknown commit'}); live verification passed.`
  );
  return { status: 'executed', current, result };
}

async function writeOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await appendFile(outputPath, `${key}=${value}\n`);
}

async function main() {
  if (!process.env.VERCEL_PROJECT_ID && process.env.VERCEL_DEPLOY_HOOK_URL) {
    process.env.VERCEL_PROJECT_ID = projectIdFromDeployHook(process.env.VERCEL_DEPLOY_HOOK_URL);
  }
  const config = configFromEnv();
  const outcome = await guardAndRollback({
    ...config,
    expectedDeploymentId: (process.env.EXPECTED_DEPLOYMENT_ID ?? '').trim(),
  });

  await writeOutput('rollback', outcome.status);
  if (outcome.status === 'executed') {
    await writeOutput('restored-deployment-id', outcome.result.target.id);
    await writeOutput('restored-commit', outcome.result.target.commitSha ?? 'unknown');
  }
  return 0;
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}

if (invokedDirectly()) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = error instanceof ReleaseRollbackError ? error.exitCode : 1;
    });
}
