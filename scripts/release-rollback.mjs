#!/usr/bin/env node
// Production rollback controller for the Vercel-hosted Insight release.
//
// It shows which deployment currently serves production, resolves the target
// deployment, switches production traffic with Vercel's rollback (or promote)
// API, waits until the production alias actually points at the target, and
// probes the live site. Nothing is mutated unless --yes is passed.
//
// Usage:
//   npm run release:rollback
//   npm run release:rollback -- --to previous --yes
//   npm run release:rollback -- --to dpl_abc123 --yes
//   npm run release:rollback -- --to https://app-abc123.vercel.app --yes
//   npm run release:rollback -- --to dpl_abc123 --method promote --yes
//
// Environment (loaded by the npm script from .env.vercel.local when present):
//   VERCEL_TOKEN       Required. Read/write access to the Vercel project.
//   VERCEL_PROJECT_ID  Required. The project whose production alias is moved.
//   VERCEL_TEAM_ID     Optional. Required for team-owned projects.
//   ROLLBACK_BASE_URL  Optional. Defaults to https://www.oracleinsight.xyz.
//
// Exit codes: 0 success (or dry run), 1 rollback or verification failure,
// 2 missing configuration or invalid arguments.

import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API_HOST = 'https://api.vercel.com';
const DEFAULT_BASE_URL = 'https://www.oracleinsight.xyz';
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const READY = 'READY';
const PRODUCTION_CHECKS = [
  { name: 'homepage', path: '/', status: 200 },
  { name: 'login', path: '/login', status: 200 },
  { name: 'liveness', path: '/api/v1/health', status: 200, requireSuccess: true },
  { name: 'readiness', path: '/api/v1/health/ready', status: 200 },
];

export class ReleaseRollbackError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'ReleaseRollbackError';
    this.exitCode = exitCode;
  }
}

