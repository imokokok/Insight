/**
 * @fileoverview BNB perpetual order-envelope adapter (Aster DEX, USDT-margined).
 *
 * `src/lib/dex/asterPerpMarket.ts` already carries reviewed `eip155:56` market
 * evidence and `bnbPerpGuard.ts` already owns the Aster risk verdict, but there
 * was no order surface. This adapter produces the exact venue-native order
 * payload a user-controlled Aster client submits, bound to the existing guard
 * verdict.
 *
 * Honest boundary: Aster orders are matched off-chain by the venue REST
 * surface. The payload below is NOT EVM calldata and is NOT proof of on-chain
 * execution. It is a canonical serialization of the exact REST order the user's
 * venue client must sign/submit with their own credentials. Insight never
 * creates venue credentials, a signature, or a submission.
 */

import { z } from 'zod';

import type { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import {
  ASTER_FAPI_URL,
  asterReviewedMarketForAsset,
  fetchAsterPerpMarketState,
  type AsterPerpMarketState,
  type AsterReviewedPerpMarket,
} from '@/lib/dex/asterPerpMarket';

import {
  assessBnbPerpGuard,
  BNB_PERP_GUARD_ASTER_PROTOCOL_ID,
  type BnbPerpGuardInput,
  type BnbPerpGuardResult,
} from './bnbPerpGuard';
import {
  PERP_ORDER_DEFAULT_QUOTE_VALIDITY_SECONDS,
  PERP_ORDER_DEFAULT_QUERY_TIMEOUT_MS,
  PERP_ORDER_MAX_QUOTE_VALIDITY_SECONDS,
  PERP_ORDER_MIN_QUOTE_VALIDITY_SECONDS,
  PerpOrderAdapterError,
  PerpOrderSideSchema,
  PerpOrderSlippageSchema,
  PerpOrderTypeSchema,
  buildPerpOrderRiskReference,
  canonicalDecimalText,
  fetchChainHeadBlockNumber,
  parsePerpOrderInput,
  perpOrderIntentHash,
  priceToDecimalText,
  resolveSlippageBoundedPrice,
  runPerpOrderQuery,
  type PerpOrderObservation,
  type PerpOrderQuoteTerms,
  type PerpOrderRiskReference,
  type PerpOrderVerdict,
} from './perpOrderEnvelope';

export const BNB_PERP_ORDER_SCHEMA = 'insight.bnb-perp-order-envelope.v1' as const;
export const BNB_PERP_ORDER_CHAIN = 'eip155:56' as const;
export const BNB_PERP_ORDER_CHAIN_ID = 56 as const;
export const ASTER_ORDER_PATH = '/fapi/v1/order' as const;

export const BnbPerpOrderEnvelopeInputSchema = z
  .object({
    chain: z.literal(BNB_PERP_ORDER_CHAIN),
    /** Reviewed Aster asset symbol (BTC or ETH); the venue symbol is `${asset}USDT`. */
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
    /** Venue client order id; the caller must not reuse it. */
    clientOrderId: z.string().regex(/^[A-Za-z0-9_-]{1,36}$/),
    validForSeconds: z
      .number()
      .int()
      .min(PERP_ORDER_MIN_QUOTE_VALIDITY_SECONDS)
      .max(PERP_ORDER_MAX_QUOTE_VALIDITY_SECONDS)
      .optional()
      .default(PERP_ORDER_DEFAULT_QUOTE_VALIDITY_SECONDS),
  })
  .strict();

export type BnbPerpOrderEnvelopeRequest = z.input<typeof BnbPerpOrderEnvelopeInputSchema>;

export interface BnbPerpOrderEnvelopeDependencies {
  /** Reviewed Aster venue evidence. Defaults to the public REST market read. */
  fetchVenueState?: (market: AsterReviewedPerpMarket) => Promise<AsterPerpMarketState>;
  /** Chain head observed while preparing the envelope. */
  getBlockNumber?: (options: { signal: AbortSignal }) => Promise<number>;
  /** Injected for tests; defaults to the reviewed BNB perp guard. */
  assessGuard?: typeof assessBnbPerpGuard;
  /** Oracle dependency forwarded to the guard. */
  checkOracle?: typeof preTradeSafetyCheck;
  now?: () => Date;
  queryTimeoutMs?: number;
}

export interface BnbPerpOrderPayload {
  symbol: AsterReviewedPerpMarket;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  price?: string;
  timeInForce?: 'IOC';
  reduceOnly: false;
  newClientOrderId: string;
}

export interface BnbPerpOrderEnvelope {
  schema: typeof BNB_PERP_ORDER_SCHEMA;
  verdict: PerpOrderVerdict;
  intentHash: `0x${string}`;
  observedAt: string;
  chain: { caip2: typeof BNB_PERP_ORDER_CHAIN; chainId: typeof BNB_PERP_ORDER_CHAIN_ID };
  market: {
    assetSymbol: string;
    venueSymbol: AsterReviewedPerpMarket;
    marginAssetSymbol: 'USDT';
    maxLeverage: number;
    maxLeverageSource: BnbPerpGuardResult['market']['maxLeverageSource'];
    parameterSource: 'reviewed-profile';
  };
  quote: PerpOrderQuoteTerms;
  observation: PerpOrderObservation;
  requestedOrder: {
    side: 'long' | 'short';
    orderType: 'market' | 'limit';
    quantity: string;
    leverage: number;
    notionalUsd: number;
    marginValueUsd: number;
    limitPrice: number | null;
  };
  policy: { maxSlippageBps: number; validForSeconds: number };
  risk: PerpOrderRiskReference;
  blockingReasons: string[];
  /** The exact venue REST order; null whenever the envelope is blocked. */
  unsignedOrderEnvelope: {
    venue: 'aster';
    transport: 'venue-rest-order-payload';
    endpoint: { host: typeof ASTER_FAPI_URL; method: 'POST'; path: typeof ASTER_ORDER_PATH };
    payload: BnbPerpOrderPayload;
    payloadHash: `0x${string}`;
    bindingSurface: 'centralized-order-payload-canonical-serialization';
    provesOnchainExecution: false;
    signing: 'USER_HELD_VENUE_CREDENTIALS_REQUIRED';
  } | null;
  caveats: string[];
}

function defaultBlockNumber(options: { signal: AbortSignal }): Promise<number> {
  return fetchChainHeadBlockNumber(BNB_PERP_ORDER_CHAIN_ID, options.signal);
}

/**
 * Build one reviewed, unsigned Aster perpetual order envelope on BNB.
 *
 * Failure classification matches the Base adapter:
 * - UNSUPPORTED_MARKET: the asset is outside the reviewed Aster market set.
 * - UPSTREAM_UNAVAILABLE: venue evidence, chain-head, or guard assessment did
 *   not answer inside the bounded query window.
 * - SLIPPAGE_EXCEEDED: a limit price lies outside the caller's slippage cap.
 * - INVALID_INPUT: the request shape or decimal precision is unusable.
 */
export async function prepareBnbPerpOrderEnvelope(
  rawRequest: BnbPerpOrderEnvelopeRequest,
  dependencies: BnbPerpOrderEnvelopeDependencies = {}
): Promise<BnbPerpOrderEnvelope> {
  const request = parsePerpOrderInput(BnbPerpOrderEnvelopeInputSchema, rawRequest);
  const assetSymbol = request.market.trim().toUpperCase();
  const venueSymbol = asterReviewedMarketForAsset(assetSymbol);
  if (!venueSymbol) {
    throw new PerpOrderAdapterError(
      'UNSUPPORTED_MARKET',
      `${assetSymbol} is not a reviewed Aster perpetual market on BNB`
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const timeoutMs = dependencies.queryTimeoutMs ?? PERP_ORDER_DEFAULT_QUERY_TIMEOUT_MS;
  const fetchVenueState =
    dependencies.fetchVenueState ??
    ((market: AsterReviewedPerpMarket) => fetchAsterPerpMarketState(market));
  const getBlockNumber = dependencies.getBlockNumber ?? defaultBlockNumber;
  const assessGuard = dependencies.assessGuard ?? assessBnbPerpGuard;

  const quantityText = canonicalDecimalText(request.quantity, 'quantity');

  const controller = new AbortController();
  const signal = controller.signal;
  let venueState: AsterPerpMarketState;
  let blockNumber: number;
  try {
    [venueState, blockNumber] = await Promise.all([
      runPerpOrderQuery('Aster venue market evidence', timeoutMs, fetchVenueState(venueSymbol)),
      runPerpOrderQuery('BNB chain head', timeoutMs, getBlockNumber({ signal })),
    ]);
  } catch (error) {
    controller.abort();
    throw error;
  }

  const bounded = resolveSlippageBoundedPrice({
    side: request.side,
    orderType: request.orderType,
    referencePrice: venueState.markPrice,
    maxSlippageBps: request.maxSlippageBps,
    limitPrice: request.limitPrice,
    rejectionContext: {
      input_digest: perpOrderIntentHash({ schema: BNB_PERP_ORDER_SCHEMA, request: rawRequest }),
      data_sources: [
        {
          source: 'aster-fapi-mark-price',
          symbol: venueState.symbol,
          observedAt: venueState.observedAt,
          sourceFreshnessSeconds: venueState.sourceFreshnessSeconds,
        },
      ],
      risk_ruleset_version: `${BNB_PERP_ORDER_SCHEMA}/slippage-cap`,
    },
  });

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

  const payload: BnbPerpOrderPayload = {
    symbol: venueSymbol,
    side: request.side === 'long' ? 'BUY' : 'SELL',
    type: bounded.orderType === 'market' ? 'MARKET' : 'LIMIT',
    quantity: quantityText,
    ...(bounded.orderType === 'limit'
      ? {
          price: priceToDecimalText(bounded.limitPrice!, 'limitPrice'),
          timeInForce: 'IOC' as const,
        }
      : {}),
    reduceOnly: false,
    newClientOrderId: request.clientOrderId,
  };

  const guardInput: BnbPerpGuardInput = {
    protocolId: BNB_PERP_GUARD_ASTER_PROTOCOL_ID,
    action: request.side === 'long' ? 'open_long' : 'open_short',
    assetSymbol,
    marginAssetSymbol: 'USDT',
    sizeUsd: notionalUsd,
    marginValueUsd,
  };
  const guard: BnbPerpGuardResult = await runPerpOrderQuery(
    'BNB perp guard',
    timeoutMs,
    assessGuard(guardInput, {
      fetchVenueState: async () => venueState,
      ...(dependencies.checkOracle ? { checkOracle: dependencies.checkOracle } : {}),
    })
  );

  const risk = buildPerpOrderRiskReference(guard);
  const blockingReasons: string[] =
    guard.verdict === 'BLOCK'
      ? [`Perp guard returned BLOCK for ${assetSymbol} ${request.side}.`, ...guard.reasons]
      : [];
  // Aster is a centralized venue: the guard decision stands, but the artifact
  // can only be submitted with user-held venue credentials, so it is never
  // labelled as ready to sign.
  const verdict: PerpOrderVerdict =
    guard.verdict === 'BLOCK' ? 'BLOCK' : 'REQUIRES_VENUE_CREDENTIALS';
  const quoteValidUntil = Math.floor(now.getTime() / 1000) + request.validForSeconds;

  const observation: PerpOrderObservation = {
    chainId: BNB_PERP_ORDER_CHAIN_ID,
    blockNumber,
    observedAt: now.toISOString(),
    sourceFreshnessSeconds: venueState.sourceFreshnessSeconds,
  };
  const quoteTerms: PerpOrderQuoteTerms = {
    referencePriceUsd: bounded.referencePrice,
    acceptablePrice: priceToDecimalText(bounded.acceptablePrice, 'acceptablePrice'),
    maxSlippageBps: request.maxSlippageBps,
    source: 'aster-venue-mark-price',
    validUntil: quoteValidUntil,
  };

  const payloadHash = perpOrderIntentHash(payload);
  const intentHash = perpOrderIntentHash({
    schema: BNB_PERP_ORDER_SCHEMA,
    chainId: BNB_PERP_ORDER_CHAIN_ID,
    market: { assetSymbol, venueSymbol },
    payload,
    quote: quoteTerms,
    observation: { blockNumber },
    risk: risk.assessmentHash,
  });

  return {
    schema: BNB_PERP_ORDER_SCHEMA,
    verdict,
    intentHash,
    observedAt: now.toISOString(),
    chain: { caip2: BNB_PERP_ORDER_CHAIN, chainId: BNB_PERP_ORDER_CHAIN_ID },
    market: {
      assetSymbol,
      venueSymbol,
      marginAssetSymbol: 'USDT',
      maxLeverage: guard.market.maxLeverage,
      maxLeverageSource: guard.market.maxLeverageSource,
      parameterSource: 'reviewed-profile',
    },
    quote: quoteTerms,
    observation,
    requestedOrder: {
      side: request.side,
      orderType: bounded.orderType,
      quantity: quantityText,
      leverage: request.leverage,
      notionalUsd,
      marginValueUsd,
      limitPrice: bounded.limitPrice,
    },
    policy: { maxSlippageBps: request.maxSlippageBps, validForSeconds: request.validForSeconds },
    risk,
    blockingReasons,
    unsignedOrderEnvelope:
      verdict === 'BLOCK'
        ? null
        : {
            venue: 'aster',
            transport: 'venue-rest-order-payload',
            endpoint: { host: ASTER_FAPI_URL, method: 'POST', path: ASTER_ORDER_PATH },
            payload,
            payloadHash,
            bindingSurface: 'centralized-order-payload-canonical-serialization',
            provesOnchainExecution: false,
            signing: 'USER_HELD_VENUE_CREDENTIALS_REQUIRED',
          },
    caveats: [
      'Insight did not create venue credentials, a signature, or a submission. Sign and submit this payload only in the user-controlled Aster client.',
      'This is a canonical venue REST order payload, not EVM calldata; it proves binding to the exact order, not on-chain execution.',
      'The reference price is the Aster venue mark price; acceptablePrice is the caller worst acceptable fill derived from that price plus slippage.',
      'Aster matching, funding, margin, and later book changes are outside this envelope. A BLOCK result must not be submitted.',
    ],
  };
}
