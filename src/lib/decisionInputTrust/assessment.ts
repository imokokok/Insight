import { keccak256 } from 'viem';
import { z } from 'zod';

import type { EvidenceUse } from '@/lib/dataRights/evidenceRights';
import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';
import type { ReviewedAerodromeSlipstreamPreTradeEvidence } from '@/lib/dex/preTradeAerodromeSlipstream';
import type { ReviewedUniswapV3PreTradeEvidence } from '@/lib/dex/preTradeUniswapV3';
import { MANIP_COST_MAX_AGE_MS, type ManipCostAdvisory } from '@/lib/manipCost/baseline';
import type { ChainlinkMarketReference } from '@/lib/marketReference/chainlink';
import { MAX_REF_AGE_HOURS, type MarketReference } from '@/lib/marketReference/client';
import type { RedStoneMarketReference } from '@/lib/marketReference/redstone';
import { ETHEREUM_TOKEN_ADDRESSES } from '@/lib/oracles/constants/ethereumTokenAddresses';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  DecisionInputQuoteProvenanceSchema,
  quoteProvenanceMatchesQuote,
  usableQuoteProvenance,
  type DecisionInputQuoteProvenance,
} from './quoteProvenance';

import type { DecisionInputAssessmentAttestation } from './attestation';
import type { OnchainRouteQuoteEvidence } from './onchainRouteQuote';

export interface DecisionInputRouteQuote {
  /** Destination units per source unit. */
  price: number;
  observedAt: string;
  /** Caller quote retained for comparison; the on-chain quote is the gate basis. */
  callerReported?: {
    price: number;
    observedAt: string;
  };
  /** Present when Insight independently simulated the route at a pinned block. */
  onchainEvidence?: OnchainRouteQuoteEvidence;
}

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
  /**
   * Hash-only evidence retained by the caller. It binds the reported quote to
   * a source identifier and the caller-held request/response bytes without
   * proxying or persisting a third-party market-data payload.
   */
  quoteProvenance?: DecisionInputQuoteProvenance;
  /** Fail closed unless `quoteProvenance` is present, valid, and usable here. */
  requireQuoteProvenance?: boolean;
  /**
   * Opt in to a block-pinned quote from one reviewed Uniswap V3 pool. The
   * exact input amount is expressed in the source asset's decimal units. This
   * first release admits MON/USDC on Monad, WETH/USDC on Base, and reviewed
   * PancakeSwap V3 USDC/USDT on Base, only in the reviewed forward direction;
   * unsupported routes fail closed.
   */
  reviewedUniswapV3?: {
    amountIn: string;
    maxQuoteDeviationBps: number;
    maxTwapDeviationBps: number;
  };
  /**
   * Opt in to one exact-input quote from the reviewed Base Aerodrome
   * Slipstream WETH/USDC CL100 pool. It is intentionally a separate field:
   * tick-spacing/fee semantics differ from Uniswap V3's fee-tier identity.
   */
  reviewedAerodromeSlipstream?: {
    amountIn: string;
    maxQuoteDeviationBps: number;
    maxTwapDeviationBps: number;
  };
  /** Optional route quote captured by the gated execution workflow. */
  operationRouteQuote?: DecisionInputRouteQuote;
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
    | 'REDSTONE_DIVERGENCE'
    | 'DEX_DEPTH_UNAVAILABLE'
    | 'REVIEWED_UNISWAP_V3_UNAVAILABLE'
    | 'REVIEWED_UNISWAP_V3_QUOTE_DIVERGENCE'
    | 'REVIEWED_UNISWAP_V3_PRICE_IMPACT'
    | 'REVIEWED_UNISWAP_V3_TWAP_DEVIATION'
    | 'REVIEWED_AERODROME_SLIPSTREAM_UNAVAILABLE'
    | 'REVIEWED_AERODROME_SLIPSTREAM_QUOTE_DIVERGENCE'
    | 'REVIEWED_AERODROME_SLIPSTREAM_PRICE_IMPACT'
    | 'REVIEWED_AERODROME_SLIPSTREAM_TWAP_DEVIATION'
    | 'QUOTE_TIMESTAMP_INVALID'
    | 'QUOTE_STALE'
    | 'QUOTE_SLIPPAGE'
    | 'QUOTE_PROVENANCE_REQUIRED'
    | 'QUOTE_PROVENANCE_MALFORMED'
    | 'QUOTE_PROVENANCE_MISMATCH'
    | 'QUOTE_PROVENANCE_RIGHTS';
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
  /** MCP workflow route quote and provenance; signed into both asset assessments. */
  operationRouteQuote: DecisionInputRouteQuote | null;
  /** Digest of the decision price, venue quote, timestamps, and optional route quote. */
  quoteInputHash: `0x${string}`;
  /** Present only when caller-held quote evidence passed structural and scope checks. */
  quoteProvenance?: DecisionInputQuoteProvenance;
  /** Present when this signed result was evaluated only in the synthetic staging mode. */
  evidenceUse?: 'staging';
  policy: Pick<
    DecisionInputCheckRequest,
    'maxReferenceDeviationBps' | 'maxSlippageBps' | 'maxQuoteAgeSeconds'
  > & {
    /** Optional for backwards-compatible verification of earlier attestations. */
    requireQuoteProvenance?: boolean;
    reviewedUniswapV3?: NonNullable<DecisionInputCheckRequest['reviewedUniswapV3']>;
    reviewedAerodromeSlipstream?: NonNullable<
      DecisionInputCheckRequest['reviewedAerodromeSlipstream']
    >;
  };
  prices: {
    decisionPriceUsd: number;
    quotePriceUsd: number;
    quoteObservedAt: string;
    quoteAgeSeconds: number | null;
    quoteDeviationBps: number | null;
    chainlinkPriceUsd: number | null;
    chainlinkDeviationBps: number | null;
    redstonePriceUsd?: number | null;
    redstoneDeviationBps?: number | null;
    cexMedianPriceUsd: number | null;
    cexDeviationBps: number | null;
    cexSpreadBps: number | null;
  };
  evidence: {
    chainlink: {
      provider: 'chainlink-data-feed';
      snapshotHash: `0x${string}`;
      updatedAt: string;
      ageSeconds: number;
      heartbeatSeconds: number;
      feedAddress: `0x${string}`;
      roundId: string;
    } | null;
    redstone?: {
      provider: 'redstone-api';
      snapshotHash: `0x${string}`;
      updatedAt: string;
      ageSeconds: number;
      fresh: boolean;
      priceUsd: number;
      source: string | null;
    } | null;
    cex: {
      snapshotHash: `0x${string}`;
      refHour: string;
      exchangeCount: number;
      crossExchangeSpreadPct: number | null;
      medianBidAskSpreadPct: number | null;
    } | null;
    dexManipulationCost: {
      snapshotHash: `0x${string}`;
      referenceChain: 'ethereum';
      poolCount: number;
      freshestSnapshotTs: string | null;
      cheapestMove1PctUsd: number | null;
      tradeSizeTo1PctManipulationCostRatio: number | null;
    } | null;
    reviewedUniswapV3?: {
      profile: 'monad-wmon-usdc' | 'base-weth-usdc' | 'base-pancakeswap-v3-usdc-usdt';
      venue: 'uniswap-v3' | 'pancakeswap-v3';
      market: string;
      sourceFreshnessSeconds: number;
      observedAt: string;
      blockNumber: string;
      blockHash: `0x${string}`;
      pool: `0x${string}`;
      quoterV2: `0x${string}`;
      feeTier: number;
      amountIn: number;
      amountInRaw: string;
      amountOut: number;
      amountOutRaw: string;
      effectiveToken1PerToken0: number;
      priceImpactBps: number;
      quoteDeviationBps: number | null;
      twapDeviationBpsFromSpot: number;
    } | null;
    reviewedAerodromeSlipstream?: {
      profile: 'base-aerodrome-slipstream-weth-usdc-cl100';
      venue: 'aerodrome-slipstream';
      market: string;
      sourceFreshnessSeconds: number;
      observedAt: string;
      blockNumber: string;
      blockHash: `0x${string}`;
      factory: `0x${string}`;
      pool: `0x${string}`;
      quoterV2: `0x${string}`;
      tickSpacing: number;
      feePips: number;
      amountIn: number;
      amountInRaw: string;
      amountOut: number;
      amountOutRaw: string;
      effectiveToken1PerToken0: number;
      priceImpactBps: number;
      quoteDeviationBps: number | null;
      twapDeviationBpsFromSpot: number;
    } | null;
  };
  reasons: DecisionInputReason[];
  caveats: string[];
  /** Optional signature over every assessment field except this envelope. */
  attestation?: DecisionInputAssessmentAttestation;
}

