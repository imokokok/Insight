/**
 * @fileoverview Base perpetual order-envelope adapter (Synthetix Perps V3).
 *
 * prepare_perp_order previously covered only Hyperliquid. This adapter turns a
 * caller decision (market, side, quantity, leverage, slippage, price type) into
 * one unsigned direct `commitOrder` call on the canonical Base PerpsMarketProxy,
 * reusing the existing `assessBasePerpGuard` verdict rather than duplicating any
 * risk rule.
 *
 * Insight never creates a nonce, signature, or broadcast. The returned envelope
 * is the exact call the caller must sign and the guard verdict is carried as a
 * referenced fingerprint (`risk.assessmentHash`).
 *
 * Honest boundaries: the reference quote is the reviewed cross-oracle
 * consensus, not Synthetix's own mark price; the adapter does not simulate
 * margin state, funding, or settlement. `acceptablePrice` is the caller's
 * worst acceptable fill derived from the quote plus slippage.
 */

import { encodeFunctionData } from 'viem';
import { z } from 'zod';

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import type { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';

import {
  BASE_CHAIN_ID,
  COMMIT_ORDER_ABI,
  decodeBasePerpExactCall,
  PERPS_MARKET_PROXY,
  REVIEWED_PERPS_MARKET_IDS,
} from './basePerpAction';
import {
  assessBasePerpGuard,
  SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID,
  type BasePerpGuardInput,
  type BasePerpGuardResult,
} from './basePerpGuard';
import {
  PERP_ORDER_DEFAULT_QUOTE_VALIDITY_SECONDS,
  PERP_ORDER_MAX_QUOTE_VALIDITY_SECONDS,
  PERP_ORDER_MIN_QUOTE_VALIDITY_SECONDS,
  PERP_ORDER_DEFAULT_QUERY_TIMEOUT_MS,
  PerpOrderSideSchema,
  PerpOrderSlippageSchema,
  PerpOrderTypeSchema,
  PerpOrderAdapterError,
  buildPerpOrderRiskReference,
  canonicalDecimalText,
  decimalToUnits18,
  fetchChainHeadBlockNumber,
  parsePerpOrderInput,
  perpOrderIntentHash,
  priceToUnits18,
  resolveSlippageBoundedPrice,
  runPerpOrderQuery,
  type PerpOrderObservation,
  type PerpOrderQuoteTerms,
  type PerpOrderRiskReference,
  type PerpOrderVerdict,
} from './perpOrderEnvelope';

export const BASE_PERP_ORDER_SCHEMA = 'insight.base-perp-order-envelope.v1' as const;
export const BASE_PERP_ORDER_CHAIN = 'eip155:8453' as const;

const ZERO_BYTES32 = `0x${'00'.repeat(32)}` as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const BasePerpOrderEnvelopeInputSchema = z
  .object({
    chain: z.literal(BASE_PERP_ORDER_CHAIN),
    /** Reviewed Synthetix market asset symbol (BTC, ETH, SOL, XRP, DOGE, PEPE). */
    market: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    side: PerpOrderSideSchema,
    /** Exact base-asset quantity as a decimal string (never exponent notation). */
    quantity: z.string(),
    /** Caller-declared post-action leverage; the guard owns the reviewed cap. */
    leverage: z.number().finite().positive().max(100),
    maxSlippageBps: PerpOrderSlippageSchema,
    orderType: PerpOrderTypeSchema.optional().default('market'),
    /** Required for limit orders and absent for market orders. */
    limitPrice: z.string().optional(),
    /** Synthetix account id (account NFT id) owned by `accountOwner`. */
    accountId: z.union([z.string().regex(/^[1-9][0-9]*$/), z.number().int().positive().safe()]),
    /** The signer that owns the Synthetix account and will sign the envelope. */
    accountOwner: z.string().regex(ADDRESS),
    /** Reviewed Pyth settlement strategy. */
    settlementStrategyId: z.literal(0).optional().default(0),
    validForSeconds: z
      .number()
      .int()
      .min(PERP_ORDER_MIN_QUOTE_VALIDITY_SECONDS)
      .max(PERP_ORDER_MAX_QUOTE_VALIDITY_SECONDS)
      .optional()
      .default(PERP_ORDER_DEFAULT_QUOTE_VALIDITY_SECONDS),
  })
  .strict();

export type BasePerpOrderEnvelopeRequest = z.input<typeof BasePerpOrderEnvelopeInputSchema>;

export interface BasePerpQuoteObservation {
  referencePriceUsd: number;
  observedAt: string;
  sourceFreshnessSeconds: number | null;
  participantCount: number | null;
}

export interface BasePerpOrderEnvelopeDependencies {
  /** Read-only reference quote. Defaults to Insight cross-oracle consensus. */
  fetchQuote?: (
    assetSymbol: string,
    options: { signal: AbortSignal }
  ) => Promise<BasePerpQuoteObservation>;
  /** Chain head observed while preparing the envelope. */
  getBlockNumber?: (options: { signal: AbortSignal }) => Promise<number>;
  /** Injected for tests; defaults to the reviewed Base perp guard. */
  assessGuard?: typeof assessBasePerpGuard;
  /** Oracle dependency forwarded to the guard. */
  checkOracle?: typeof preTradeSafetyCheck;
  now?: () => Date;
  queryTimeoutMs?: number;
}

export interface BasePerpOrderEnvelope {
  schema: typeof BASE_PERP_ORDER_SCHEMA;
  verdict: PerpOrderVerdict;
  intentHash: `0x${string}`;
  observedAt: string;
  chain: { caip2: typeof BASE_PERP_ORDER_CHAIN; chainId: typeof BASE_CHAIN_ID };
  market: {
    assetSymbol: string;
    marketId: string;
    marginAssetSymbol: 'USDC';
    settlementStrategyId: number;
    parameterSource: 'reviewed-profile';
  };
  quote: PerpOrderQuoteTerms;
  observation: PerpOrderObservation;
  requestedOrder: {
    side: 'long' | 'short';
    orderType: 'market' | 'limit';
    quantity: string;
    leverage: number;
    sizeDelta: string;
    notionalUsd: number;
    marginValueUsd: number;
    limitPrice: number | null;
  };
  policy: { maxSlippageBps: number; validForSeconds: number };
  risk: PerpOrderRiskReference;
  blockingReasons: string[];
  /** The exact unsigned call; null whenever the envelope is blocked. */
  unsignedTransaction: {
    chainId: typeof BASE_CHAIN_ID;
    from: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: '0';
    /** The signer chooses the nonce immediately before signing. */
    nonce: null;
  } | null;
  exactCall: {
    marketId: string;
    accountId: string;
    sizeDelta: string;
    acceptablePrice: string;
    calldataHash: `0x${string}`;
  } | null;
  caveats: string[];
}

const REVIEWED_MARKET_IDS = REVIEWED_PERPS_MARKET_IDS as Record<string, number>;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

async function defaultBaseQuote(
  assetSymbol: string,
  options: { signal: AbortSignal }
): Promise<BasePerpQuoteObservation> {
  const consensus = await getConsensusPrice(assetSymbol, 'base', undefined, undefined, {
    signal: options.signal,
  });
  if (!Number.isFinite(consensus.consensusPrice) || consensus.consensusPrice <= 0) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      `Cross-oracle consensus returned no usable price for ${assetSymbol}`
    );
  }
  const observedAtMs = Date.now();
  const providerTimestamps = consensus.providers
    .map((provider) => provider.timestamp)
    .filter((value) => Number.isFinite(value));
  const freshestProviderMs = providerTimestamps.length > 0 ? Math.max(...providerTimestamps) : null;
  return {
    referencePriceUsd: consensus.consensusPrice,
    observedAt: new Date(observedAtMs).toISOString(),
    sourceFreshnessSeconds:
      freshestProviderMs !== null
        ? Math.max(0, Math.round((observedAtMs - freshestProviderMs) / 1000))
        : null,
    participantCount: consensus.participantCount,
  };
}

