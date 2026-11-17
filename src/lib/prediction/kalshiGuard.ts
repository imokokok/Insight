import { z } from 'zod';

import {
  fetchKalshiMarketSnapshot,
  KALSHI_GUARD_PROTOCOL_ID,
  KALSHI_GUARD_SCHEMA_VERSION,
  type KalshiOrderbook,
  type KalshiMarket,
  type KalshiMarketFetcher,
} from './kalshi';

export type KalshiGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const KalshiGuardInputSchema = z.object({
  protocolId: z.literal(KALSHI_GUARD_PROTOCOL_ID),
  action: z.enum(['buy_yes', 'buy_no']),
  marketTicker: z.string().trim().min(1).max(256),
});
export type KalshiGuardInput = z.infer<typeof KalshiGuardInputSchema>;

export type KalshiGuardCheck = {
  id: string;
  status: 'pass' | 'caution' | 'block';
  detail: string;
};

export type KalshiGuardResult = {
  schema: typeof KALSHI_GUARD_SCHEMA_VERSION;
  verdict: KalshiGuardVerdict;
  protocolId: typeof KALSHI_GUARD_PROTOCOL_ID;
  action: KalshiGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'kalshi';
    network: 'kalshi-mainnet';
    transactionAuthority: 'none';
    valuation: 'venue_quoted_probability';
    settlement: 'official_api_declared';
  };
  market: {
    ticker: string;
    eventTicker: string | null;
    seriesTicker: string | null;
    marketType: 'binary' | 'scalar' | null;
    title: string | null;
    subtitle: string | null;
    status: string | null;
    closeTime: string | null;
    expirationTime: string | null;
    result: 'yes' | 'no' | null;
    rulesPresent: boolean;
    settlementSources: KalshiMarket['settlementSources'];
  };
  quotes: {
    yesBid: number | null;
    yesAsk: number | null;
    noBid: number | null;
    noAsk: number | null;
    yesProbability: number | null;
    noProbability: number | null;
    chosenSidePrice: number | null;
    lastPrice: number | null;
    volume: number | null;
    volume24h: number | null;
    openInterest: number | null;
    liquidity: number | null;
    orderbook: KalshiOrderbook | null;
  };
  fees: KalshiMarket['feeMetadata'];
  timing: {
    evaluatedAtMs: number;
    secondsToClose: number | null;
  };
  checks: KalshiGuardCheck[];
  reasons: string[];
  metadataWarnings: string[];
  disclosure: {
    oracleConsensus: 'not_applicable_to_event_markets';
    settlementEvidence: 'official_api_declared_not_independently_recomputable';
    execution: 'not_performed';
  };
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
};

export type KalshiGuardDependencies = {
  fetchMarket?: KalshiMarketFetcher;
  now?: () => Date;
};

const IMMINENT_CLOSE_SECONDS = 60;
const LATE_CLOSE_SECONDS = 5 * 60;
const PROBABILITY_SUM_TOLERANCE = 0.1;
const EXTREME_PROBABILITY = 0.95;

function midpoint(bid: number | null, ask: number | null): number | null {
  if (bid !== null && ask !== null) return (bid + ask) / 2;
  return bid ?? ask;
}

function validProbability(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 1);
}

function emptyMarket(ticker: string): KalshiGuardResult['market'] {
  return {
    ticker,
    eventTicker: null,
    seriesTicker: null,
    marketType: null,
    title: null,
    subtitle: null,
    status: null,
    closeTime: null,
    expirationTime: null,
    result: null,
    rulesPresent: false,
    settlementSources: [],
  };
}

function emptyQuotes(): KalshiGuardResult['quotes'] {
  return {
    yesBid: null,
    yesAsk: null,
    noBid: null,
    noAsk: null,
    yesProbability: null,
    noProbability: null,
    chosenSidePrice: null,
    lastPrice: null,
    volume: null,
    volume24h: null,
    openInterest: null,
    liquidity: null,
    orderbook: null,
  };
}