const FinitePositiveNumberSchema = z.number().finite().positive();
const FiniteNonnegativeNumberSchema = z.number().finite().nonnegative();
const NullablePositiveNumberSchema = FinitePositiveNumberSchema.nullable();
const NullableNonnegativeNumberSchema = FiniteNonnegativeNumberSchema.nullable();
const Bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const EvidenceTimestampSchema = DecisionInputQuoteTimestampSchema;
const ONCHAIN_QUOTE_TOKEN_ADDRESSES = {
  WETH: ETHEREUM_TOKEN_ADDRESSES.WETH.toLowerCase(),
  USDC: ETHEREUM_TOKEN_ADDRESSES.USDC.toLowerCase(),
  WBTC: ETHEREUM_TOKEN_ADDRESSES.WBTC.toLowerCase(),
} as const;
const ONCHAIN_QUOTE_ROUTE_FEES: Readonly<Record<string, readonly number[]>> = {
  'WETH>USDC': [500],
  'USDC>WETH': [500],
  'WETH>WBTC': [3_000],
  'WBTC>WETH': [3_000],
  'USDC>WETH>WBTC': [500, 3_000],
  'WBTC>WETH>USDC': [3_000, 500],
};
const TOKEN_DECIMALS = { WETH: 18, USDC: 6, WBTC: 8 } as const;
const MAX_REDSTONE_REFERENCE_AGE_MS = 5 * 60_000;

