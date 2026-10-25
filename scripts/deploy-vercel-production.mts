import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const TERMINAL_FAILURES = new Set(['ERROR', 'CANCELED', 'BLOCKED', 'DELETED']);
const READY = 'READY';

type Deployment = {
  uid?: unknown;
  projectId?: unknown;
  target?: unknown;
  createdAt?: unknown;
  created?: unknown;
  buildingAt?: unknown;
  ready?: unknown;
  readyState?: unknown;
  state?: unknown;
  readySubstate?: unknown;
  aliasAssigned?: unknown;
  url?: unknown;
  meta?: { githubCommitSha?: unknown; githubCommitRef?: unknown; deployHookId?: unknown };
};

type HookResponse = { job?: { id?: unknown; createdAt?: unknown } };
type Fetcher = typeof fetch;

export type DeploymentResult = {
  id: string;
  url: string | null;
  commitSha: string;
  mode: 'created' | 'reused';
  canceledDeploymentIds: string[];
  queueMs: number | null;
  buildMs: number | null;
  totalMs: number | null;
};

export function projectIdFromHook(hookUrl: string) {
  const projectId = new URL(hookUrl).pathname.match(
    /\/v1\/integrations\/deploy\/(prj_[A-Za-z0-9]+)\//
  )?.[1];
  if (!projectId) throw new Error('Cannot identify the Vercel project from the deploy hook');
  return projectId;
}

