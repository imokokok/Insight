import { pathToFileURL } from 'node:url';

import { fetchProductionDomainDeployment, projectIdFromHook } from './deploy-vercel-production.mts';

// Hard gate before the live smoke: the smoke probes the public domain, so a
// domain pinned to an older deployment would "pass" while the new release never
// reached users. Compare the domain's actual commit with the released commit.
export async function assertProductionDomainCommit({
  token,
  commitSha,
  teamId,
  projectId,
  domain,
  fetcher = fetch,
}: {
  token: string;
  commitSha: string;
  teamId?: string;
  projectId?: string;
  domain?: string;
  fetcher?: typeof fetch;
}) {
  if (!token) throw new Error('VERCEL_TOKEN is required to assert the production domain');
  if (!/^[0-9a-f]{40}$/.test(commitSha)) throw new Error('Expected a Git commit SHA');
  const domainDeployment = await fetchProductionDomainDeployment({
    token,
    teamId,
    projectId,
    fetcher,
    domain,
  });
  if (!domainDeployment) {
    throw new Error(
      `The production domain ${domain ?? 'www.oracleinsight.xyz'} has no deployment alias`
    );
  }
  if (domainDeployment.commitSha !== commitSha) {
    throw new Error(
      `The production domain ${domain ?? 'www.oracleinsight.xyz'} serves ${domainDeployment.commitSha ?? 'no commit'} (${domainDeployment.deploymentId ?? 'unknown deployment'}) instead of the released commit ${commitSha}`
    );
  }
  return domainDeployment;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    const projectId =
      process.env.VERCEL_PROJECT_ID ?? (hookUrl ? projectIdFromHook(hookUrl) : undefined);
    const result = await assertProductionDomainCommit({
      token: process.env.VERCEL_TOKEN ?? '',
      commitSha: process.env.GITHUB_SHA ?? '',
      teamId: process.env.VERCEL_TEAM_ID,
      projectId,
    });
    console.log(`production-domain-commit=${result.commitSha} deployment=${result.deploymentId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
}