const OnchainRouteQuoteEvidenceSchema = z
  .object({
    provider: z.literal('uniswap-v3-quoter-v2'),
    chainId: z.literal(1),
    blockNumber: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .max(80),
    blockHash: Bytes32Schema,
    quoterAddress: AddressSchema,
    path: z
      .string()
      .regex(/^0x(?:[0-9a-fA-F]{2})+$/)
      .max(512),
    routeSymbols: z
      .array(z.enum(['WETH', 'USDC', 'WBTC']))
      .min(2)
      .max(3),
    routeTokens: z.array(AddressSchema).min(2).max(3),
    feeTiers: z.array(z.number().int().positive().max(1_000_000)).min(1).max(2),
    amountInRaw: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .max(80),
    amountOutRaw: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .max(80),
    rpcWitnessCount: z.literal(2),
    rpcWitnessHosts: z
      .tuple([z.string().min(1).max(255), z.string().min(1).max(255)])
      .refine(([first, second]) => first.toLowerCase() !== second.toLowerCase()),
    notionalPrice: z
      .object({
        provider: z.literal('chainlink-data-feed'),
        assetSymbol: z.enum(['WETH', 'USDC', 'WBTC']),
        priceReferenceSymbol: z.enum(['ETH', 'USDC', 'BTC']),
        pricingBasis: z.enum(['chainlink-usd', 'chainlink-btc-usd-wbtc-peg-assumption']),
        priceUsd: FinitePositiveNumberSchema,
        feedAddress: AddressSchema,
        roundId: z.string().min(1).max(80),
        updatedAt: EvidenceTimestampSchema,
        heartbeatSeconds: z.number().int().positive(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    try {
      const dimensionsMismatch =
        value.routeSymbols.length !== value.routeTokens.length ||
        value.feeTiers.length !== value.routeSymbols.length - 1;
      if (dimensionsMismatch) {
        context.addIssue({ code: 'custom', message: 'Route quote path dimensions do not match.' });
      } else {
        const encodedPath = `0x${value.routeTokens
          .map((token, index) => {
            const tokenHex = index === 0 ? token.slice(2).toLowerCase() : '';
            if (index === 0) return tokenHex;
            const fee = value.feeTiers[index - 1].toString(16).padStart(6, '0');
            return `${fee}${token.slice(2).toLowerCase()}`;
          })
          .join('')}`;
        if (encodedPath !== value.path.toLowerCase()) {
          context.addIssue({
            code: 'custom',
            path: ['path'],
            message: 'Route path does not match its tokens and fees.',
          });
        }
      }
      const routeKey = value.routeSymbols.join('>');
      const expectedFees = ONCHAIN_QUOTE_ROUTE_FEES[routeKey];
      if (
        !expectedFees ||
        expectedFees.length !== value.feeTiers.length ||
        expectedFees.some((fee, index) => fee !== value.feeTiers[index])
      ) {
        context.addIssue({
          code: 'custom',
          path: ['routeSymbols'],
          message: 'Route is outside the reviewed Ethereum mainnet route map.',
        });
      }
      if (
        !dimensionsMismatch &&
        value.routeTokens.some(
          (address, index) =>
            address.toLowerCase() !==
            ONCHAIN_QUOTE_TOKEN_ADDRESSES[value.routeSymbols[index]].toLowerCase()
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['routeTokens'],
          message: 'Route token address does not match its supported Ethereum symbol.',
        });
      }
      const expectedPricing = {
        WETH: { priceReferenceSymbol: 'ETH', pricingBasis: 'chainlink-usd' },
        USDC: { priceReferenceSymbol: 'USDC', pricingBasis: 'chainlink-usd' },
        WBTC: {
          priceReferenceSymbol: 'BTC',
          pricingBasis: 'chainlink-btc-usd-wbtc-peg-assumption',
        },
      } as const;
      const expected = expectedPricing[value.routeSymbols[0]];
      if (
        !expected ||
        value.notionalPrice.assetSymbol !== value.routeSymbols[0] ||
        value.notionalPrice.priceReferenceSymbol !== expected.priceReferenceSymbol ||
        value.notionalPrice.pricingBasis !== expected.pricingBasis
      ) {
        context.addIssue({
          code: 'custom',
          path: ['notionalPrice'],
          message: 'Notional pricing evidence does not match the route source asset.',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Route quote evidence is malformed.',
      });
    }
  });

const DecisionInputRouteQuoteSchema = z
  .object({
    price: FinitePositiveNumberSchema,
    observedAt: DecisionInputQuoteTimestampSchema,
    callerReported: z
      .object({
        price: FinitePositiveNumberSchema,
        observedAt: DecisionInputQuoteTimestampSchema,
      })
      .strict()
      .optional(),
    onchainEvidence: OnchainRouteQuoteEvidenceSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.onchainEvidence) return;
    try {
      const evidence = value.onchainEvidence;
      const sourceSymbol = evidence.routeSymbols[0];
      const destinationSymbol = evidence.routeSymbols.at(-1);
      if (!sourceSymbol || !destinationSymbol) throw new Error('route symbols are missing');
      const sourceDecimals = TOKEN_DECIMALS[sourceSymbol];
      const destinationDecimals = TOKEN_DECIMALS[destinationSymbol];
      const reconstructedPrice =
        (Number(BigInt(evidence.amountOutRaw)) / Number(BigInt(evidence.amountInRaw))) *
        10 ** (sourceDecimals - destinationDecimals);
      const relativeDifference =
        Math.abs(value.price - reconstructedPrice) / Math.max(value.price, reconstructedPrice);
      if (!Number.isFinite(reconstructedPrice) || relativeDifference > 1e-10) {
        context.addIssue({
          code: 'custom',
          path: ['price'],
          message: 'Route quote price does not match its signed raw token amounts.',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['onchainEvidence'],
        message: 'Route quote amounts cannot be reconciled with a supported token path.',
      });
    }
  });

/** Strict runtime shape used before a serialized assessment is verified. */
export const DecisionInputAssessmentSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(['SUFFICIENT', 'BLOCK', 'INSUFFICIENT_EVIDENCE']),
    eligibleToProceed: z.boolean(),
    asset: z.string().min(1).max(80),
    chainId: z.number().int().nonnegative(),
    action: z.enum(['swap', 'borrow', 'lend', 'liquidate', 'repay']),
    tradeAmountUsd: FinitePositiveNumberSchema,
    evaluatedAt: DecisionInputQuoteTimestampSchema,
    operationRouteQuote: DecisionInputRouteQuoteSchema.nullable(),
    quoteInputHash: Bytes32Schema,
    quoteProvenance: DecisionInputQuoteProvenanceSchema.optional(),
    evidenceUse: z.literal('staging').optional(),
    policy: z
      .object({
        maxReferenceDeviationBps: z.number().int().min(0).max(10_000),
        maxSlippageBps: z.number().int().min(0).max(10_000),
        maxQuoteAgeSeconds: z.number().int().min(1).max(300),
        requireQuoteProvenance: z.boolean().optional(),
        reviewedUniswapV3: z
          .object({
            amountIn: z
              .string()
              .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
              .max(128),
            maxQuoteDeviationBps: z.number().int().min(0).max(10_000),
            maxTwapDeviationBps: z.number().int().min(0).max(10_000),
          })
          .strict()
          .optional(),
        reviewedAerodromeSlipstream: z
          .object({
            amountIn: z
              .string()
              .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
              .max(128),
            maxQuoteDeviationBps: z.number().int().min(0).max(10_000),
            maxTwapDeviationBps: z.number().int().min(0).max(10_000),
          })
          .strict()
          .optional(),
      })
      .strict(),
    prices: z
      .object({
        decisionPriceUsd: FinitePositiveNumberSchema,
        quotePriceUsd: FinitePositiveNumberSchema,
        quoteObservedAt: DecisionInputQuoteTimestampSchema,
        quoteAgeSeconds: NullableNonnegativeNumberSchema,
        quoteDeviationBps: NullableNonnegativeNumberSchema,
        chainlinkPriceUsd: NullablePositiveNumberSchema,
        chainlinkDeviationBps: NullableNonnegativeNumberSchema,
        redstonePriceUsd: NullablePositiveNumberSchema.optional(),
        redstoneDeviationBps: NullableNonnegativeNumberSchema.optional(),
        cexMedianPriceUsd: NullablePositiveNumberSchema,
        cexDeviationBps: NullableNonnegativeNumberSchema,
        cexSpreadBps: NullableNonnegativeNumberSchema,
      })
      .strict(),
    evidence: z
      .object({
        chainlink: z
          .object({
            provider: z.literal('chainlink-data-feed'),
            snapshotHash: Bytes32Schema,
            updatedAt: EvidenceTimestampSchema,
            ageSeconds: FiniteNonnegativeNumberSchema,
            heartbeatSeconds: z.number().int().positive(),
            feedAddress: AddressSchema,
            roundId: z.string().min(1).max(80),
          })
          .strict()
          .nullable(),
        redstone: z
          .object({
            provider: z.literal('redstone-api'),
            snapshotHash: Bytes32Schema,
            updatedAt: EvidenceTimestampSchema,
            ageSeconds: FiniteNonnegativeNumberSchema,
            fresh: z.boolean(),
            priceUsd: FinitePositiveNumberSchema,
            source: z.string().min(1).max(120).nullable(),
          })
          .strict()
          .nullable()
          .optional(),
        cex: z
          .object({
            snapshotHash: Bytes32Schema,
            refHour: EvidenceTimestampSchema,
            exchangeCount: z.number().int().nonnegative(),
            crossExchangeSpreadPct: NullableNonnegativeNumberSchema,
            medianBidAskSpreadPct: NullableNonnegativeNumberSchema,
          })
          .strict()
          .nullable(),
        dexManipulationCost: z
          .object({
            snapshotHash: Bytes32Schema,
            referenceChain: z.literal('ethereum'),
            poolCount: z.number().int().nonnegative(),
            freshestSnapshotTs: EvidenceTimestampSchema.nullable(),
            cheapestMove1PctUsd: NullablePositiveNumberSchema,
            tradeSizeTo1PctManipulationCostRatio: NullableNonnegativeNumberSchema,
          })
          .strict()
          .nullable(),
        reviewedUniswapV3: z
          .object({
            profile: z.enum(['monad-wmon-usdc', 'base-weth-usdc', 'base-pancakeswap-v3-usdc-usdt']),
            venue: z.enum(['uniswap-v3', 'pancakeswap-v3']),
            market: z.string().min(1).max(80),
            sourceFreshnessSeconds: FiniteNonnegativeNumberSchema,
            observedAt: EvidenceTimestampSchema,
            blockNumber: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            blockHash: Bytes32Schema,
            pool: AddressSchema,
            quoterV2: AddressSchema,
            feeTier: z.number().int().positive().max(1_000_000),
            amountIn: FinitePositiveNumberSchema,
            amountInRaw: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            amountOut: FinitePositiveNumberSchema,
            amountOutRaw: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            effectiveToken1PerToken0: FinitePositiveNumberSchema,
            priceImpactBps: FiniteNonnegativeNumberSchema,
            quoteDeviationBps: NullableNonnegativeNumberSchema,
            twapDeviationBpsFromSpot: FiniteNonnegativeNumberSchema,
          })
          .strict()
          .nullable()
          .optional(),
        reviewedAerodromeSlipstream: z
          .object({
            profile: z.literal('base-aerodrome-slipstream-weth-usdc-cl100'),
            venue: z.literal('aerodrome-slipstream'),
            market: z.string().min(1).max(80),
            sourceFreshnessSeconds: FiniteNonnegativeNumberSchema,
            observedAt: EvidenceTimestampSchema,
            blockNumber: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            blockHash: Bytes32Schema,
            factory: AddressSchema,
            pool: AddressSchema,
            quoterV2: AddressSchema,
            tickSpacing: z.number().int().positive().max(16_383),
            feePips: z.number().int().positive().max(100_000),
            amountIn: FinitePositiveNumberSchema,
            amountInRaw: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            amountOut: FinitePositiveNumberSchema,
            amountOutRaw: z
              .string()
              .regex(/^[1-9][0-9]*$/)
              .max(80),
            effectiveToken1PerToken0: FinitePositiveNumberSchema,
            priceImpactBps: FiniteNonnegativeNumberSchema,
            quoteDeviationBps: NullableNonnegativeNumberSchema,
            twapDeviationBpsFromSpot: FiniteNonnegativeNumberSchema,
          })
          .strict()
          .nullable()
          .optional(),
      })
      .strict(),
    reasons: z
      .array(
        z
          .object({
            code: z.enum([
              'CHAINLINK_UNAVAILABLE',
              'CHAINLINK_STALE',
              'MARKET_REFERENCE_UNAVAILABLE',
              'MARKET_REFERENCE_LOW_COVERAGE',
              'MARKET_REFERENCE_SPREAD_UNAVAILABLE',
              'MARKET_REFERENCE_DIVERGENCE',
              'MARKET_REFERENCE_SPREAD',
              'CHAINLINK_DIVERGENCE',
              'REDSTONE_DIVERGENCE',
              'DEX_DEPTH_UNAVAILABLE',
              'REVIEWED_UNISWAP_V3_UNAVAILABLE',
              'REVIEWED_UNISWAP_V3_QUOTE_DIVERGENCE',
              'REVIEWED_UNISWAP_V3_PRICE_IMPACT',
              'REVIEWED_UNISWAP_V3_TWAP_DEVIATION',
              'REVIEWED_AERODROME_SLIPSTREAM_UNAVAILABLE',
              'REVIEWED_AERODROME_SLIPSTREAM_QUOTE_DIVERGENCE',
              'REVIEWED_AERODROME_SLIPSTREAM_PRICE_IMPACT',
              'REVIEWED_AERODROME_SLIPSTREAM_TWAP_DEVIATION',
              'QUOTE_TIMESTAMP_INVALID',
              'QUOTE_STALE',
              'QUOTE_SLIPPAGE',
              'QUOTE_PROVENANCE_REQUIRED',
              'QUOTE_PROVENANCE_MALFORMED',
              'QUOTE_PROVENANCE_MISMATCH',
              'QUOTE_PROVENANCE_RIGHTS',
            ]),
            severity: z.enum(['block', 'insufficient_evidence']),
            message: z.string().min(1).max(512),
          })
          .strict()
      )
      .max(64),
    caveats: z.array(z.string().min(1).max(1024)).max(64),
  })
  .strict()
  .superRefine((assessment, context) => {
    if (assessment.eligibleToProceed !== (assessment.status === 'SUFFICIENT')) {
      context.addIssue({
        code: 'custom',
        path: ['eligibleToProceed'],
        message: 'eligibleToProceed must match the assessment status.',
      });
    }

    let expectedQuoteInputHash: `0x${string}` | null = null;
    try {
      expectedQuoteInputHash = snapshotHash({
        asset: assessment.asset,
        chainId: assessment.chainId,
        action: assessment.action,
        tradeAmountUsd: assessment.tradeAmountUsd,
        decisionPriceUsd: assessment.prices.decisionPriceUsd,
        quotePriceUsd: assessment.prices.quotePriceUsd,
        quoteObservedAt: assessment.prices.quoteObservedAt,
        operationRouteQuote: assessment.operationRouteQuote,
        ...(assessment.quoteProvenance ? { quoteProvenance: assessment.quoteProvenance } : {}),
        ...(assessment.policy.reviewedUniswapV3
          ? { reviewedUniswapV3: assessment.policy.reviewedUniswapV3 }
          : {}),
        ...(assessment.policy.reviewedAerodromeSlipstream
          ? { reviewedAerodromeSlipstream: assessment.policy.reviewedAerodromeSlipstream }
          : {}),
        ...(assessment.evidenceUse ? { evidenceUse: assessment.evidenceUse } : {}),
      });
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['quoteInputHash'],
        message: 'Quote input data cannot be canonically hashed.',
      });
    }
    if (
      expectedQuoteInputHash !== null &&
      assessment.quoteInputHash.toLowerCase() !== expectedQuoteInputHash.toLowerCase()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['quoteInputHash'],
        message: 'Quote input hash does not match the assessment inputs.',
      });
    }

    const quoteProvenance = assessment.quoteProvenance;
    if (
      assessment.status === 'SUFFICIENT' &&
      assessment.policy.requireQuoteProvenance === true &&
      !quoteProvenance
    ) {
      context.addIssue({
        code: 'custom',
        path: ['quoteProvenance'],
        message:
          'A sufficient result under a provenance-required policy must carry a validated provenance envelope.',
      });
    }
    if (quoteProvenance) {
      if (quoteProvenance.rightsScope === 'synthetic' && assessment.evidenceUse !== 'staging') {
        context.addIssue({
          code: 'custom',
          path: ['evidenceUse'],
          message: 'Synthetic quote provenance is valid only in a signed staging assessment.',
        });
      }
      if (quoteProvenance.rightsScope === 'research-quarantined') {
        context.addIssue({
          code: 'custom',
          path: ['quoteProvenance', 'rightsScope'],
          message: 'Research-quarantined quote provenance may not be signed as usable evidence.',
        });
      }
      if (
        !quoteProvenanceMatchesQuote(quoteProvenance, {
          asset: assessment.asset,
          chainId: assessment.chainId,
          quotePriceUsd: assessment.prices.quotePriceUsd,
          quoteObservedAt: assessment.prices.quoteObservedAt,
        })
      ) {
        context.addIssue({
          code: 'custom',
          path: ['quoteProvenance'],
          message: 'Quote provenance does not bind to the assessed quote.',
        });
      }
    }

    const hasBlockReason = assessment.reasons.some((reason) => reason.severity === 'block');
    const hasInsufficientReason = assessment.reasons.some(
      (reason) => reason.severity === 'insufficient_evidence'
    );
    const statusMatchesReasons =
      assessment.status === 'SUFFICIENT'
        ? !hasBlockReason && !hasInsufficientReason
        : assessment.status === 'BLOCK'
          ? hasBlockReason
          : !hasBlockReason && hasInsufficientReason;
    if (!statusMatchesReasons) {
      context.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'Assessment status does not match its reason severities.',
      });
    }
    if (
      assessment.status === 'SUFFICIENT' &&
      (assessment.evidence.chainlink === null ||
        assessment.evidence.cex === null ||
        (assessment.policy.reviewedUniswapV3 || assessment.policy.reviewedAerodromeSlipstream
          ? assessment.policy.reviewedUniswapV3
            ? assessment.evidence.reviewedUniswapV3 === null
            : assessment.evidence.reviewedAerodromeSlipstream === null
          : assessment.evidence.dexManipulationCost === null) ||
        assessment.prices.quoteAgeSeconds === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'A sufficient assessment must include every required evidence source.',
      });
    }

    const routeEvidence = assessment.operationRouteQuote?.onchainEvidence;
    if (routeEvidence) {
      const normalizedAsset =
        assessment.asset.trim().toUpperCase() === 'ETH'
          ? 'WETH'
          : assessment.asset.trim().toUpperCase();
      const routeSource = routeEvidence.routeSymbols[0];
      const routeDestination = routeEvidence.routeSymbols[routeEvidence.routeSymbols.length - 1];
      if (
        assessment.chainId !== routeEvidence.chainId ||
        (normalizedAsset !== routeSource && normalizedAsset !== routeDestination)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['operationRouteQuote', 'onchainEvidence'],
          message: 'Route evidence must use the assessment chain and include its asset.',
        });
      }

      try {
        const sourceSymbol = routeEvidence.routeSymbols[0];
        const sourceDecimals = TOKEN_DECIMALS[sourceSymbol];
        const amountIn = Number(BigInt(routeEvidence.amountInRaw));
        const impliedNotionalUsd =
          (amountIn / 10 ** sourceDecimals) * routeEvidence.notionalPrice.priceUsd;
        const oneUnitRoundingErrorUsd = routeEvidence.notionalPrice.priceUsd / 10 ** sourceDecimals;
        const floatingPointToleranceUsd = assessment.tradeAmountUsd * 1e-12;
        const notionalRoundingErrorUsd = assessment.tradeAmountUsd - impliedNotionalUsd;
        if (
          !Number.isFinite(impliedNotionalUsd) ||
          notionalRoundingErrorUsd < -floatingPointToleranceUsd ||
          notionalRoundingErrorUsd >= oneUnitRoundingErrorUsd + floatingPointToleranceUsd
        ) {
          context.addIssue({
            code: 'custom',
            path: ['operationRouteQuote', 'onchainEvidence', 'amountInRaw'],
            message: 'Route input amount does not match the assessment notional and signed price.',
          });
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['operationRouteQuote', 'onchainEvidence', 'amountInRaw'],
          message: 'Route input amount cannot be reconciled with the assessment notional.',
        });
      }
    }

    const expectedQuoteDeviationBps = deviationBps(
      assessment.prices.quotePriceUsd,
      assessment.prices.decisionPriceUsd
    );
    if (assessment.prices.quoteDeviationBps !== expectedQuoteDeviationBps) {
      context.addIssue({
        code: 'custom',
        path: ['prices', 'quoteDeviationBps'],
        message: 'Quote deviation does not match the signed prices.',
      });
    }
    const quoteAgeSeconds =
      (Date.parse(assessment.evaluatedAt) - Date.parse(assessment.prices.quoteObservedAt)) / 1000;
    const expectedQuoteAgeSeconds =
      Number.isFinite(quoteAgeSeconds) && quoteAgeSeconds >= 0 ? quoteAgeSeconds : null;
    if (assessment.prices.quoteAgeSeconds !== expectedQuoteAgeSeconds) {
      context.addIssue({
        code: 'custom',
        path: ['prices', 'quoteAgeSeconds'],
        message: 'Quote age does not match the signed timestamps.',
      });
    }
  });

