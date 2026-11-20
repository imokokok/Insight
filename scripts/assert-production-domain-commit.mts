import { pathToFileURL } from 'node:url';

// Hard gate before the live smoke: verify the public domain serves this exact
// Cloudflare build before probing payment routes.
export async function assertProductionDomainCommit({
  commitSha,
  domain,
  fetcher = fetch,
}: {
  commitSha: string;
  domain?: string;
  fetcher?: typeof fetch;
}) {
  if (!/^[0-9a-f]{40}$/i.test(commitSha)) throw new Error('Expected a Git commit SHA');
  const baseUrl = domain ?? 'https://www.oracleinsight.xyz';
  const releaseUrl = new URL('/api/health/release', baseUrl);
  let lastObservedSha = 'unavailable';

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetcher(releaseUrl, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (response?.ok) {
      const payload: unknown = await response.json().catch(() => null);
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'releaseSha' in payload &&
        typeof payload.releaseSha === 'string'
      ) {
        lastObservedSha = payload.releaseSha;
        if (lastObservedSha.toLowerCase() === commitSha.toLowerCase()) {
          return { commitSha: lastObservedSha, domain: new URL(baseUrl).origin };
        }
      }
    }
    if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }

  throw new Error(
    `The production domain ${new URL(baseUrl).origin} serves ${lastObservedSha} instead of the released commit ${commitSha}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await assertProductionDomainCommit({
      commitSha: process.env.GITHUB_SHA ?? '',
      domain: process.env.PRODUCTION_BASE_URL,
    });
    console.log(`production-domain-commit=${result.commitSha} domain=${result.domain}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
}