function deploymentTime(
  deployment: Deployment,
  key: 'createdAt' | 'created' | 'buildingAt' | 'ready'
) {
  const value = deployment[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function deploymentId(deployment: Deployment) {
  return typeof deployment.uid === 'string' && deployment.uid.length > 0 ? deployment.uid : null;
}

function deploymentState(deployment: Deployment) {
  return typeof deployment.readyState === 'string'
    ? deployment.readyState
    : typeof deployment.state === 'string'
      ? deployment.state
      : null;
}

function isPromoted(deployment: Deployment) {
  return (
    deploymentState(deployment) === READY &&
    (Boolean(deployment.aliasAssigned) || deployment.readySubstate === 'PROMOTED')
  );
}

function isActive(deployment: Deployment) {
  const state = deploymentState(deployment);
  return state !== null && state !== READY && !TERMINAL_FAILURES.has(state);
}

function isMainDeployHookBuild(deployment: Deployment) {
  return (
    deployment.meta?.githubCommitRef === 'main' &&
    typeof deployment.meta?.githubCommitSha === 'string' &&
    typeof deployment.meta?.deployHookId === 'string'
  );
}

function matchesCommit(
  deployment: Deployment,
  projectId: string,
  commitSha: string,
  since?: number
) {
  const createdAt =
    deploymentTime(deployment, 'createdAt') ?? deploymentTime(deployment, 'created');
  return (
    deployment.projectId === projectId &&
    deployment.target === 'production' &&
    deployment.meta?.githubCommitSha === commitSha &&
    (since === undefined || (createdAt !== null && createdAt >= since))
  );
}

function deploymentMetrics(deployment: Deployment) {
  const createdAt =
    deploymentTime(deployment, 'createdAt') ?? deploymentTime(deployment, 'created');
  const buildingAt = deploymentTime(deployment, 'buildingAt');
  const readyAt = deploymentTime(deployment, 'ready');
  return {
    queueMs: createdAt !== null && buildingAt !== null ? Math.max(0, buildingAt - createdAt) : null,
    buildMs: buildingAt !== null && readyAt !== null ? Math.max(0, readyAt - buildingAt) : null,
    totalMs: createdAt !== null && readyAt !== null ? Math.max(0, readyAt - createdAt) : null,
  };
}

function requestUrl(path: string, teamId?: string) {
  const endpoint = new URL(path, 'https://api.vercel.com');
  if (teamId) endpoint.searchParams.set('teamId', teamId);
  return endpoint;
}

async function listDeployments({
  projectId,
  token,
  teamId,
  commitSha,
  fetcher,
}: {
  projectId: string;
  token: string;
  teamId?: string;
  commitSha?: string;
  fetcher: Fetcher;
}) {
  const endpoint = requestUrl('/v7/deployments', teamId);
  endpoint.searchParams.set('projectId', projectId);
  endpoint.searchParams.set('target', 'production');
  endpoint.searchParams.set('limit', '100');
  if (commitSha) endpoint.searchParams.set('sha', commitSha);
  const response = await fetcher(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Vercel deployment lookup failed: HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray((body as { deployments?: unknown }).deployments)
  ) {
    throw new Error('Unexpected Vercel deployment response');
  }
  return (body as { deployments: Deployment[] }).deployments;
}

async function cancelDeployment({
  deploymentId: id,
  token,
  teamId,
  fetcher,
}: {
  deploymentId: string;
  token: string;
  teamId?: string;
  fetcher: Fetcher;
}) {
  const response = await fetcher(requestUrl(`/v12/deployments/${id}/cancel`, teamId), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  // A deployment can complete between the list and cancel calls. It is no longer
  // consuming build capacity in that case, so a conflict or absence is harmless.
  if (!response.ok && response.status !== 404 && response.status !== 409) {
    throw new Error(`Vercel cancellation failed for ${id}: HTTP ${response.status}`);
  }
}

async function cancelSupersededDeployments({
  projectId,
  token,
  teamId,
  commitSha,
  fetcher,
}: {
  projectId: string;
  token: string;
  teamId?: string;
  commitSha: string;
  fetcher: Fetcher;
}) {
  const deployments = await listDeployments({ projectId, token, teamId, fetcher });
  const activeMainHookDeployments = deployments.filter(
    (deployment) =>
      deployment.projectId === projectId &&
      deployment.target === 'production' &&
      isMainDeployHookBuild(deployment) &&
      isActive(deployment)
  );

  const current = activeMainHookDeployments
    .filter((deployment) => deployment.meta?.githubCommitSha === commitSha)
    .sort(
      (left, right) =>
        (deploymentTime(left, 'createdAt') ?? deploymentTime(left, 'created') ?? 0) -
        (deploymentTime(right, 'createdAt') ?? deploymentTime(right, 'created') ?? 0)
    );
  const retainedCurrentId = current.length > 0 ? deploymentId(current[0]) : null;
  const toCancel = activeMainHookDeployments.filter((deployment) => {
    const id = deploymentId(deployment);
    return (
      deployment.meta?.githubCommitSha !== commitSha || (id !== null && id !== retainedCurrentId)
    );
  });

  await Promise.all(
    toCancel.flatMap((deployment) => {
      const id = deploymentId(deployment);
      return id ? [cancelDeployment({ deploymentId: id, token, teamId, fetcher })] : [];
    })
  );
  return toCancel.flatMap((deployment) => {
    const id = deploymentId(deployment);
    return id ? [id] : [];
  });
}

async function waitForDeployment({
  projectId,
  token,
  teamId,
  commitSha,
  since,
  fetcher,
  now,
  sleep,
  timeoutMs,
  pollIntervalMs,
}: {
  projectId: string;
  token: string;
  teamId?: string;
  commitSha: string;
  since?: number;
  fetcher: Fetcher;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  timeoutMs: number;
  pollIntervalMs: number;
}) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const deployments = await listDeployments({ projectId, token, teamId, commitSha, fetcher });
    const deployment = deployments
      .filter((candidate) => matchesCommit(candidate, projectId, commitSha, since))
      .sort(
        (left, right) =>
          (deploymentTime(right, 'createdAt') ?? deploymentTime(right, 'created') ?? 0) -
          (deploymentTime(left, 'createdAt') ?? deploymentTime(left, 'created') ?? 0)
      )[0];
    if (deployment) {
      const state = deploymentState(deployment);
      const id = deploymentId(deployment) ?? 'unknown';
      if (state && TERMINAL_FAILURES.has(state)) {
        throw new Error(`Vercel production deployment ${id} failed: ${state}`);
      }
      if (isPromoted(deployment)) return deployment;
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Vercel production deployment for ${commitSha} was not ready before the timeout`);
}

export async function deployVercelProduction({
  hookUrl,
  token,
  commitSha,
  teamId,
  fetcher = fetch,
  now = Date.now,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 15 * 60_000,
  pollIntervalMs = 10_000,
}: {
  hookUrl: string;
  token: string;
  commitSha: string;
  teamId?: string;
  fetcher?: Fetcher;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<DeploymentResult> {
  if (!token) throw new Error('VERCEL_TOKEN is required for production deployment control');
  if (!/^[0-9a-f]{40}$/.test(commitSha)) throw new Error('Expected a Git commit SHA');
  const projectId = projectIdFromHook(hookUrl);
  const canceledDeploymentIds = await cancelSupersededDeployments({
    projectId,
    token,
    teamId,
    commitSha,
    fetcher,
  });

  const existing = await listDeployments({ projectId, token, teamId, commitSha, fetcher });
  const alreadyPromoted = existing
    .filter(
      (deployment) => matchesCommit(deployment, projectId, commitSha) && isPromoted(deployment)
    )
    .sort(
      (left, right) =>
        (deploymentTime(right, 'createdAt') ?? deploymentTime(right, 'created') ?? 0) -
        (deploymentTime(left, 'createdAt') ?? deploymentTime(left, 'created') ?? 0)
    )[0];
  const activeCurrentBuild = existing
    .filter(
      (deployment) =>
        matchesCommit(deployment, projectId, commitSha) &&
        isMainDeployHookBuild(deployment) &&
        isActive(deployment)
    )
    .sort(
      (left, right) =>
        (deploymentTime(left, 'createdAt') ?? deploymentTime(left, 'created') ?? 0) -
        (deploymentTime(right, 'createdAt') ?? deploymentTime(right, 'created') ?? 0)
    )[0];
  const mode: DeploymentResult['mode'] =
    alreadyPromoted || activeCurrentBuild ? 'reused' : 'created';

  let deployment = alreadyPromoted ?? activeCurrentBuild;
  if (!deployment) {
    const hookResponse = await fetcher(hookUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
    });
    if (!hookResponse.ok) throw new Error(`Vercel deploy hook failed: HTTP ${hookResponse.status}`);
    const hookBody: HookResponse = await hookResponse.json();
    if (!hookBody.job?.id || !Number.isFinite(hookBody.job.createdAt)) {
      throw new Error('Vercel deploy hook did not return a valid deployment job');
    }
    deployment = await waitForDeployment({
      projectId,
      token,
      teamId,
      commitSha,
      since: hookBody.job.createdAt as number,
      fetcher,
      now,
      sleep,
      timeoutMs,
      pollIntervalMs,
    });
  } else if (!alreadyPromoted) {
    // A concurrent workflow_dispatch can reach here with the same SHA. Reuse
    // its Deploy Hook build rather than starting a duplicate remote build.
    const createdAt =
      deploymentTime(deployment, 'createdAt') ?? deploymentTime(deployment, 'created');
    deployment = await waitForDeployment({
      projectId,
      token,
      teamId,
      commitSha,
      since: createdAt ?? undefined,
      fetcher,
      now,
      sleep,
      timeoutMs,
      pollIntervalMs,
    });
  }

  const id = deploymentId(deployment);
  if (!id) throw new Error('Vercel returned a deployment without an id');
  const metrics = deploymentMetrics(deployment);
  return {
    id,
    url: typeof deployment.url === 'string' ? deployment.url : null,
    commitSha,
    mode,
    canceledDeploymentIds,
    ...metrics,
  };
}

function minutes(milliseconds: number | null) {
  return milliseconds === null ? 'n/a' : (milliseconds / 60_000).toFixed(2);
}

async function writeSummary(result: DeploymentResult) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  await appendFile(
    summaryPath,
    [
      '### Vercel production deployment',
      '',
      `- Commit: \`${result.commitSha}\``,
      `- Deployment: \`${result.id}\` (${result.mode})`,
      `- Queue: ${minutes(result.queueMs)} min; build: ${minutes(result.buildMs)} min; total: ${minutes(result.totalMs)} min`,
      `- Superseded builds canceled: ${result.canceledDeploymentIds.length}`,
      '',
    ].join('\n')
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await deployVercelProduction({
      hookUrl: process.env.VERCEL_DEPLOY_HOOK_URL ?? '',
      token: process.env.VERCEL_TOKEN ?? '',
      commitSha: process.env.GITHUB_SHA ?? '',
      teamId: process.env.VERCEL_TEAM_ID,
    });
    await writeSummary(result);
    console.log(
      `Vercel production deployment ${result.id} ${result.mode}; queue=${minutes(result.queueMs)}m build=${minutes(result.buildMs)}m total=${minutes(result.totalMs)}m canceled=${result.canceledDeploymentIds.length}`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