export interface AssessDecisionInputOptions {
  asset: string;
  destinationAsset?: string;
  chainId: number;
  action: DecisionInputAssessment['action'];
  tradeAmountUsd: number;
  request: DecisionInputCheckRequest;
  chainlink: ChainlinkMarketReference | null;
  redstone?: RedStoneMarketReference | null;
  cex: MarketReference | null;
  dex: ManipCostAdvisory | null;
  /** Fresh exact-notional evidence from a reviewed Monad or Base V3 pool. */
  reviewedUniswapV3?: ReviewedUniswapV3PreTradeEvidence | null;
  /** Fresh exact-notional evidence from the reviewed Base Aerodrome CL100 pool. */
  reviewedAerodromeSlipstream?: ReviewedAerodromeSlipstreamPreTradeEvidence | null;
  /** Synthetic evidence is accepted only in staging/test evaluation. */
  evidenceUse?: EvidenceUse;
  now?: Date;
}

function deviationBps(input: number, reference: number): number | null {
  if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }
  const deviation = (Math.abs(input - reference) / reference) * 10_000;
  return Number.isFinite(deviation) ? deviation : Number.MAX_VALUE;
}

function snapshotHash(value: unknown): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(value)));
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
  provenance?: DecisionInputQuoteProvenance;
}