function result(
  input: KalshiGuardInput,
  nowMs: number,
  parts: Pick<
    KalshiGuardResult,
    'market' | 'quotes' | 'fees' | 'timing' | 'checks' | 'reasons' | 'metadataWarnings' | 'verdict'
  >
): KalshiGuardResult {
  return {
    schema: KALSHI_GUARD_SCHEMA_VERSION,
    verdict: parts.verdict,
    protocolId: KALSHI_GUARD_PROTOCOL_ID,
    action: input.action,
    evaluatedAt: new Date(nowMs).toISOString(),
    scope: {
      venue: 'kalshi',
      network: 'kalshi-mainnet',
      transactionAuthority: 'none',
      valuation: 'venue_quoted_probability',
      settlement: 'official_api_declared',
    },
    market: parts.market,
    quotes: parts.quotes,
    fees: parts.fees,
    timing: parts.timing,
    checks: parts.checks,
    reasons: parts.reasons,
    metadataWarnings: parts.metadataWarnings,
    disclosure: {
      oracleConsensus: 'not_applicable_to_event_markets',
      settlementEvidence: 'official_api_declared_not_independently_recomputable',
      execution: 'not_performed',
    },
    next: {
      execution: 'not_performed',
      priorSeal:
        'PriorSeal is not invoked by this read-only assessment. A future Kalshi execution profile must bind the signed off-chain order and observe fills separately.',
    },
  };
}

