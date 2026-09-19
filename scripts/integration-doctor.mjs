import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

function origin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('Use a base origin without credentials, path or query');
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  )
    throw new Error('HTTPS is required outside loopback');
  return url.origin;
}

export async function integrationDoctor(options = {}) {
  const {
    offer = 'combined',
    probe = false,
    samples = 1,
    asset = 'USDC',
    chainId = 1,
    maxSourceAgeSeconds = 300,
    fetcher = fetch,
    apiKey = process.env.INSIGHT_API_KEY,
    insightUrl = process.env.INSIGHT_BASE_URL ?? 'https://www.oracleinsight.xyz',
    priorsealUrl = process.env.PRIORSEAL_BASE_URL ?? 'https://priorseal.xyz',
  } = options;
  if (!['insight', 'priorseal', 'combined'].includes(offer))
    throw new Error('offer must be insight, priorseal or combined');
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 10)
    throw new Error('samples must be between 1 and 10');
  if (
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    !Number.isSafeInteger(maxSourceAgeSeconds) ||
    maxSourceAgeSeconds < 1
  )
    throw new Error('chain and freshness must be positive integers');
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(asset)) throw new Error('Invalid asset symbol');
  if (probe && (offer === 'priorseal' || !apiKey))
    throw new Error(
      'An Insight offer and INSIGHT_API_KEY are required for the explicit, billable probe'
    );
  const checks = [];
  const read = async (base, path, authenticated = false) => {
    const startedAt = performance.now();
    try {
      const response = await fetcher(`${base}${path}`, {
        headers: authenticated ? { 'x-api-key': apiKey } : {},
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.json();
      const check = {
        path: path.split('?')[0],
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        ok: response.ok,
      };
      if (authenticated)
        check.billing = {
          requestId: response.headers.get('x-request-id'),
          cost: response.headers.get('x-credit-cost'),
          status: response.headers.get('x-credit-status'),
          receipt: response.headers.get('x-credit-receipt'),
          balanceAfter: response.headers.get('x-credit-balance-after'),
        };
      checks.push(check);
      return { check, body };
    } catch {
      const check = {
        path: path.split('?')[0],
        ok: false,
        status: null,
        durationMs: Math.round(performance.now() - startedAt),
        error: 'REQUEST_UNAVAILABLE',
      };
      checks.push(check);
      return { check, body: null };
    }
  };
  if (offer !== 'priorseal') {
    const base = origin(insightUrl);
    const live = await read(base, '/api/v1/health');
    live.check.ok &&= live.body?.data?.status === 'ok';
    const ready = await read(base, '/api/v1/health/ready');
    ready.check.ok &&= ready.body?.data?.status === 'ready';
    if (probe)
      for (let i = 0; i < samples; i++) {
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
        const query = new URLSearchParams({
          asset: asset.toUpperCase(),
          chainId: String(chainId),
          probe: 'true',
          maxSourceAgeSeconds: String(maxSourceAgeSeconds),
        });
        const { body, check } = await read(base, `/api/v1/coverage?${query}`, true);
        const diagnostic = body?.data?.diagnostic;
        check.ok &&= diagnostic?.freshnessStatus === 'SUFFICIENT';
        check.diagnostic = diagnostic
          ? {
              status: diagnostic.status,
              freshnessStatus: diagnostic.freshnessStatus,
              freshCount: diagnostic.freshCount,
              freshNonDerivedGroupCount: diagnostic.freshNonDerivedGroupCount,
              freshnessShortfall: diagnostic.freshnessShortfall,
              providers: diagnostic.providers?.map((p) => ({
                provider: p.provider,
                reason: p.reason,
                dataAgeSeconds: p.dataAgeSeconds,
                fetchDurationMs: p.fetchDurationMs,
                fresh: p.fresh,
                included: p.included,
              })),
            }
          : null;
      }
  }
  if (offer !== 'insight') {
    const base = origin(priorsealUrl);
    const live = await read(base, '/health/live');
    live.check.ok &&= live.body?.status === 'ok';
    const ready = await read(base, '/health/ready');
    ready.check.ok &&= ready.body?.status === 'ready';
    const capabilities = await read(base, '/v1/capabilities');
    capabilities.check.capabilities = capabilities.body;
    // Discovery is intentionally not a declaration of signer trust or live RPC availability.
    capabilities.check.ok &&= typeof capabilities.body?.audience === 'string';
  }
  return {
    schema: 'workflow.integration-diagnostic.v1',
    checkedAt: new Date().toISOString(),
    offer,
    ok: checks.every((c) => c.ok),
    scope: probe
      ? 'PUBLIC_HEALTH_AND_BILLABLE_COVERAGE_NOT_SIGNED_ASSESSMENT'
      : 'PUBLIC_HEALTH_AND_CONFIGURATION_ONLY',
    checks,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({
      options: {
        offer: { type: 'string' },
        probe: { type: 'boolean' },
        samples: { type: 'string' },
        asset: { type: 'string' },
        chain: { type: 'string' },
        freshness: { type: 'string' },
      },
    });
    const result = await integrationDoctor({
      offer: values.offer,
      probe: values.probe,
      samples: Number(values.samples ?? 1),
      asset: values.asset,
      chainId: Number(values.chain ?? 1),
      maxSourceAgeSeconds: Number(values.freshness ?? 300),
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