interface ChainlinkChecks {
  priceUsd: number | null;
  deviationBps: number | null;
  evidence: ChainlinkEvidence | null;
}

type RedStoneEvidence = NonNullable<DecisionInputAssessment['evidence']['redstone']>;

interface RedStoneChecks {
  priceUsd: number | null;
  deviationBps: number | null;
  evidence: RedStoneEvidence | null;
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
  reasons: DecisionInputReason[],
  asset: string,
  chainId: number,
  evidenceUse: EvidenceUse
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

  let provenance: DecisionInputQuoteProvenance | undefined;
  if (request.quoteProvenance !== undefined) {
    const result = usableQuoteProvenance(
      request.quoteProvenance,
      {
        asset,
        chainId,
        quotePriceUsd: request.quotePriceUsd,
        quoteObservedAt: request.quoteObservedAt,
      },
      evidenceUse
    );
    if (result.provenance) {
      provenance = result.provenance;
    } else if (result.reason === 'rights_not_permitted') {
      addReason(
        reasons,
        'QUOTE_PROVENANCE_RIGHTS',
        'insufficient_evidence',
        'The quote provenance is quarantined or not permitted for this assessment environment.'
      );
    } else if (result.reason === 'binding_mismatch') {
      addReason(
        reasons,
        'QUOTE_PROVENANCE_MISMATCH',
        'insufficient_evidence',
        'The quote provenance does not bind to the submitted asset, chain, price, and timestamp.'
      );
    } else {
      addReason(
        reasons,
        'QUOTE_PROVENANCE_MALFORMED',
        'insufficient_evidence',
        'The quote provenance envelope is malformed.'
      );
    }
  } else if (request.requireQuoteProvenance === true) {
    addReason(
      reasons,
      'QUOTE_PROVENANCE_REQUIRED',
      'insufficient_evidence',
      'The policy requires caller-held quote provenance before this input can proceed.'
    );
  }

