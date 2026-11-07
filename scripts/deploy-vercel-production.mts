import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const TERMINAL_FAILURES = new Set(['ERROR', 'CANCELED', 'BLOCKED', 'DELETED']);
const READY = 'READY';

// The custom domain is the only signal that proves users actually receive a
// release. Vercel sets aliasAssigned for the branch alias even when a
// deployment stays STAGED, so aliasAssigned must never stand in for promotion.
const PRODUCTION_DOMAIN = 'www.oracleinsight.xyz';

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
type DeploymentDetail = { nodeVersion?: unknown };
type Fetcher = typeof fetch;

export type DeploymentResult = {
  id: string;
  url: string | null;
  commitSha: string;
  nodeVersion: string;
  runtimeNodeVersion: string | null;
  runtimeNodeDrift: boolean | null;
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

function isRequestTimeout(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'TimeoutError'
  );
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

export type ProductionDomainDeployment = {
  deploymentId: string | null;
  commitSha: string | null;
  readyState: string | null;
  deployment: Deployment;
};

// Resolve what the public custom domain actually serves right now. The alias
// API, not the deployment's own flags, is the authority: a STAGED deployment
// reports aliasAssigned=true through its branch alias while the domain keeps
// serving the previous release.
export async function fetchProductionDomainDeployment({
  token,
  teamId,
  projectId,
  fetcher,
  domain = PRODUCTION_DOMAIN,
}: {
  token: string;
  teamId?: string;
  projectId?: string;
  fetcher: Fetcher;
  domain?: string;
}): Promise<ProductionDomainDeployment | null> {
  const aliasResponse = await fetcher(
    requestUrl(`/v4/aliases?limit=100${projectId ? `&projectId=${projectId}` : ''}`, teamId),
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!aliasResponse.ok) {
    throw new Error(`Vercel alias lookup failed: HTTP ${aliasResponse.status}`);
  }
  const aliasBody: unknown = await aliasResponse.json();
  const aliases = Array.isArray((aliasBody as { aliases?: unknown })?.aliases)
    ? (aliasBody as { aliases: Array<{ alias?: unknown; deploymentId?: unknown }> }).aliases
    : [];
  const match = aliases.find((alias) => alias.alias === domain);
  const id = typeof match?.deploymentId === 'string' ? match.deploymentId : null;
  if (!id) return null;

  const deploymentResponse = await fetcher(requestUrl(`/v13/deployments/${id}`, teamId), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!deploymentResponse.ok) {
    throw new Error(`Vercel deployment lookup for ${domain} failed: HTTP ${deploymentResponse.status}`);
  }
  const deployment = (await deploymentResponse.json()) as Deployment;
  return {
    deploymentId: id,
    commitSha:
      typeof deployment.meta?.githubCommitSha === 'string' ? deployment.meta.githubCommitSha : null,
    readyState: deploymentState(deployment),
    deployment,
  };
}

function servesCommit(domainDeployment: ProductionDomainDeployment | null, commitSha: string) {
  return domainDeployment !== null && domainDeployment.commitSha === commitSha;
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
  let servedCommit: string | null = null;
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
      if (state === READY) {
        const domainDeployment = await fetchProductionDomainDeployment({
          token,
          teamId,
          projectId,
          fetcher,
        });
        if (servesCommit(domainDeployment, commitSha)) return deployment;
        servedCommit = domainDeployment?.commitSha ?? null;
      }
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(
    `Vercel production deployment for ${commitSha} was not ready before the timeout (${PRODUCTION_DOMAIN} serves ${servedCommit ?? 'no commit'})`
  );
}

function nodeMajor(version: string) {
  return version.match(/^v?(\d+)/)?.[1] ?? null;
}

async function fetchDeploymentNodeVersion({
  deploymentId,
  token,
  teamId,
  fetcher,
}: {
  deploymentId: string;
  token: string;
  teamId?: string;
  fetcher: Fetcher;
}) {
  const response = await fetcher(requestUrl(`/v13/deployments/${deploymentId}`, teamId), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Vercel deployment detail lookup failed: HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  const nodeVersion = (body as DeploymentDetail | null)?.nodeVersion;
  return typeof nodeVersion === 'string' && nodeVersion.length > 0 ? nodeVersion : null;
}

async function assertVerifiedNodeVersion({
  deploymentId,
  token,
  teamId,
  fetcher,
}: {
  deploymentId: string;
  token: string;
  teamId?: string;
  fetcher: Fetcher;
}) {
  const nodeVersion = await fetchDeploymentNodeVersion({
    deploymentId,
    token,
    teamId,
    fetcher,
  });
  const verifiedMajor = process.versions.node.split('.')[0];
  if (!nodeVersion) {
    throw new Error(
      `Vercel production deployment ${deploymentId} did not report its Node.js version; CI cannot prove that the verified and production runtimes match`
    );
  }
  if (nodeMajor(nodeVersion) !== verifiedMajor) {
    throw new Error(
      `Vercel production deployment ${deploymentId} ran Node ${nodeVersion}, but CI verified Node ${process.versions.node}. Pin engines.node and the Vercel project Node.js version to the same major before releasing.`
    );
  }
  return nodeVersion;
}

type ReadinessPayload = {
  data?: { runtime?: { node?: unknown } };
  error?: { details?: { runtime?: { node?: unknown } } };
};

// Individual deployment URLs are behind Vercel Authentication, so an
// unauthenticated request there is redirected to an SSO HTML page instead of
// the JSON readiness payload. The public production domain is the only
// unauthenticated way to read the Node.js version the release actually runs on.
const PRODUCTION_BASE_URL = 'https://www.oracleinsight.xyz';

async function fetchRuntimeNodeVersion({
  baseUrl,
  fetcher,
  sleep,
}: {
  baseUrl: string;
  fetcher: Fetcher;
  sleep: (ms: number) => Promise<void>;
}) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(`${baseUrl}/api/v1/health/ready`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 200 || response.status === 503) {
        let body: ReadinessPayload | null = null;
        try {
          body = (await response.json()) as ReadinessPayload | null;
        } catch {
          // A login or error page is HTML, not the readiness payload.
        }
        const node = body?.data?.runtime?.node ?? body?.error?.details?.runtime?.node;
        if (typeof node === 'string' && node.length > 0) return node;
      }
    } catch {
      // Network failures and timeouts must never block a release.
    }
    if (attempt < attempts) await sleep(5_000);
  }
  return null;
}