function defaultBlockNumber(options: { signal: AbortSignal }): Promise<number> {
  return fetchChainHeadBlockNumber(BASE_CHAIN_ID, options.signal);
}

/**
 * Build one reviewed, unsigned Synthetix Perps V3 Base `commitOrder` envelope.
 *
 * Failure classification:
 * - UNSUPPORTED_MARKET: the asset is outside the reviewed Synthetix market set.
 * - UPSTREAM_UNAVAILABLE: quote, chain-head, or guard assessment did not answer
 *   inside the bounded query window.
 * - SLIPPAGE_EXCEEDED: a limit price lies outside the caller's slippage cap.
 * - INVALID_INPUT: the request shape or decimal precision is unusable.
 */
export async function prepareBasePerpOrderEnvelope(
  rawRequest: BasePerpOrderEnvelopeRequest,
  dependencies: BasePerpOrderEnvelopeDependencies = {}
): Promise<BasePerpOrderEnvelope> {
  const request = parsePerpOrderInput(BasePerpOrderEnvelopeInputSchema, rawRequest);
  const assetSymbol = normalizeSymbol(request.market);
  const marketId = REVIEWED_MARKET_IDS[assetSymbol];
  if (marketId === undefined) {
    throw new PerpOrderAdapterError(
      'UNSUPPORTED_MARKET',
      `${assetSymbol} is not a reviewed Synthetix Perps V3 Base market`
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const timeoutMs = dependencies.queryTimeoutMs ?? PERP_ORDER_DEFAULT_QUERY_TIMEOUT_MS;
  const fetchQuote = dependencies.fetchQuote ?? defaultBaseQuote;
  const getBlockNumber = dependencies.getBlockNumber ?? defaultBlockNumber;
  const assessGuard = dependencies.assessGuard ?? assessBasePerpGuard;

  const quantityText = canonicalDecimalText(request.quantity, 'quantity');
  const quantityUnits = decimalToUnits18(quantityText, 'quantity');
  if (quantityUnits >= 2n ** 127n) {
    throw new PerpOrderAdapterError('INVALID_INPUT', 'quantity exceeds the int128 order range');
  }

  const controller = new AbortController();
  const signal = controller.signal;
  let quote: BasePerpQuoteObservation;
  let blockNumber: number;
  try {
    [quote, blockNumber] = await Promise.all([
      runPerpOrderQuery('Base reference quote', timeoutMs, fetchQuote(assetSymbol, { signal })),
      runPerpOrderQuery('Base chain head', timeoutMs, getBlockNumber({ signal })),
    ]);
  } catch (error) {
    controller.abort();
    throw error;
  }

  const bounded = resolveSlippageBoundedPrice({
    side: request.side,
    orderType: request.orderType,
    referencePrice: quote.referencePriceUsd,
    maxSlippageBps: request.maxSlippageBps,
    limitPrice: request.limitPrice,
    rejectionContext: {
      input_digest: perpOrderIntentHash({ schema: BASE_PERP_ORDER_SCHEMA, request: rawRequest }),
      data_sources: [
        {
          source: 'insight-cross-oracle-consensus',
          observedAt: quote.observedAt,
          sourceFreshnessSeconds: quote.sourceFreshnessSeconds,
          participantCount: quote.participantCount,
        },
      ],
      risk_ruleset_version: `${BASE_PERP_ORDER_SCHEMA}/slippage-cap`,
    },
  });
  const acceptablePrice = priceToUnits18(bounded.acceptablePrice, 'acceptablePrice');
  const sizeDelta = request.side === 'long' ? quantityUnits : -quantityUnits;

  const notionalUsd = Number(quantityText) * bounded.referencePrice;
  if (!Number.isFinite(notionalUsd) || notionalUsd <= 0 || notionalUsd > 1_000_000_000_000) {
    throw new PerpOrderAdapterError(
      'INVALID_INPUT',
      'Implied notional is outside the reviewed range'
    );
  }
  const marginValueUsd = notionalUsd / request.leverage;
  if (!Number.isFinite(marginValueUsd) || marginValueUsd <= 0) {
    throw new PerpOrderAdapterError('INVALID_INPUT', 'Implied margin is not a usable USD value');
  }

  const data = encodeFunctionData({
    abi: COMMIT_ORDER_ABI,
    functionName: 'commitOrder',
    args: [
      {
        marketId: BigInt(marketId),
        accountId: BigInt(String(request.accountId)),
        sizeDelta,
        settlementStrategyId: BigInt(request.settlementStrategyId),
        acceptablePrice,
        trackingCode: ZERO_BYTES32,
        referrer: ZERO_ADDRESS,
      },
    ],
  }) as `0x${string}`;

  // Round-trip the generated bytes through the reviewed exact-call decoder so
  // the envelope cannot drift from the surface the guard attests.
  const decoded = decodeBasePerpExactCall(
    {
      chainId: BASE_CHAIN_ID,
      from: request.accountOwner.toLowerCase() as `0x${string}`,
      to: PERPS_MARKET_PROXY,
      data,
      nonce: 0,
      value: 0,
    },
    {
      protocolId: SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID,
      action: request.side === 'long' ? 'open_long' : 'open_short',
      assetSymbol,
    }
  );

  const guardInput: BasePerpGuardInput = {
    protocolId: SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID,
    action: request.side === 'long' ? 'open_long' : 'open_short',
    assetSymbol,
    marginAssetSymbol: 'USDC',
    sizeUsd: notionalUsd,
    marginValueUsd,
  };
  const guard: BasePerpGuardResult = await runPerpOrderQuery(
    'Base perp guard',
    timeoutMs,
    assessGuard(
      guardInput,
      dependencies.checkOracle ? { checkOracle: dependencies.checkOracle } : {}
    )
  );

  const risk = buildPerpOrderRiskReference(guard);
  const blockingReasons: string[] =
    guard.verdict === 'BLOCK'
      ? [`Perp guard returned BLOCK for ${assetSymbol} ${request.side}.`, ...guard.reasons]
      : [];
  const verdict: PerpOrderVerdict = guard.verdict === 'BLOCK' ? 'BLOCK' : 'READY_TO_SIGN';
  const quoteValidUntil = Math.floor(now.getTime() / 1000) + request.validForSeconds;

  const observation: PerpOrderObservation = {
    chainId: BASE_CHAIN_ID,
    blockNumber,
    observedAt: now.toISOString(),
    sourceFreshnessSeconds: quote.sourceFreshnessSeconds,
  };
  const quoteTerms: PerpOrderQuoteTerms = {
    referencePriceUsd: bounded.referencePrice,
    acceptablePrice: acceptablePrice.toString(10),
    maxSlippageBps: request.maxSlippageBps,
    source: 'insight-cross-oracle-consensus',
    validUntil: quoteValidUntil,
  };

  const intentHash = perpOrderIntentHash({
    schema: BASE_PERP_ORDER_SCHEMA,
    chainId: BASE_CHAIN_ID,
    transaction: { from: decoded.account, to: PERPS_MARKET_PROXY, data, value: '0' },
    market: {
      assetSymbol,
      marketId: String(marketId),
      settlementStrategyId: request.settlementStrategyId,
    },
    requestedOrder: {
      side: request.side,
      orderType: bounded.orderType,
      quantity: quantityText,
      leverage: request.leverage,
      sizeDelta: sizeDelta.toString(10),
      notionalUsd,
      marginValueUsd,
    },
    quote: quoteTerms,
    observation: { blockNumber },
    risk: risk.assessmentHash,
  });

  return {
    schema: BASE_PERP_ORDER_SCHEMA,
    verdict,
    intentHash,
    observedAt: now.toISOString(),
    chain: { caip2: BASE_PERP_ORDER_CHAIN, chainId: BASE_CHAIN_ID },
    market: {
      assetSymbol,
      marketId: String(marketId),
      marginAssetSymbol: 'USDC',
      settlementStrategyId: request.settlementStrategyId,
      parameterSource: 'reviewed-profile',
    },
    quote: quoteTerms,
    observation,
    requestedOrder: {
      side: request.side,
      orderType: bounded.orderType,
      quantity: quantityText,
      leverage: request.leverage,
      sizeDelta: sizeDelta.toString(10),
      notionalUsd,
      marginValueUsd,
      limitPrice: bounded.limitPrice,
    },
    policy: { maxSlippageBps: request.maxSlippageBps, validForSeconds: request.validForSeconds },
    risk,
    blockingReasons,
    unsignedTransaction:
      verdict === 'READY_TO_SIGN'
        ? {
            chainId: BASE_CHAIN_ID,
            from: decoded.account,
            to: PERPS_MARKET_PROXY,
            data,
            value: '0',
            nonce: null,
          }
        : null,
    exactCall:
      verdict === 'READY_TO_SIGN'
        ? {
            marketId: decoded.marketId,
            accountId: decoded.accountId,
            sizeDelta: decoded.sizeDelta,
            acceptablePrice: decoded.acceptablePrice,
            calldataHash: decoded.calldataHash,
          }
        : null,
    caveats: [
      'Insight did not create a nonce, signature, or broadcast. Sign this exact call in the user-controlled wallet process.',
      'The reference price is Insight cross-oracle consensus, not the Synthetix mark price. acceptablePrice is the caller worst acceptable fill derived from that quote plus slippage.',
      'Margin must already be deposited into the declared Synthetix account; this envelope does not move collateral or simulate account health.',
      'Synthetix settlement, funding, and liquidation outcomes are outside this envelope. A BLOCK result must not be signed or submitted.',
    ],
  };
}