function deploymentCreatedAt(deployment) {
  const value = deployment?.createdAt ?? deployment?.created;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function deploymentId(deployment) {
  const value = deployment?.id ?? deployment?.uid;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function summarizeDeployment(deployment) {
  const id = deploymentId(deployment);
  if (!id) throw new ReleaseRollbackError('Vercel returned a deployment without an id');
  return {
    id,
    url: typeof deployment.url === 'string' ? deployment.url : null,
    commitSha:
      typeof deployment.meta?.githubCommitSha === 'string' ? deployment.meta.githubCommitSha : null,
    commitRef:
      typeof deployment.meta?.githubCommitRef === 'string' ? deployment.meta.githubCommitRef : null,
    createdAt: deploymentCreatedAt(deployment),
    aliases: Array.isArray(deployment.alias)
      ? deployment.alias.filter((alias) => typeof alias === 'string')
      : [],
  };
}

function formatTime(milliseconds) {
  if (milliseconds === null) return 'unknown time';
  return new Date(milliseconds).toISOString().replace('.000Z', 'Z');
}

function formatSeconds(milliseconds) {
  return (milliseconds / 1000).toFixed(1);
}

function formatCommit(commitSha) {
  return commitSha ? commitSha.slice(0, 7) : 'unknown';
}

function printDeployment(label, deployment) {
  const lines = [
    `  ${label}: ${deployment.id}`,
    `    commit: ${formatCommit(deployment.commitSha)}${deployment.commitRef ? ` (${deployment.commitRef})` : ''}`,
    `    created: ${formatTime(deployment.createdAt)}`,
    `    deployment URL: ${deployment.url ?? 'n/a'}`,
  ];
  if (deployment.aliases.length > 0)
    lines.push(`    production aliases: ${deployment.aliases.join(', ')}`);
  return lines.join('\n');
}

function apiUrl(path, teamId) {
  const endpoint = new URL(path, API_HOST);
  if (teamId) endpoint.searchParams.set('teamId', teamId);
  return endpoint;
}

function vercelErrorMessage(status, body) {
  if (body && typeof body === 'object') {
    const message = body.error?.message ?? body.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'no response body';
}

async function requestVercel({ path, method, token, teamId, fetcher }) {
  const response = await fetcher(apiUrl(path), {
    method,
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const detail = vercelErrorMessage(response.status, body);
    if (response.status === 401) {
      throw new ReleaseRollbackError(
        `Vercel rejected VERCEL_TOKEN (HTTP 401): ${detail}. Replace the token in .env.vercel.local.`,
        2
      );
    }
    if (response.status === 402) {
      throw new ReleaseRollbackError(
        `Vercel refused the rollback (HTTP 402): ${detail}. On the Hobby plan only the immediately previous production deployment can be targeted. Roll forward with --method promote or upgrade the plan.`
      );
    }
    if (response.status === 403) {
      throw new ReleaseRollbackError(
        `Vercel denied access (HTTP 403): ${detail}. Confirm the token belongs to the team that owns ${path.split('/')[2]}.`
      );
    }
    if (response.status === 404) {
      throw new ReleaseRollbackError(
        `Vercel resource not found (HTTP 404): ${detail} (${method} ${path})`
      );
    }
    throw new ReleaseRollbackError(
      `Vercel API failed (HTTP ${response.status}): ${detail} (${method} ${path})`
    );
  }
  return body;
}

export function parseArgs(argv) {
  const options = {
    to: 'previous',
    yes: false,
    method: 'auto',
    baseUrl: undefined,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    help: false,
  };
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--to') options.to = requireValue(args, '--to');
    else if (arg.startsWith('--to=')) options.to = arg.slice('--to='.length);
    else if (arg === '--method') options.method = requireValue(args, '--method');
    else if (arg.startsWith('--method=')) options.method = arg.slice('--method='.length);
    else if (arg === '--base-url') options.baseUrl = requireValue(args, '--base-url');
    else if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length);
    else if (arg === '--timeout-ms') options.timeoutMs = Number(requireValue(args, '--timeout-ms'));
    else if (arg.startsWith('--timeout-ms='))
      options.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    else throw new ReleaseRollbackError(`Unknown argument: ${arg}. Run with --help for usage.`, 2);
  }
  if (!['auto', 'rollback', 'promote'].includes(options.method)) {
    throw new ReleaseRollbackError(
      `--method must be auto, rollback or promote (received ${options.method})`,
      2
    );
  }
  if (!options.to) throw new ReleaseRollbackError('--to must not be empty', 2);
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 5_000) {
    throw new ReleaseRollbackError('--timeout-ms must be a number of at least 5000', 2);
  }
  return options;
}

function requireValue(args, flag) {
  const value = args.shift();
  if (!value || value.startsWith('--')) {
    throw new ReleaseRollbackError(`${flag} requires a value`, 2);
  }
  return value;
}

export function configFromEnv(env = process.env) {
  const token = typeof env.VERCEL_TOKEN === 'string' ? env.VERCEL_TOKEN.trim() : '';
  if (!token) {
    throw new ReleaseRollbackError(
      'VERCEL_TOKEN is missing. Add VERCEL_TOKEN to .env.vercel.local or export it before running. Do not commit the token.',
      2
    );
  }
  const projectId = typeof env.VERCEL_PROJECT_ID === 'string' ? env.VERCEL_PROJECT_ID.trim() : '';
  if (!projectId) {
    throw new ReleaseRollbackError(
      'VERCEL_PROJECT_ID is missing. Add VERCEL_PROJECT_ID (prj_...) to .env.vercel.local or export it.',
      2
    );
  }
  return {
    token,
    projectId,
    teamId:
      typeof env.VERCEL_TEAM_ID === 'string' && env.VERCEL_TEAM_ID.trim()
        ? env.VERCEL_TEAM_ID.trim()
        : undefined,
    baseUrl:
      typeof env.ROLLBACK_BASE_URL === 'string' && env.ROLLBACK_BASE_URL.trim()
        ? env.ROLLBACK_BASE_URL.trim().replace(/\/$/, '')
        : DEFAULT_BASE_URL,
  };
}

async function fetchProject({ projectId, token, teamId, fetcher }) {
  const project = await requestVercel({
    path: `/v9/projects/${encodeURIComponent(projectId)}`,
    method: 'GET',
    token,
    teamId,
    fetcher,
  });
  const production = project?.targets?.production;
  const id = deploymentId(production);
  if (!id) {
    throw new ReleaseRollbackError(
      `Vercel project ${projectId} has no production deployment. Refusing to guess the live version.`
    );
  }
  return { project, production, current: summarizeDeployment(production) };
}

async function listProductionDeployments({ projectId, token, teamId, fetcher }) {
  const endpoint = new URL('/v6/deployments', API_HOST);
  endpoint.searchParams.set('projectId', projectId);
  endpoint.searchParams.set('target', 'production');
  endpoint.searchParams.set('limit', '100');
  if (teamId) endpoint.searchParams.set('teamId', teamId);
  const response = await fetcher(endpoint, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ReleaseRollbackError(
      `Vercel deployment list failed (HTTP ${response.status}): ${vercelErrorMessage(response.status, body)}`
    );
  }
  if (!Array.isArray(body?.deployments)) {
    throw new ReleaseRollbackError('Unexpected Vercel deployment list response');
  }
  return body.deployments
    .map((deployment) => ({
      raw: deployment,
      summary: summarizeDeployment(deployment),
    }))
    .filter(({ raw }) => raw.readyState === READY)
    .sort((left, right) => (right.summary.createdAt ?? 0) - (left.summary.createdAt ?? 0));
}

function normalizeDeploymentReference(reference) {
  const value = reference.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).hostname;
    } catch {
      throw new ReleaseRollbackError(`Invalid deployment URL: ${reference}`, 2);
    }
  }
  return value;
}

