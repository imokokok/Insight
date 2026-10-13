import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';
import { MANIP_COST_MAX_AGE_MS, type ManipCostAdvisory } from '@/lib/manipCost/baseline';
import type { ChainlinkMarketReference } from '@/lib/marketReference/chainlink';
import { MAX_REF_AGE_HOURS, type MarketReference } from '@/lib/marketReference/client';

export interface DecisionInputCheckRequest {
  /** Price the application or agent intends to use, in USD per asset. */
  decisionPriceUsd: number;
  /** Price returned by the actual venue quote, in USD per asset. */
  quotePriceUsd: number;
  /** Timestamp supplied with the venue quote; must include a timezone. */
  quoteObservedAt: string;
  /** Maximum allowed difference between the decision price and references. */
  maxReferenceDeviationBps: number;
  /** Maximum allowed quote-to-decision-price difference. */
  maxSlippageBps: number;
  /** Maximum acceptable age for the supplied venue quote. */
  maxQuoteAgeSeconds: number;
  /** Optional route quote captured by the gated execution workflow. */
  operationRouteQuote?: {
    price: number;
    observedAt: string;
  };
}

export interface DecisionInputReason {
  code:
    | 'CHAINLINK_UNAVAILABLE'
    | 'CHAINLINK_STALE'
    | 'MARKET_REFERENCE_UNAVAILABLE'
    | 'MARKET_REFERENCE_LOW_COVERAGE'
    | 'MARKET_REFERENCE_SPREAD_UNAVAILABLE'
    | 'MARKET_REFERENCE_DIVERGENCE'
    | 'MARKET_REFERENCE_SPREAD'
    | 'CHAINLINK_DIVERGENCE'
    | 'DEX_DEPTH_UNAVAILABLE'
    | 'QUOTE_TIMESTAMP_INVALID'
    | 'QUOTE_STALE'
    | 'QUOTE_SLIPPAGE';
  severity: 'block' | 'insufficient_evidence';
  message: string;
}

export interface DecisionInputAssessment {
  schemaVersion: 1;
  /**
   * This input-level assessment is separate from the existing oracle safety
   * verdict and never authorizes or submits a transaction.
   */
  status: 'SUFFICIENT' | 'BLOCK' | 'INSUFFICIENT_EVIDENCE';
  eligibleToProceed: boolean;
  asset: string;
  chainId: number;
  action: 'swap' | 'borrow' | 'lend' | 'liquidate' | 'repay';
  tradeAmountUsd: number;
  evaluatedAt: string;
  /** Caller-supplied route quote; the MCP execution gate checks it against the oracle cross-rate. */
  operationRouteQuote: DecisionInputCheckRequest['operationRouteQuote'] | null;
  policy: Pick<
    DecisionInputCheckRequest,
    'maxReferenceDeviationBps' | 'maxSlippageBps' | 'maxQuoteAgeSeconds'
  >;
  prices: {
    decisionPriceUsd: number;
    quotePriceUsd: number;
    quoteObservedAt: string;
    quoteAgeSeconds: number | null;
    quoteDeviationBps: number | null;
    chainlinkPriceUsd: number | null;
    chainlinkDeviationBps: number | null;
    cexMedianPriceUsd: number | null;
    cexDeviationBps: number | null;
    cexSpreadBps: number | null;
  };
  evidence: {
    chainlink: {
      provider: 'chainlink-data-feed';
      updatedAt: string;
      ageSeconds: number;
      heartbeatSeconds: number;
      feedAddress: `0x${string}`;
      roundId: string;
    } | null;
    cex: {
      refHour: string;
      exchangeCount: number;
      crossExchangeSpreadPct: number | null;
      medianBidAskSpreadPct: number | null;
    } | null;
    dexManipulationCost: {
      referenceChain: 'ethereum';
      poolCount: number;
      freshestSnapshotTs: string | null;
      cheapestMove1PctUsd: number | null;
      tradeSizeTo1PctManipulationCostRatio: number | null;
    } | null;
  };
  reasons: DecisionInputReason[];
  caveats: string[];
}