  return {
    ageSeconds: ageSeconds !== null && ageSeconds >= 0 ? ageSeconds : null,
    deviationBps: quoteDiffBps,
    ...(provenance ? { provenance } : {}),
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
            snapshotHash: snapshotHash(chainlink),
            updatedAt: chainlink.updatedAt,
            ageSeconds: chainlink.ageSeconds,
            heartbeatSeconds: chainlink.heartbeatSeconds,
            feedAddress: chainlink.feedAddress,
            roundId: chainlink.roundId,
          }
        : null,
  };
}

function assessRedStone(
  asset: string,
  request: DecisionInputCheckRequest,
  redstone: RedStoneMarketReference | null | undefined,
  nowMs: number,
  reasons: DecisionInputReason[]
): RedStoneChecks {
  const referenceSymbol = asset === 'WETH' ? 'ETH' : asset;
  const updatedAtMs = redstone ? Date.parse(redstone.updatedAt) : Number.NaN;
  const valid =
    redstone !== null &&
    redstone !== undefined &&
    redstone.provider === 'redstone-api' &&
    redstone.symbol === referenceSymbol &&
    redstone.quote === 'USD' &&
    Number.isFinite(redstone.price) &&
    redstone.price > 0 &&
    Number.isFinite(updatedAtMs) &&
    updatedAtMs > 0 &&
    updatedAtMs <= nowMs;
  if (!valid || !redstone) {
    return { priceUsd: null, deviationBps: null, evidence: null };
  }

  const ageMs = nowMs - updatedAtMs;
  const ageSeconds = ageMs / 1000;
  const fresh = ageMs <= MAX_REDSTONE_REFERENCE_AGE_MS;
  const diffBps = fresh ? deviationBps(request.decisionPriceUsd, redstone.price) : null;
  if (fresh && diffBps !== null && diffBps > request.maxReferenceDeviationBps) {
    addReason(
      reasons,
      'REDSTONE_DIVERGENCE',
      'block',
      `The decision price differs from the fresh RedStone reference by ${diffBps.toFixed(1)} bps; the limit is ${request.maxReferenceDeviationBps} bps.`
    );
  }

  const source =
    typeof redstone.source === 'string' && redstone.source.trim().length > 0
      ? redstone.source.trim().slice(0, 120)
      : null;
  const evidence: RedStoneEvidence = {
    provider: 'redstone-api',
    snapshotHash: snapshotHash({ ...redstone, source }),
    updatedAt: redstone.updatedAt,
    ageSeconds,
    fresh,
    priceUsd: redstone.price,
    source,
  };

  return {
    priceUsd: fresh ? redstone.price : null,
    deviationBps: diffBps,
    evidence,
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
  const rawSpreadBps =
    cex?.crossExchangeSpreadPct !== null && cex?.crossExchangeSpreadPct !== undefined
      ? cex.crossExchangeSpreadPct * 100
      : null;
  const spreadBps =
    rawSpreadBps === null ? null : Number.isFinite(rawSpreadBps) ? rawSpreadBps : Number.MAX_VALUE;
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
            snapshotHash: snapshotHash(cex),
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
  reasons: DecisionInputReason[],
  required: boolean
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
    if (required) {
      addReason(
        reasons,
        'DEX_DEPTH_UNAVAILABLE',
        'insufficient_evidence',
        `No fresh Ethereum DEX manipulation-cost evidence is available for ${asset}; this v1 evidence map covers ETH, USDC, and WBTC on Ethereum mainnet.`
      );
    }
    return { evidence: null };
  }

  return {
    evidence: {
      snapshotHash: snapshotHash(dex),
      referenceChain: dex.referenceChain,
      poolCount: dex.pools.length,
      freshestSnapshotTs: dex.freshestSnapshotTs,
      cheapestMove1PctUsd: dex.cheapestMove1PctUsd,
      tradeSizeTo1PctManipulationCostRatio: Number.isFinite(
        tradeAmountUsd / dex.cheapestMove1PctUsd
      )
        ? tradeAmountUsd / dex.cheapestMove1PctUsd
        : Number.MAX_VALUE,
    },
  };
}

