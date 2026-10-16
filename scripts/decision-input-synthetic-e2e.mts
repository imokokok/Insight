/* eslint-disable no-console */
/**
 * Local, deterministic decision-input lifecycle exercise. It never makes a
 * network request, persists data, or represents a vendor quote as production
 * evidence. Its assertion is the important part: synthetic quote provenance
 * can pass only in a staging evaluation and must fail closed for a customer.
 */
import { assessDecisionInput } from '@/lib/decisionInputTrust/assessment';

const NOW = new Date('2026-10-13T06:30:00.000Z');
const QUOTE_OBSERVED_AT = '2026-10-13T06:29:58.000Z';

function assess(evidenceUse: 'staging' | 'customer') {
  return assessDecisionInput({
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 10_000,
    request: {
      decisionPriceUsd: 2000,
      quotePriceUsd: 2000.5,
      quoteObservedAt: QUOTE_OBSERVED_AT,
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 50,
      maxQuoteAgeSeconds: 30,
      requireQuoteProvenance: true,
      quoteProvenance: {
        schemaVersion: 1,
        sourceId: 'synthetic-local-fixture',
        rightsScope: 'synthetic',
        captureMethod: 'client-held',
        asset: 'ETH',
        chainId: 1,
        quotePriceUsd: 2000.5,
        observedAt: QUOTE_OBSERVED_AT,
        requestHash: `0x${'11'.repeat(32)}`,
        responseHash: `0x${'22'.repeat(32)}`,
      },
    },
    chainlink: {
      provider: 'chainlink-data-feed',
      symbol: 'ETH',
      quote: 'USD',
      chainId: 1,
      feedAddress: `0x${'01'.repeat(20)}`,
      feedPath: null,
      feedCategory: null,
      heartbeatSeconds: 3600,
      price: 2000.4,
      decimals: 8,
      updatedAt: '2026-10-13T06:29:00.000Z',
      ageSeconds: 60,
      isFresh: true,
      roundId: 'synthetic-round-1',
    },
    cex: {
      symbol: 'ETH',
      refHour: '2026-10-13T06:00:00.000Z',
      refPrice: 2000.8,
      exchangeCount: 3,
      crossExchangeSpreadPct: 0.1,
      medianBidAskSpreadPct: 0.02,
      medianVolume: 1_000_000,
    },
    dex: {
      symbol: 'ETH',
      referenceChain: 'ethereum',
      advisoryOnly: true,
      pools: [
        {
          poolKey: 'synthetic-uniswap-v3-eth-usdc-005',
          dex: 'uniswap-v3',
          feeTier: '0.0005',
          snapshotTs: '2026-10-13T06:29:00.000Z',
          blockNumber: 26_000_000,
          midPrice: 2000,
          tvlUsd: 1_000_000,
          curve: [],
        },
      ],
      cheapestMove1PctUsd: 500_000,
      freshestSnapshotTs: '2026-10-13T06:29:00.000Z',
      note: 'Synthetic local fixture only',
    },
    evidenceUse,
    now: NOW,
  });
}

const staging = assess('staging');
const customer = assess('customer');

if (staging.status !== 'SUFFICIENT') {
  throw new Error(`Synthetic staging exercise unexpectedly failed: ${staging.status}`);
}
if (
  customer.status !== 'INSUFFICIENT_EVIDENCE' ||
  !customer.reasons.some((reason) => reason.code === 'QUOTE_PROVENANCE_RIGHTS')
) {
  throw new Error('Synthetic provenance was not rejected in the customer-facing evaluation');
}

console.log(
  JSON.stringify(
    {
      mode: 'LOCAL_SYNTHETIC_EXERCISE',
      networkRequests: 0,
      persistenceWrites: 0,
      staging: { status: staging.status, quoteInputHash: staging.quoteInputHash },
      customer: { status: customer.status, reasonCodes: customer.reasons.map(({ code }) => code) },
    },
    null,
    2
  )
);