async function probeRuntimeNodeVersion({
  deploymentId,
  baseUrl,
  fetcher,
  sleep,
}: {
  deploymentId: string;
  baseUrl: string;
  fetcher: Fetcher;
  sleep: (ms: number) => Promise<void>;
}) {
  const runtimeNodeVersion = await fetchRuntimeNodeVersion({ baseUrl, fetcher, sleep });
  const verified = process.versions.node;
  if (!runtimeNodeVersion) {
    console.warn(
      `runtime-node=unverified deployment=${deploymentId}: ${baseUrl}/api/v1/health/ready did not report process.version; Vercel only guarantees major versions, so compare manually with node -v after the release`
    );
    return { runtimeNodeVersion: null, runtimeNodeDrift: null };
  }
  if (nodeMajor(runtimeNodeVersion) !== nodeMajor(verified)) {
    throw new Error(
      `Vercel production deployment ${deploymentId} serves Node ${runtimeNodeVersion}, but CI verified Node ${verified}. The platform-reported version passed, so the runtime does not match the build toolchain; fix the Node pins before releasing.`
    );
  }
  const runtimeNodeDrift = runtimeNodeVersion !== verified;
  if (runtimeNodeDrift) {
    console.warn(
      `runtime-node-drift deployment=${deploymentId}: production runs ${runtimeNodeVersion}, CI verified ${verified}. Vercel only lets projects pin a major version and rolls out minor/patch updates itself, so this difference is expected but must stay visible.`
    );
  }
  return { runtimeNodeVersion, runtimeNodeDrift };
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
  const domainDeployment = await fetchProductionDomainDeployment({
    token,
    teamId,
    projectId,
    fetcher,
  });
  const alreadyPromoted = servesCommit(domainDeployment, commitSha)
    ? existing.find((candidate) => deploymentId(candidate) === domainDeployment?.deploymentId) ??
      domainDeployment?.deployment
    : undefined;
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
    // Vercel can accept a deploy hook and start its build before the hook
    // response reaches us. Retrying after a client-side timeout could create
    // a duplicate production build, so discover the exact-SHA deployment
    // instead and let the normal readiness polling verify it.
    const hookRequestedAt = now();
    try {
      const hookResponse = await fetcher(hookUrl, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
      });
      if (!hookResponse.ok)
        throw new Error(`Vercel deploy hook failed: HTTP ${hookResponse.status}`);
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
    } catch (error) {
      if (!isRequestTimeout(error)) throw error;
      console.warn(
        'Vercel deploy hook response timed out; waiting for the exact-SHA deployment without retrying.'
      );
      deployment = await waitForDeployment({
        projectId,
        token,
        teamId,
        commitSha,
        since: hookRequestedAt,
        fetcher,
        now,
        sleep,
        timeoutMs,
        pollIntervalMs,
      });
    }
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
  const nodeVersion = await assertVerifiedNodeVersion({
    deploymentId: id,
    token,
    teamId,
    fetcher,
  });
  const metrics = deploymentMetrics(deployment);
  const { runtimeNodeVersion, runtimeNodeDrift } = await probeRuntimeNodeVersion({
    deploymentId: id,
    baseUrl: PRODUCTION_BASE_URL,
    fetcher,
    sleep,
  });
  return {
    id,
    url: typeof deployment.url === 'string' ? deployment.url : null,
    commitSha,
    nodeVersion,
    runtimeNodeVersion,
    runtimeNodeDrift,
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
      `- Node.js: ${result.nodeVersion} (CI verified: ${process.versions.node})`,
      `- Runtime Node.js: ${result.runtimeNodeVersion ?? 'unverified'} (CI: ${process.versions.node}, drift: ${result.runtimeNodeDrift === null ? 'unknown' : result.runtimeNodeDrift ? 'yes' : 'no'})`,
      `- Queue: ${minutes(result.queueMs)} min; build: ${minutes(result.buildMs)} min; total: ${minutes(result.totalMs)} min`,
      `- Superseded builds canceled: ${result.canceledDeploymentIds.length}`,
      '',
    ].join('\n')
  );
}

async function writeOutputs(result: DeploymentResult) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await appendFile(
    outputPath,
    [
      `deployment-id=${result.id}`,
      `deployment-url=${result.url ?? ''}`,
      `deployment-node-version=${result.nodeVersion}`,
      `runtime-node-version=${result.runtimeNodeVersion ?? 'unverified'}`,
      `runtime-node-drift=${result.runtimeNodeDrift === null ? 'unknown' : result.runtimeNodeDrift ? 'yes' : 'no'}`,
      `deployment-mode=${result.mode}`,
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
    await writeOutputs(result);
    console.log(
      `Vercel production deployment ${result.id} ${result.mode}; node=${result.nodeVersion} runtime=${result.runtimeNodeVersion ?? 'unverified'} drift=${result.runtimeNodeDrift === null ? 'unknown' : result.runtimeNodeDrift ? 'yes' : 'no'} queue=${minutes(result.queueMs)}m build=${minutes(result.buildMs)}m total=${minutes(result.totalMs)}m canceled=${result.canceledDeploymentIds.length}`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