type ReviewedUniswapV3Evidence = NonNullable<
  NonNullable<DecisionInputAssessment['evidence']['reviewedUniswapV3']>
>;

interface ReviewedUniswapV3Checks {
  evidence: ReviewedUniswapV3Evidence | null;
}

function assessReviewedUniswapV3(
  request: DecisionInputCheckRequest,
  evidence: ReviewedUniswapV3PreTradeEvidence | null | undefined,
  reasons: DecisionInputReason[]
): ReviewedUniswapV3Checks {
  if (!request.reviewedUniswapV3) return { evidence: null };
  if (!evidence) {
    addReason(
      reasons,
      'REVIEWED_UNISWAP_V3_UNAVAILABLE',
      'insufficient_evidence',
      'No fresh block-pinned quote is available from the reviewed concentrated-liquidity pool for this exact route and amount.'
    );
    return { evidence: null };
  }

  const quoteDeviationBps = deviationBps(
    evidence.quote.effectiveToken1PerToken0,
    request.quotePriceUsd
  );
  if (
    quoteDeviationBps !== null &&
    quoteDeviationBps > request.reviewedUniswapV3.maxQuoteDeviationBps
  ) {
    addReason(
      reasons,
      'REVIEWED_UNISWAP_V3_QUOTE_DIVERGENCE',
      'block',
      `The reviewed Uniswap V3 quote differs from the submitted venue quote by ${quoteDeviationBps.toFixed(1)} bps; the limit is ${request.reviewedUniswapV3.maxQuoteDeviationBps} bps.`
    );
  }
  if (evidence.quote.priceImpactBps > request.maxSlippageBps) {
    addReason(
      reasons,
      'REVIEWED_UNISWAP_V3_PRICE_IMPACT',
      'block',
      `The reviewed Uniswap V3 exact-input quote has ${evidence.quote.priceImpactBps.toFixed(1)} bps price impact; the declared slippage limit is ${request.maxSlippageBps} bps.`
    );
  }
  if (evidence.twapDeviationBpsFromSpot > request.reviewedUniswapV3.maxTwapDeviationBps) {
    addReason(
      reasons,
      'REVIEWED_UNISWAP_V3_TWAP_DEVIATION',
      'block',
      `The reviewed Uniswap V3 spot/TWAP divergence is ${evidence.twapDeviationBpsFromSpot.toFixed(1)} bps; the limit is ${request.reviewedUniswapV3.maxTwapDeviationBps} bps.`
    );
  }

  return {
    evidence: {
      profile: evidence.profile,
      venue: evidence.venue,
      market: evidence.market,
      sourceFreshnessSeconds: evidence.sourceFreshnessSeconds,
      observedAt: evidence.observedAt,
      blockNumber: evidence.block.number,
      blockHash: evidence.block.hash,
      pool: evidence.contracts.pool,
      quoterV2: evidence.contracts.quoterV2,
      feeTier: evidence.contracts.feeTier,
      amountIn: evidence.quote.amountIn,
      amountInRaw: evidence.quote.amountInRaw,
      amountOut: evidence.quote.amountOut,
      amountOutRaw: evidence.quote.amountOutRaw,
      effectiveToken1PerToken0: evidence.quote.effectiveToken1PerToken0,
      priceImpactBps: evidence.quote.priceImpactBps,
      quoteDeviationBps,
      twapDeviationBpsFromSpot: evidence.twapDeviationBpsFromSpot,
    },
  };
}

type ReviewedAerodromeSlipstreamEvidence = NonNullable<
  NonNullable<DecisionInputAssessment['evidence']['reviewedAerodromeSlipstream']>
>;

interface ReviewedAerodromeSlipstreamChecks {
  evidence: ReviewedAerodromeSlipstreamEvidence | null;
}

function assessReviewedAerodromeSlipstream(
  request: DecisionInputCheckRequest,
  evidence: ReviewedAerodromeSlipstreamPreTradeEvidence | null | undefined,
  reasons: DecisionInputReason[]
): ReviewedAerodromeSlipstreamChecks {
  if (!request.reviewedAerodromeSlipstream) return { evidence: null };
  if (!evidence) {
    addReason(
      reasons,
      'REVIEWED_AERODROME_SLIPSTREAM_UNAVAILABLE',
      'insufficient_evidence',
      'No fresh block-pinned quote is available from the reviewed Aerodrome Slipstream pool for this exact route and amount.'
    );
    return { evidence: null };
  }

  const quoteDeviationBps = deviationBps(
    evidence.quote.effectiveToken1PerToken0,
    request.quotePriceUsd
  );
  if (
    quoteDeviationBps !== null &&
    quoteDeviationBps > request.reviewedAerodromeSlipstream.maxQuoteDeviationBps
  ) {
    addReason(
      reasons,
      'REVIEWED_AERODROME_SLIPSTREAM_QUOTE_DIVERGENCE',
      'block',
      `The reviewed Aerodrome Slipstream quote differs from the submitted venue quote by ${quoteDeviationBps.toFixed(1)} bps; the limit is ${request.reviewedAerodromeSlipstream.maxQuoteDeviationBps} bps.`
    );
  }
  if (evidence.quote.priceImpactBps > request.maxSlippageBps) {
    addReason(
      reasons,
      'REVIEWED_AERODROME_SLIPSTREAM_PRICE_IMPACT',
      'block',
      `The reviewed Aerodrome Slipstream exact-input quote has ${evidence.quote.priceImpactBps.toFixed(1)} bps price impact; the declared slippage limit is ${request.maxSlippageBps} bps.`
    );
  }
  if (evidence.twapDeviationBpsFromSpot > request.reviewedAerodromeSlipstream.maxTwapDeviationBps) {
    addReason(
      reasons,
      'REVIEWED_AERODROME_SLIPSTREAM_TWAP_DEVIATION',
      'block',
      `The reviewed Aerodrome Slipstream spot/TWAP divergence is ${evidence.twapDeviationBpsFromSpot.toFixed(1)} bps; the limit is ${request.reviewedAerodromeSlipstream.maxTwapDeviationBps} bps.`
    );
  }

  return {
    evidence: {
      profile: evidence.profile,
      venue: evidence.venue,
      market: evidence.market,
      sourceFreshnessSeconds: evidence.sourceFreshnessSeconds,
      observedAt: evidence.observedAt,
      blockNumber: evidence.block.number,
      blockHash: evidence.block.hash,
      factory: evidence.contracts.factory,
      pool: evidence.contracts.pool,
      quoterV2: evidence.contracts.quoterV2,
      tickSpacing: evidence.contracts.tickSpacing,
      feePips: evidence.contracts.feePips,
      amountIn: evidence.quote.amountIn,
      amountInRaw: evidence.quote.amountInRaw,
      amountOut: evidence.quote.amountOut,
      amountOutRaw: evidence.quote.amountOutRaw,
      effectiveToken1PerToken0: evidence.quote.effectiveToken1PerToken0,
      priceImpactBps: evidence.quote.priceImpactBps,
      quoteDeviationBps,
      twapDeviationBpsFromSpot: evidence.twapDeviationBpsFromSpot,
    },
  };
}

