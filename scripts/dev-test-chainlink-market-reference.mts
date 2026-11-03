/* eslint-disable no-console */
import { fetchChainlinkMarketReference } from '@/lib/marketReference/chainlink';

function parseChainId(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 8453;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('CHAINLINK_DEV_TEST_CHAIN_ID must be a positive integer');
  }
  return parsed;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Chainlink market-reference development check is disabled in production');
  }

  const symbol = (process.env.CHAINLINK_DEV_TEST_SYMBOL ?? 'ETH').trim().toUpperCase();
  const chainId = parseChainId(process.env.CHAINLINK_DEV_TEST_CHAIN_ID);
  const chainlinkResult = await Promise.resolve(fetchChainlinkMarketReference({ symbol, chainId }))
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch((reason: unknown) => ({ status: 'rejected' as const, reason }));
  const chainlink = chainlinkResult.status === 'fulfilled' ? chainlinkResult.value : null;

  const result = {
    mode: 'DEV_TEST_ONLY',
    persisted: false,
    published: false,
    affectsProductionDecisions: false,
    symbol,
    chainId,
    chainlink:
      chainlink === null
        ? {
            status: 'error',
            error:
              chainlinkResult.status === 'rejected'
                ? chainlinkResult.reason instanceof Error
                  ? chainlinkResult.reason.message
                  : String(chainlinkResult.reason)
                : 'unknown error',
          }
        : { status: chainlink.isFresh ? 'fresh' : 'stale', ...chainlink },
    exchanges: {
      status: 'disabled_without_reviewed_vendor_rights',
      quotes: [],
      median: null,
      errors: [],
    },
    divergencePct: null,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!chainlink?.isFresh) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[chainlink-market-reference-dev-test] ${message}`);
  process.exitCode = 1;
});