async function fetchDeployment({ reference, projectId, token, teamId, fetcher }) {
  const deployment = await requestVercel({
    path: `/v13/deployments/${encodeURIComponent(normalizeDeploymentReference(reference))}`,
    method: 'GET',
    token,
    teamId,
    fetcher,
  });
  if (typeof deployment?.projectId === 'string' && deployment.projectId !== projectId) {
    throw new ReleaseRollbackError(
      `Deployment ${reference} belongs to ${deployment.projectId}, not ${projectId}. Refusing a cross-project rollback.`
    );
  }
  if (deployment?.target !== 'production') {
    throw new ReleaseRollbackError(
      `Deployment ${reference} is not a production deployment (target=${deployment?.target ?? 'null'})`
    );
  }
  if (deployment?.readyState !== READY) {
    throw new ReleaseRollbackError(
      `Deployment ${reference} is not READY (state=${deployment?.readyState ?? 'unknown'})`
    );
  }
  return summarizeDeployment(deployment);
}

export async function resolveTarget({
  reference: rawReference,
  current,
  deployments,
  projectId,
  token,
  teamId,
  fetcher,
}) {
  const reference = rawReference.trim();
  if (reference === 'previous') {
    const previous = deployments.find(
      ({ summary }) =>
        summary.id !== current.id && (summary.createdAt ?? 0) < (current.createdAt ?? 0)
    );
    if (!previous) {
      throw new ReleaseRollbackError(
        'No earlier READY production deployment exists to roll back to.'
      );
    }
    return { target: previous.summary, previous: previous.summary };
  }

  const normalized = normalizeDeploymentReference(reference);
  const listed = deployments.find(
    ({ summary }) =>
      summary.id === normalized || (summary.url !== null && summary.url === normalized)
  );
  if (listed) {
    const previous = deployments.find(
      ({ summary }) =>
        summary.id !== listed.summary.id &&
        (summary.createdAt ?? 0) < (listed.summary.createdAt ?? 0)
    );
    return { target: listed.summary, previous: previous?.summary ?? null };
  }

  const fetched = await fetchDeployment({
    reference,
    projectId,
    token,
    teamId,
    fetcher,
  });
  const previous = deployments.find(
    ({ summary }) =>
      summary.id !== fetched.id && (summary.createdAt ?? 0) < (fetched.createdAt ?? 0)
  );
  return { target: fetched, previous: previous?.summary ?? null };
}

function decideMethod({ requested, current, target }) {
  if (requested !== 'auto') return requested;
  const currentAt = current.createdAt ?? 0;
  const targetAt = target.createdAt ?? 0;
  return targetAt > currentAt ? 'promote' : 'rollback';
}

async function switchProduction({
  method,
  projectId,
  deploymentId: targetId,
  token,
  teamId,
  fetcher,
}) {
  const path =
    method === 'rollback'
      ? `/v1/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(targetId)}`
      : `/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(targetId)}`;
  await requestVercel({ path, method: 'POST', token, teamId, fetcher });
  return path;
}

async function waitForProduction({
  projectId,
  token,
  teamId,
  fetcher,
  expectedId,
  timeoutMs,
  pollIntervalMs,
  now,
  sleep,
}) {
  const deadline = now() + timeoutMs;
  let observedId = null;
  while (now() < deadline) {
    const { current } = await fetchProject({ projectId, token, teamId, fetcher });
    observedId = current.id;
    if (current.id === expectedId) return current;
    await sleep(pollIntervalMs);
  }
  throw new ReleaseRollbackError(
    `Production alias did not switch to ${expectedId} within ${Math.round(timeoutMs / 1000)}s; last observed ${observedId ?? 'unknown'}.`
  );
}

async function probeLiveSite({ baseUrl, fetcher, sleep, attempts = 3 }) {
  const failures = [];
  for (const check of PRODUCTION_CHECKS) {
    const url = `${baseUrl}${check.path}`;
    let lastError = null;
    let passed = false;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetcher(url, {
          headers: { accept: 'text/html,application/json' },
          signal: AbortSignal.timeout(20_000),
        });
        if (response.status !== check.status) {
          lastError = `expected HTTP ${check.status}, got ${response.status}`;
        } else if (check.requireSuccess) {
          const body = await response.json().catch(() => null);
          if (body?.success === true) {
            passed = true;
            break;
          }
          lastError = 'response body does not report success=true';
        } else {
          passed = true;
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt < attempts) await sleep(1_000 * attempt);
    }
    if (!passed) failures.push(`[${check.name}] ${lastError}`);
  }
  return failures;
}

