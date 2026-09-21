import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const terminalFailures = new Set(['ERROR', 'CANCELED', 'BLOCKED', 'DELETED']);

export async function verifyVercelDeploy({
  hookResponse,
  hookUrl,
  token,
  commitSha,
  teamId,
  fetcher = fetch,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 15 * 60_000,
  pollIntervalMs = 10_000,
}) {
  if (!token) throw new Error('VERCEL_TOKEN is required to verify production deployment');
  if (!/^[0-9a-f]{40}$/.test(commitSha ?? '')) throw new Error('Expected a Git commit SHA');
  if (!hookResponse?.job?.id || !Number.isFinite(hookResponse.job.createdAt)) {
    throw new Error('Vercel deploy hook did not return a valid deployment job');
  }

  const projectId = new URL(hookUrl).pathname.match(
    /\/v1\/integrations\/deploy\/(prj_[A-Za-z0-9]+)\//
  )?.[1];
  if (!projectId) throw new Error('Cannot identify the Vercel project from the deploy hook');

  const endpoint = new URL('https://api.vercel.com/v7/deployments');
  endpoint.searchParams.set('projectId', projectId);
  endpoint.searchParams.set('target', 'production');
  endpoint.searchParams.set('sha', commitSha);
  endpoint.searchParams.set('since', String(hookResponse.job.createdAt));
  endpoint.searchParams.set('limit', '20');
  if (teamId) endpoint.searchParams.set('teamId', teamId);

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const response = await fetcher(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Vercel deployment lookup failed: HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.deployments)) throw new Error('Unexpected Vercel deployment response');

    const deployment = body.deployments
      .filter(
        (item) =>
          item.projectId === projectId &&
          item.target === 'production' &&
          item.meta?.githubCommitSha === commitSha &&
          Number(item.createdAt ?? item.created) >= hookResponse.job.createdAt
      )
      .sort(
        (left, right) =>
          Number(right.createdAt ?? right.created) - Number(left.createdAt ?? left.created)
      )[0];

    if (deployment) {
      const state = deployment.readyState ?? deployment.state;
      if (terminalFailures.has(state) || deployment.aliasError) {
        throw new Error(
          `Vercel production deployment ${deployment.uid} failed: ${state ?? 'alias error'}`
        );
      }
      if (
        state === 'READY' &&
        (deployment.aliasAssigned || deployment.readySubstate === 'PROMOTED')
      ) {
        return { id: deployment.uid, url: deployment.url, commitSha };
      }
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Vercel production deployment for ${commitSha} was not ready before the timeout`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const responsePath = process.argv[2];
    if (!responsePath)
      throw new Error('Usage: node scripts/verify-vercel-deploy.mjs <hook-response.json>');
    const hookResponse = JSON.parse(await readFile(responsePath, 'utf8'));
    const result = await verifyVercelDeploy({
      hookResponse,
      hookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
      token: process.env.VERCEL_TOKEN,
      commitSha: process.env.GITHUB_SHA,
      teamId: process.env.VERCEL_TEAM_ID,
    });
    console.log(`Vercel production deployment ready for ${result.commitSha}: ${result.id}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
