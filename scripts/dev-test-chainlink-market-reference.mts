/* eslint-disable no-console */
import { fetchChainlinkMarketReference } from '@/lib/marketReference/chainlink';
import {
  collectMarketReference,
  type LicensedMarketReferenceExchange,
} from '@/lib/marketReference/collector';

const LICENSED_EXCHANGE_NAMES = ['bitstamp', 'bitfinex', 'binance'] as const;

function parseLicensedExchanges(raw: string | undefined): LicensedMarketReferenceExchange[] {
  if (!raw?.trim()) return [];
  const requested = [
    ...new Set(
      raw
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  const unsupported = requested.filter(
    (name) => !LICENSED_EXCHANGE_NAMES.includes(name as (typeof LICENSED_EXCHANGE_NAMES)[number])
  );
  if (unsupported.length > 0) {
    throw new Error(
      `MARKET_REFERENCE_LICENSED_EXCHANGES contains unsupported venue(s): ${unsupported.join(', ')}`
    );
  }
  return requested as LicensedMarketReferenceExchange[];
}

function parseChainId(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 8453;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('CHAINLINK_DEV_TEST_CHAIN_ID must be a positive integer');
  }
  return parsed;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Chainlink market-reference development check is disabled in production');
  }

  const symbol = (process.env.CHAINLINK_DEV_TEST_SYMBOL ?? 'ETH').trim().toUpperCase();
  const chainId = parseChainId(process.env.CHAINLINK_DEV_TEST_CHAIN_ID);
  const licensedExchanges = parseLicensedExchanges(
    process.env.MARKET_REFERENCE_LICENSED_EXCHANGES
  );
  const now = new Date();
  const [exchangeResult, chainlinkResult] = await Promise.allSettled([
    collectMarketReference(now, { symbols: [symbol], licensedExchanges }),
    fetchChainlinkMarketReference({ symbol, chainId }),
  ]);

  const exchanges =
    exchangeResult.status === 'fulfilled'
      ? exchangeResult.value.rows
          .filter((row) => row.symbol === symbol && row.is_success && row.ref_price !== null)
          .flatMap((row) =>
            row.ref_price === null ? [] : [{ exchange: row.exchange, price: row.ref_price }]
          )
      : [];
  const exchangeMedian = median(exchanges.map((row) => row.price));
  const chainlink = chainlinkResult.status === 'fulfilled' ? chainlinkResult.value : null;
  const divergencePct =
    chainlink?.isFresh && exchangeMedian !== null
      ? Number(((Math.abs(chainlink.price - exchangeMedian) / exchangeMedian) * 100).toFixed(4))
      : null;

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
    exchanges:
      exchangeResult.status === 'fulfilled'
        ? {
            status: exchangeResult.value.summary.covered.includes(symbol)
              ? 'available'
              : 'unavailable',
            quotes: exchanges,
            median: exchangeMedian,
            errors: exchangeResult.value.rows
              .filter((row) => row.symbol === symbol && !row.is_success)
              .map((row) => ({ exchange: row.exchange, error: row.error_message })),
          }
        : {
            status: 'error',
            quotes: [],
            median: null,
            error:
              exchangeResult.reason instanceof Error
                ? exchangeResult.reason.message
                : String(exchangeResult.reason),
          },
    divergencePct,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!chainlink?.isFresh || exchangeMedian === null) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[chainlink-market-reference-dev-test] ${message}`);
  process.exitCode = 1;
});