export function assessDecisionInput(options: AssessDecisionInputOptions): DecisionInputAssessment {
  const {
    asset,
    chainId,
    action,
    tradeAmountUsd,
    request,
    chainlink,
    redstone,
    cex,
    dex,
    reviewedUniswapV3,
    reviewedAerodromeSlipstream,
  } = options;
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const normalizedAsset = asset.trim().toUpperCase();
  const evidenceUse = options.evidenceUse ?? 'customer';
  const reasons: DecisionInputReason[] = [];
  const quote = assessQuote(request, nowMs, reasons, normalizedAsset, chainId, evidenceUse);
  const oracle = assessChainlink(normalizedAsset, chainId, request, chainlink, reasons);
  const redstoneReference = assessRedStone(normalizedAsset, request, redstone, nowMs, reasons);
  const market = assessCex(request, cex, nowMs, reasons);
  const depth = assessDex(
    normalizedAsset,
    chainId,
    tradeAmountUsd,
    dex,
    nowMs,
    reasons,
    request.reviewedUniswapV3 === undefined && request.reviewedAerodromeSlipstream === undefined
  );
  const reviewedDex = assessReviewedUniswapV3(request, reviewedUniswapV3, reasons);
  const reviewedAerodrome = assessReviewedAerodromeSlipstream(
    request,
    reviewedAerodromeSlipstream,
    reasons
  );
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
    quoteInputHash: snapshotHash({
      asset: normalizedAsset,
      chainId,
      action,
      tradeAmountUsd,
      decisionPriceUsd: request.decisionPriceUsd,
      quotePriceUsd: request.quotePriceUsd,
      quoteObservedAt: request.quoteObservedAt,
      operationRouteQuote: request.operationRouteQuote ?? null,
      ...(quote.provenance ? { quoteProvenance: quote.provenance } : {}),
      ...(request.reviewedUniswapV3 ? { reviewedUniswapV3: request.reviewedUniswapV3 } : {}),
      ...(request.reviewedAerodromeSlipstream
        ? { reviewedAerodromeSlipstream: request.reviewedAerodromeSlipstream }
        : {}),
      ...(evidenceUse === 'staging' ? { evidenceUse: 'staging' } : {}),
    }),
    ...(quote.provenance ? { quoteProvenance: quote.provenance } : {}),
    ...(evidenceUse === 'staging' ? { evidenceUse: 'staging' } : {}),
    policy: {
      maxReferenceDeviationBps: request.maxReferenceDeviationBps,
      maxSlippageBps: request.maxSlippageBps,
      maxQuoteAgeSeconds: request.maxQuoteAgeSeconds,
      ...(request.requireQuoteProvenance === true ? { requireQuoteProvenance: true } : {}),
      ...(request.reviewedUniswapV3 ? { reviewedUniswapV3: request.reviewedUniswapV3 } : {}),
      ...(request.reviewedAerodromeSlipstream
        ? { reviewedAerodromeSlipstream: request.reviewedAerodromeSlipstream }
        : {}),
    },
    prices: {
      decisionPriceUsd: request.decisionPriceUsd,
      quotePriceUsd: request.quotePriceUsd,
      quoteObservedAt: request.quoteObservedAt,
      quoteAgeSeconds: quote.ageSeconds,
      quoteDeviationBps: quote.deviationBps,
      chainlinkPriceUsd: oracle.priceUsd,
      chainlinkDeviationBps: oracle.deviationBps,
      redstonePriceUsd: redstoneReference.priceUsd,
      redstoneDeviationBps: redstoneReference.deviationBps,
      cexMedianPriceUsd: market.priceUsd,
      cexDeviationBps: market.deviationBps,
      cexSpreadBps: market.spreadBps,
    },
    evidence: {
      chainlink: oracle.evidence,
      redstone: redstoneReference.evidence,
      cex: market.evidence,
      dexManipulationCost: depth.evidence,
      ...(request.reviewedUniswapV3 ? { reviewedUniswapV3: reviewedDex.evidence } : {}),
      ...(request.reviewedAerodromeSlipstream
        ? { reviewedAerodromeSlipstream: reviewedAerodrome.evidence }
        : {}),
    },
    reasons,
    caveats: [
      'This checks the supplied price, venue quote, freshness, source agreement, and available DEX depth evidence. It does not by itself authorize or submit a transaction.',
      'This assessment is separate from the EIP-712 oracle safety attestation and may carry its own integrity signature.',
      'A fresh RedStone USD reference is an additional divergence check. Its absence or staleness does not by itself lower the assessment status; the API observation is not independently signature-verified here and may share upstream market venues with other sources.',
      'The per-asset venue quote is caller-supplied. In agent_begin_trade, the route quote is independently simulated against Ethereum mainnet state and committed with its block evidence; this does not guarantee a later transaction will execute at that price.',
      ...(quote.provenance
        ? [
            'Quote provenance is hash-only evidence retained by the caller. It binds the submitted quote to a source identifier and request/response digests, but does not authenticate the upstream provider or grant rights to redistribute upstream data.',
          ]
        : []),
      'DEX manipulation cost is a pool-depth proxy, not a route-specific quote, price-impact estimate, or guarantee that the pool can execute this trade.',
      ...(request.reviewedUniswapV3
        ? [
            'The reviewed concentrated-liquidity evidence is an exact-input Quoter V2 simulation at one pinned block for an admitted forward-direction pool. It does not simulate the caller’s signed transaction, other routes, MEV, or a later block.',
            'The quote-to-USD comparison treats the reviewed USDC or USDT output as a dollar-denominated venue quote; separate stablecoin and oracle evidence remains required.',
          ]
        : []),
      ...(request.reviewedAerodromeSlipstream
        ? [
            'The reviewed Aerodrome Slipstream evidence is an exact-input QuoterV2 simulation at one pinned block for the admitted Base WETH-to-USDC CL100 pool. It does not simulate the caller’s signed transaction, other routes, MEV, or a later block.',
            'The Aerodrome quote-to-USD comparison treats the reviewed USDC output as a dollar-denominated venue quote; separate stablecoin and oracle evidence remains required.',
          ]
        : []),
    ],
  };
}