export interface AssessDecisionInputOptions {
  asset: string;
  chainId: number;
  action: DecisionInputAssessment['action'];
  tradeAmountUsd: number;
  request: DecisionInputCheckRequest;
  chainlink: ChainlinkMarketReference | null;
  cex: MarketReference | null;
  dex: ManipCostAdvisory | null;
  now?: Date;
}

function deviationBps(input: number, reference: number): number | null {
  if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }
  return (Math.abs(input - reference) / reference) * 10_000;
}

function addReason(
  reasons: DecisionInputReason[],
  code: DecisionInputReason['code'],
  severity: DecisionInputReason['severity'],
  message: string
): void {
  reasons.push({ code, severity, message });
}

/** Pure policy/evidence combiner. Missing, stale, or malformed evidence never becomes a pass. */
type ChainlinkEvidence = NonNullable<DecisionInputAssessment['evidence']['chainlink']>;
type CexEvidence = NonNullable<DecisionInputAssessment['evidence']['cex']>;
type DexEvidence = NonNullable<DecisionInputAssessment['evidence']['dexManipulationCost']>;

interface QuoteChecks {
  ageSeconds: number | null;
  deviationBps: number | null;
}

interface ChainlinkChecks {
  priceUsd: number | null;
  deviationBps: number | null;
  evidence: ChainlinkEvidence | null;
}

interface CexChecks {
  priceUsd: number | null;
  deviationBps: number | null;
  spreadBps: number | null;
  evidence: CexEvidence | null;
}

interface DexChecks {
  evidence: DexEvidence | null;
}

function assessQuote(
  request: DecisionInputCheckRequest,
  nowMs: number,
  reasons: DecisionInputReason[]
): QuoteChecks {
  const timestampFormatValid = DecisionInputQuoteTimestampSchema.safeParse(
    request.quoteObservedAt
  ).success;
  const observedMs = timestampFormatValid ? Date.parse(request.quoteObservedAt) : Number.NaN;
  const ageSeconds = Number.isFinite(observedMs) ? (nowMs - observedMs) / 1000 : null;
  if (ageSeconds === null || ageSeconds < 0) {
    addReason(
      reasons,
      'QUOTE_TIMESTAMP_INVALID',
      'insufficient_evidence',
      'The venue quote timestamp is invalid or is in the future.'
    );
  } else if (ageSeconds > request.maxQuoteAgeSeconds) {
    addReason(
      reasons,
      'QUOTE_STALE',
      'insufficient_evidence',
      `The venue quote is ${ageSeconds.toFixed(1)} seconds old; the limit is ${request.maxQuoteAgeSeconds} seconds.`
    );
  }

  const quoteDiffBps = deviationBps(request.quotePriceUsd, request.decisionPriceUsd);
  if (quoteDiffBps !== null && quoteDiffBps > request.maxSlippageBps) {
    addReason(
      reasons,
      'QUOTE_SLIPPAGE',
      'block',
      `The venue quote differs from the decision price by ${quoteDiffBps.toFixed(1)} bps; the limit is ${request.maxSlippageBps} bps.`
    );
  }
  return {
    ageSeconds: ageSeconds !== null && ageSeconds >= 0 ? ageSeconds : null,
    deviationBps: quoteDiffBps,
  };
}