export async function assessKalshiGuard(
  rawInput: KalshiGuardInput,
  dependencies: KalshiGuardDependencies = {}
): Promise<KalshiGuardResult> {
  const input = KalshiGuardInputSchema.parse(rawInput);
  const nowMs = (dependencies.now ?? (() => new Date()))().getTime();
  const fetchMarket = dependencies.fetchMarket ?? ((ticker) => fetchKalshiMarketSnapshot(ticker));
  const checks: KalshiGuardCheck[] = [];
  const reasons: string[] = [];
  let verdict: KalshiGuardVerdict = 'ALLOW';
  const fees: KalshiMarket['feeMetadata'] = {
    feeType: null,
    feeMultiplier: null,
    makerFee: null,
  };

  const escalate = (status: 'caution' | 'block') => {
    if (status === 'block') verdict = 'BLOCK';
    else if (verdict !== 'BLOCK') verdict = 'CAUTION';
  };

  let market: KalshiMarket | null = null;
  let fetchFailureReason: string | null = null;
  try {
    market = await fetchMarket(input.marketTicker);
  } catch (error) {
    fetchFailureReason = error instanceof Error ? error.message : String(error);
  }

  if (market === null) {
    escalate('block');
    checks.push({
      id: 'market-fetch',
      status: 'block',
      detail:
        fetchFailureReason === null
          ? 'Kalshi market lookup resolved no market (fail closed)'
          : `Kalshi metadata unavailable (fail closed): ${fetchFailureReason}`,
    });
    reasons.push('assessment input unavailable');
    return result(input, nowMs, {
      verdict,
      market: emptyMarket(input.marketTicker),
      quotes: emptyQuotes(),
      fees,
      timing: { evaluatedAtMs: nowMs, secondsToClose: null },
      checks,
      reasons,
      metadataWarnings: [],
    });
  }

  checks.push({ id: 'market-fetch', status: 'pass', detail: 'Kalshi market metadata retrieved' });
  fees.feeType = market.feeMetadata.feeType;
  fees.feeMultiplier = market.feeMetadata.feeMultiplier;
  fees.makerFee = market.feeMetadata.makerFee;

  if (market.metadataWarnings.length > 0) {
    checks.push({
      id: 'metadata-completeness',
      status: 'caution',
      detail: market.metadataWarnings.join('; '),
    });
    reasons.push('supplemental market metadata is incomplete');
    verdict = 'CAUTION';
  } else {
    checks.push({
      id: 'metadata-completeness',
      status: 'pass',
      detail: 'market, orderbook and series metadata are available',
    });
  }

  if (market.feeMetadata.feeType !== null && market.feeMetadata.feeMultiplier !== null) {
    checks.push({
      id: 'fee-metadata',
      status: 'pass',
      detail: `series fee schedule is ${market.feeMetadata.feeType} (multiplier ${market.feeMetadata.feeMultiplier})`,
    });
  } else {
    escalate('caution');
    checks.push({
      id: 'fee-metadata',
      status: 'caution',
      detail: 'series fee schedule is unavailable',
    });
    reasons.push('fee schedule unavailable');
  }

  if (market.status === 'active') {
    checks.push({ id: 'lifecycle', status: 'pass', detail: 'market is active' });
  } else if (
    ['closed', 'determined', 'disputed', 'amended', 'finalized', 'settled'].includes(market.status)
  ) {
    escalate('block');
    checks.push({ id: 'lifecycle', status: 'block', detail: `market is ${market.status}` });
    reasons.push(`market ${market.status}`);
  } else {
    escalate('caution');
    checks.push({
      id: 'lifecycle',
      status: 'caution',
      detail: `market status is ${market.status}`,
    });
    reasons.push('market lifecycle state is not a reviewed open state');
  }

  if (market.marketType === 'scalar') {
    escalate('block');
    checks.push({
      id: 'market-type',
      status: 'block',
      detail: 'scalar market is outside the binary Yes/No guard scope',
    });
    reasons.push('scalar market is outside binary guard scope');
  } else if (market.marketType === 'binary') {
    checks.push({ id: 'market-type', status: 'pass', detail: 'market is binary' });
  } else {
    escalate('caution');
    checks.push({ id: 'market-type', status: 'caution', detail: 'market type is unavailable' });
    reasons.push('market type unknown');
  }

  const closeMs = market.closeTime ? Date.parse(market.closeTime) : NaN;
  const secondsToClose = Number.isFinite(closeMs) ? Math.round((closeMs - nowMs) / 1000) : null;
  if (secondsToClose === null) {
    escalate('caution');
    checks.push({ id: 'close-timing', status: 'caution', detail: 'close time unavailable' });
    reasons.push('close timing unknown');
  } else if (secondsToClose <= 0) {
    escalate('block');
    checks.push({ id: 'close-timing', status: 'block', detail: 'market close time has passed' });
    reasons.push('market close time passed');
  } else if (secondsToClose < IMMINENT_CLOSE_SECONDS) {
    escalate('block');
    checks.push({ id: 'close-timing', status: 'block', detail: `${secondsToClose}s to close` });
    reasons.push('imminent market close');
  } else if (secondsToClose < LATE_CLOSE_SECONDS) {
    escalate('caution');
    checks.push({ id: 'close-timing', status: 'caution', detail: `${secondsToClose}s to close` });
    reasons.push('late entry near market close');
  } else {
    checks.push({ id: 'close-timing', status: 'pass', detail: `${secondsToClose}s to close` });
  }

  const yesProbability = midpoint(market.yesBid, market.yesAsk);
  const noProbability = midpoint(market.noBid, market.noAsk);
  const chosenSidePrice =
    input.action === 'buy_yes'
      ? (market.yesAsk ?? yesProbability)
      : (market.noAsk ?? noProbability);
  const quotes: KalshiGuardResult['quotes'] = {
    yesBid: market.yesBid,
    yesAsk: market.yesAsk,
    noBid: market.noBid,
    noAsk: market.noAsk,
    yesProbability,
    noProbability,
    chosenSidePrice,
    lastPrice: market.lastPrice,
    volume: market.volume,
    volume24h: market.volume24h,
    openInterest: market.openInterest,
    liquidity: market.liquidity,
    orderbook: market.orderbook,
  };

  const quoteValues = [market.yesBid, market.yesAsk, market.noBid, market.noAsk].filter(
    (value): value is number => value !== null
  );
  if (quoteValues.some((value) => !validProbability(value))) {
    escalate('caution');
    checks.push({
      id: 'quote-integrity',
      status: 'caution',
      detail: 'one or more quoted prices are outside 0..1',
    });
    reasons.push('venue quote outside probability range');
  } else if (yesProbability === null || noProbability === null) {
    escalate('caution');
    checks.push({
      id: 'quote-integrity',
      status: 'caution',
      detail: 'one or both binary sides are unquoted',
    });
    reasons.push('venue probability incomplete');
  } else if (Math.abs(yesProbability + noProbability - 1) > PROBABILITY_SUM_TOLERANCE) {
    escalate('caution');
    checks.push({
      id: 'quote-integrity',
      status: 'caution',
      detail: `Yes/No midpoint probabilities sum to ${(yesProbability + noProbability).toFixed(4)}`,
    });
    reasons.push('venue quote fails binary-consistency check');
  } else {
    checks.push({
      id: 'quote-integrity',
      status: 'pass',
      detail: 'Yes/No midpoint probabilities are binary-consistent',
    });
  }

  if (chosenSidePrice === null) {
    escalate('caution');
    checks.push({
      id: 'chosen-side-price',
      status: 'caution',
      detail: 'chosen side ask is unavailable',
    });
    reasons.push('chosen side price unavailable');
  } else if (chosenSidePrice >= EXTREME_PROBABILITY || chosenSidePrice <= 1 - EXTREME_PROBABILITY) {
    escalate('caution');
    checks.push({
      id: 'chosen-side-price',
      status: 'caution',
      detail: `chosen side quoted at ${chosenSidePrice}`,
    });
    reasons.push('chosen side priced near certainty or as a long shot');
  } else {
    checks.push({
      id: 'chosen-side-price',
      status: 'pass',
      detail: `chosen side ask is ${chosenSidePrice}`,
    });
  }

  if (market.rulesPrimary || market.rulesSecondary) {
    checks.push({
      id: 'settlement-rules',
      status: 'pass',
      detail: 'official settlement rules are present',
    });
  } else {
    escalate('caution');
    checks.push({
      id: 'settlement-rules',
      status: 'caution',
      detail: 'official settlement rules are missing',
    });
    reasons.push('settlement rules unavailable');
  }

  if (market.settlementSources.length > 0) {
    checks.push({
      id: 'settlement-sources',
      status: 'pass',
      detail: `${market.settlementSources.length} official settlement source(s) disclosed`,
    });
  } else {
    escalate('caution');
    checks.push({
      id: 'settlement-sources',
      status: 'caution',
      detail: 'series settlement sources are unavailable',
    });
    reasons.push('settlement sources unavailable');
  }

  if (market.orderbook !== null) {
    checks.push({
      id: 'orderbook',
      status: 'pass',
      detail: `orderbook depth available (${market.orderbook.yesBids.length} Yes / ${market.orderbook.noBids.length} No levels)`,
    });
  } else {
    escalate('caution');
    checks.push({ id: 'orderbook', status: 'caution', detail: 'orderbook is unavailable' });
    reasons.push('orderbook unavailable');
  }

  // Kalshi is intentionally represented as declared official-API evidence.
  // There is no on-chain artifact from which a reviewer can independently
  // recompute the settlement.
  escalate('caution');
  checks.push({
    id: 'settlement-verifiability',
    status: 'caution',
    detail:
      'settlement is available from Kalshi official API only; no independent on-chain proof exists',
  });
  reasons.push('off-chain settlement is not independently recomputable');

  return result(input, nowMs, {
    verdict,
    market: {
      ticker: market.ticker,
      eventTicker: market.eventTicker,
      seriesTicker: market.seriesTicker,
      marketType: market.marketType,
      title: market.title,
      subtitle: market.subtitle,
      status: market.status,
      closeTime: market.closeTime,
      expirationTime: market.expirationTime,
      result: market.result,
      rulesPresent: Boolean(market.rulesPrimary || market.rulesSecondary),
      settlementSources: market.settlementSources,
    },
    quotes,
    fees,
    timing: { evaluatedAtMs: nowMs, secondsToClose },
    checks,
    reasons,
    metadataWarnings: market.metadataWarnings,
  });
}