export async function runReleaseRollback({
  token,
  projectId,
  teamId,
  baseUrl = DEFAULT_BASE_URL,
  to = 'previous',
  method = 'auto',
  execute = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetcher = globalThis.fetch,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console.log,
}) {
  const { project, current } = await fetchProject({ projectId, token, teamId, fetcher });
  const deployments = await listProductionDeployments({ projectId, token, teamId, fetcher });
  const { target, previous } = await resolveTarget({
    reference: to,
    current,
    deployments,
    projectId,
    token,
    teamId,
    fetcher,
  });
  if (target.id === current.id) {
    throw new ReleaseRollbackError(`Production already serves ${target.id}; nothing to change.`);
  }
  const resolvedMethod = decideMethod({ requested: method, current, target });
  const plan = project?.targets?.production?.plan ?? null;
  const adjacent = previous?.id === target.id;

  log('Production rollback plan');
  log(`  project: ${project?.name ?? projectId} (${projectId})`);
  log(`  plan: ${plan ?? 'unknown'}`);
  log(`  live site: ${baseUrl}`);
  log(printDeployment('current production', current));
  log(printDeployment('target', target));
  log(`  action: ${resolvedMethod}`);
  log(
    `  endpoint: POST /v${resolvedMethod === 'rollback' ? '1' : '10'}/projects/${projectId}/${resolvedMethod}/${target.id}`
  );
  log('  rebuild: none — Vercel moves the production alias at the routing layer.');

  if (resolvedMethod === 'rollback' && plan === 'hobby' && !adjacent) {
    log(
      '  warning: this project is on the Hobby plan. Vercel normally permits rolling back only to the immediately previous production deployment; the API may answer HTTP 402. Pass --method promote for a forward restore or upgrade the plan.'
    );
  }

  if (!execute) {
    log('\nDry run only: no production traffic was changed. Re-run with --yes to execute.');
    return { project, current, target, method: resolvedMethod, executed: false };
  }

  const startedAt = now();
  await switchProduction({
    method: resolvedMethod,
    projectId,
    deploymentId: target.id,
    token,
    teamId,
    fetcher,
  });
  const acceptedAt = now();
  const switched = await waitForProduction({
    projectId,
    token,
    teamId,
    fetcher,
    expectedId: target.id,
    timeoutMs,
    pollIntervalMs,
    now,
    sleep,
  });
  const switchedAt = now();
  const smokeFailures = await probeLiveSite({ baseUrl, fetcher, sleep });
  const verifiedAt = now();

  log('\nProduction traffic switched');
  log(`  current production now: ${switched.id} (${formatCommit(switched.commitSha)})`);
  if (smokeFailures.length > 0) {
    log('\nLive verification FAILED');
    for (const failure of smokeFailures) log(`  ${failure}`);
    throw new ReleaseRollbackError(
      `Production now serves ${target.id}, but live verification failed. Roll forward to the previous deployment with --method promote/--to, or engage the issuance halt.`
    );
  }
  log('  live verification: passed (homepage, login, liveness, readiness)');
  log('\nTiming');
  log(`  API accepted:        ${formatSeconds(acceptedAt - startedAt)}s`);
  log(`  production switched: ${formatSeconds(switchedAt - startedAt)}s`);
  log(`  verified:            ${formatSeconds(verifiedAt - startedAt)}s`);
  log(`  total:               ${formatSeconds(verifiedAt - startedAt)}s`);

  return {
    project,
    current,
    target,
    method: resolvedMethod,
    executed: true,
    smokeFailures,
    timings: {
      acceptedMs: acceptedAt - startedAt,
      switchedMs: switchedAt - startedAt,
      verifiedMs: verifiedAt - startedAt,
    },
  };
}

function printHelp() {
  console.log(
    [
      'Usage: npm run release:rollback -- [options]',
      '',
      'Options:',
      '  --to <previous|deployment-id|deployment-url>  Target deployment (default: previous)',
      '  --method <auto|rollback|promote>               Force the Vercel API path (default: auto)',
      '  --yes                                          Execute the switch (otherwise dry run)',
      '  --base-url <url>                               Live site used for smoke checks',
      '  --timeout-ms <ms>                              Alias propagation timeout (default: 120000)',
      '  --help                                         Show this message',
      '',
      'Environment: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional),',
      'ROLLBACK_BASE_URL (optional). The npm script loads .env.vercel.local when present.',
    ].join('\n')
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }
  const config = configFromEnv();
  await runReleaseRollback({
    ...config,
    baseUrl: options.baseUrl ?? config.baseUrl,
    to: options.to,
    method: options.method,
    execute: options.yes,
    timeoutMs: options.timeoutMs,
  });
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