function assessChainlink(
  asset: string,
  chainId: number,
  request: DecisionInputCheckRequest,
  chainlink: ChainlinkMarketReference | null,
  reasons: DecisionInputReason[]
): ChainlinkChecks {
  const referenceSymbol = asset === 'WETH' ? 'ETH' : asset;
  const usable =
    chainlink !== null &&
    chainlink.symbol === referenceSymbol &&
    chainlink.chainId === chainId &&
    Number.isFinite(chainlink.price) &&
    chainlink.price > 0;
  let diffBps: number | null = null;
  if (!usable) {
    addReason(
      reasons,
      'CHAINLINK_UNAVAILABLE',
      'insufficient_evidence',
      `No usable Chainlink ${asset}/USD observation is available on chain ${chainId}.`
    );
  } else if (!chainlink.isFresh) {
    addReason(
      reasons,
      'CHAINLINK_STALE',
      'insufficient_evidence',
      `The Chainlink observation is ${chainlink.ageSeconds} seconds old, beyond its ${chainlink.heartbeatSeconds}-second heartbeat.`
    );
  } else {
    diffBps = deviationBps(request.decisionPriceUsd, chainlink.price);
    if (diffBps !== null && diffBps > request.maxReferenceDeviationBps) {
      addReason(
        reasons,
        'CHAINLINK_DIVERGENCE',
        'block',
        `The decision price differs from Chainlink by ${diffBps.toFixed(1)} bps; the limit is ${request.maxReferenceDeviationBps} bps.`
      );
    }
  }

  return {
    priceUsd: usable && chainlink ? chainlink.price : null,
    deviationBps: diffBps,
    evidence:
      usable && chainlink
        ? {
            provider: chainlink.provider,
            updatedAt: chainlink.updatedAt,
            ageSeconds: chainlink.ageSeconds,
            heartbeatSeconds: chainlink.heartbeatSeconds,
            feedAddress: chainlink.feedAddress,
            roundId: chainlink.roundId,
          }
        : null,
  };
}

function assessCex(
  request: DecisionInputCheckRequest,
  cex: MarketReference | null,
  nowMs: number,
  reasons: DecisionInputReason[]
): CexChecks {
  const ageMs = cex ? nowMs - Date.parse(cex.refHour) : Number.NaN;
  const fresh =
    cex !== null && Number.isFinite(ageMs) && ageMs >= 0 && ageMs < MAX_REF_AGE_HOURS * 60 * 60_000;
  const spreadBps =
    cex?.crossExchangeSpreadPct !== null && cex?.crossExchangeSpreadPct !== undefined
      ? cex.crossExchangeSpreadPct * 100
      : null;
  let diffBps: number | null = null;
  if (!fresh || !cex) {
    addReason(
      reasons,
      'MARKET_REFERENCE_UNAVAILABLE',
      'insufficient_evidence',
      'No fresh centralized-exchange reference price is available.'
    );
  } else if (cex.exchangeCount < 2) {
    addReason(
      reasons,
      'MARKET_REFERENCE_LOW_COVERAGE',
      'insufficient_evidence',
      `The CEX reference has only ${cex.exchangeCount} exchange observation(s); at least two are required.`
    );
  } else if (spreadBps === null) {
    addReason(
      reasons,
      'MARKET_REFERENCE_SPREAD_UNAVAILABLE',
      'insufficient_evidence',
      'The CEX reference does not include a cross-exchange spread measurement.'
    );
  } else {
    diffBps = deviationBps(request.decisionPriceUsd, cex.refPrice);
    if (diffBps !== null && diffBps > request.maxReferenceDeviationBps) {
      addReason(
        reasons,
        'MARKET_REFERENCE_DIVERGENCE',
        'block',
        `The decision price differs from the CEX median by ${diffBps.toFixed(1)} bps; the limit is ${request.maxReferenceDeviationBps} bps.`
      );
    }
    if (spreadBps > request.maxReferenceDeviationBps) {
      addReason(
        reasons,
        'MARKET_REFERENCE_SPREAD',
        'block',
        `The CEX cross-exchange spread is ${spreadBps.toFixed(1)} bps; the reference-quality limit is ${request.maxReferenceDeviationBps} bps.`
      );
    }
  }

  return {
    priceUsd: fresh && cex ? cex.refPrice : null,
    deviationBps: diffBps,
    spreadBps,
    evidence:
      fresh && cex
        ? {
            refHour: cex.refHour,
            exchangeCount: cex.exchangeCount,
            crossExchangeSpreadPct: cex.crossExchangeSpreadPct,
            medianBidAskSpreadPct: cex.medianBidAskSpreadPct,
          }
        : null,
  };
}

function assessDex(
  asset: string,
  chainId: number,
  tradeAmountUsd: number,
  dex: ManipCostAdvisory | null,
  nowMs: number,
  reasons: DecisionInputReason[]
): DexChecks {
  const snapshotMs = dex?.freshestSnapshotTs ? Date.parse(dex.freshestSnapshotTs) : Number.NaN;
  const symbolMatches =
    dex !== null && (dex.symbol === asset || (asset === 'WETH' && dex.symbol === 'ETH'));
  const usable =
    dex !== null &&
    chainId === 1 &&
    dex.referenceChain === 'ethereum' &&
    symbolMatches &&
    dex.pools.length > 0 &&
    Number.isFinite(snapshotMs) &&
    nowMs - snapshotMs >= 0 &&
    nowMs - snapshotMs <= MANIP_COST_MAX_AGE_MS &&
    typeof dex.cheapestMove1PctUsd === 'number' &&
    Number.isFinite(dex.cheapestMove1PctUsd) &&
    dex.cheapestMove1PctUsd > 0;
  if (!usable || !dex || typeof dex.cheapestMove1PctUsd !== 'number') {
    addReason(
      reasons,
      'DEX_DEPTH_UNAVAILABLE',
      'insufficient_evidence',
      `No fresh Ethereum DEX manipulation-cost evidence is available for ${asset}; this v1 evidence map covers ETH, USDC, and WBTC on Ethereum mainnet.`
    );
    return { evidence: null };
  }

  return {
    evidence: {
      referenceChain: dex.referenceChain,
      poolCount: dex.pools.length,
      freshestSnapshotTs: dex.freshestSnapshotTs,
      cheapestMove1PctUsd: dex.cheapestMove1PctUsd,
      tradeSizeTo1PctManipulationCostRatio: tradeAmountUsd / dex.cheapestMove1PctUsd,
    },
  };
}

export function assessDecisionInput(options: AssessDecisionInputOptions): DecisionInputAssessment {
  const { asset, chainId, action, tradeAmountUsd, request, chainlink, cex, dex } = options;
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const normalizedAsset = asset.trim().toUpperCase();
  const reasons: DecisionInputReason[] = [];
  const quote = assessQuote(request, nowMs, reasons);
  const oracle = assessChainlink(normalizedAsset, chainId, request, chainlink, reasons);
  const market = assessCex(request, cex, nowMs, reasons);
  const depth = assessDex(normalizedAsset, chainId, tradeAmountUsd, dex, nowMs, reasons);
  const hasBlock = reasons.some((reason) => reason.severity === 'block');
  const hasMissingEvidence = reasons.some((reason) => reason.severity === 'insufficient_evidence');
  const status = hasBlock ? 'BLOCK' : hasMissingEvidence ? 'INSUFFICIENT_EVIDENCE' : 'SUFFICIENT';

  return {
    schemaVersion: 1,
    status,
    eligibleToProceed: status === 'SUFFICIENT',
    asset: normalizedAsset,
    chainId,
    action,
    tradeAmountUsd,
    evaluatedAt: now.toISOString(),
    operationRouteQuote: request.operationRouteQuote ?? null,
    policy: {
      maxReferenceDeviationBps: request.maxReferenceDeviationBps,
      maxSlippageBps: request.maxSlippageBps,
      maxQuoteAgeSeconds: request.maxQuoteAgeSeconds,
    },
    prices: {
      decisionPriceUsd: request.decisionPriceUsd,
      quotePriceUsd: request.quotePriceUsd,
      quoteObservedAt: request.quoteObservedAt,
      quoteAgeSeconds: quote.ageSeconds,
      quoteDeviationBps: quote.deviationBps,
      chainlinkPriceUsd: oracle.priceUsd,
      chainlinkDeviationBps: oracle.deviationBps,
      cexMedianPriceUsd: market.priceUsd,
      cexDeviationBps: market.deviationBps,
      cexSpreadBps: market.spreadBps,
    },
    evidence: {
      chainlink: oracle.evidence,
      cex: market.evidence,
      dexManipulationCost: depth.evidence,
    },
    reasons,
    caveats: [
      'This checks the supplied price, venue quote, freshness, source agreement, and available DEX depth evidence. It does not by itself authorize or submit a transaction.',
      'This assessment is not included in the EIP-712 oracle safety attestation.',
      'The venue quote, operation route quote, and their timestamps are caller-supplied and are not independently fetched or cryptographically verified by Insight.',
      'DEX manipulation cost is a pool-depth proxy, not a route-specific quote, price-impact estimate, or guarantee that the pool can execute this trade.',
    ],
  };
}
