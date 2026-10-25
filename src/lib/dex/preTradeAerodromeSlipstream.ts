import { parseUnits } from 'viem';

import {
  AERODROME_SLIPSTREAM_CHAIN_ID,
  aerodromeSlipstreamWethUsdcProfile,
  getAerodromeSlipstreamMarketSnapshotForProfile,
  type AerodromeSlipstreamRpcClient,
  type AerodromeSlipstreamMarketProfile,
  type AerodromeSlipstreamMarketSnapshot,
} from './aerodromeSlipstream';

export type ReviewedAerodromeSlipstreamPreTradeProfile =
  'base-aerodrome-slipstream-weth-usdc-cl100';

export interface ReviewedAerodromeSlipstreamPreTradeRequest {
  chainId: number;
  asset: string;
  destinationAsset: string | undefined;
  /** Exact WETH input in human-readable decimal units. */
  amountIn: string;
}

export interface ReviewedAerodromeSlipstreamPreTradeEvidence {
  profile: ReviewedAerodromeSlipstreamPreTradeProfile;
  venue: 'aerodrome-slipstream';
  market: string;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: AerodromeSlipstreamMarketSnapshot['block'];
  contracts: Pick<
    AerodromeSlipstreamMarketSnapshot['contracts'],
    'factory' | 'quoterV2' | 'pool' | 'tickSpacing' | 'feePips'
  >;
  quote: AerodromeSlipstreamMarketSnapshot['quotes'][number];
  spotToken1PerToken0: number;
  twapToken1PerToken0: number;
  twapDeviationBpsFromSpot: number;
}

const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

function normalized(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function selectProfile(request: ReviewedAerodromeSlipstreamPreTradeRequest): {
  profile: ReviewedAerodromeSlipstreamPreTradeProfile;
  definition: AerodromeSlipstreamMarketProfile;
} | null {
  if (
    request.chainId === AERODROME_SLIPSTREAM_CHAIN_ID &&
    normalized(request.asset) === 'WETH' &&
    normalized(request.destinationAsset) === 'USDC'
  ) {
    return {
      profile: 'base-aerodrome-slipstream-weth-usdc-cl100',
      definition: aerodromeSlipstreamWethUsdcProfile(),
    };
  }
  return null;
}

function exactAmountInRaw(amountIn: string, decimals: number): bigint {
  if (!DECIMAL_AMOUNT.test(amountIn)) {
    throw new Error(
      'Reviewed Aerodrome Slipstream amountIn must be a positive decimal amount without exponent notation.'
    );
  }
  try {
    const raw = parseUnits(amountIn, decimals);
    if (raw <= 0n) throw new Error('non-positive');
    return raw;
  } catch {
    throw new Error(
      'Reviewed Aerodrome Slipstream amountIn is outside the supported token precision.'
    );
  }
}

/**
 * Quote the exact user-declared WETH amount against the one reviewed
 * Aerodrome Slipstream Base pool. It neither prepares a transaction nor
 * accepts arbitrary pools, routers, directions, or multi-hop paths.
 */
export async function getReviewedAerodromeSlipstreamPreTradeEvidence(
  request: ReviewedAerodromeSlipstreamPreTradeRequest,
  options: {
    rpc?: AerodromeSlipstreamRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<ReviewedAerodromeSlipstreamPreTradeEvidence> {
  const selected = selectProfile(request);
  if (!selected) {
    throw new Error(
      'No reviewed Aerodrome Slipstream pre-trade profile matches this chain and route.'
    );
  }
  const rawAmount = exactAmountInRaw(request.amountIn, selected.definition.token0.decimals);
  const snapshot = await getAerodromeSlipstreamMarketSnapshotForProfile(
    {
      ...selected.definition,
      // This identity can never collide with a whole-token market snapshot.
      // Cache is disabled below because amountIn is per-request, untrusted
      // input after strict parsing and must not create retained cache keys.
      id: `${selected.definition.id}-pretrade-${rawAmount.toString()}`,
      quoteAmountsToken0: undefined,
      quoteAmountsToken0Raw: [rawAmount],
    },
    { ...options, cache: false }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('Reviewed Aerodrome Slipstream quote was absent.');

  return {
    profile: selected.profile,
    venue: snapshot.venue,
    market: snapshot.market,
    sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
    observedAt: snapshot.observedAt,
    block: snapshot.block,
    contracts: {
      factory: snapshot.contracts.factory,
      quoterV2: snapshot.contracts.quoterV2,
      pool: snapshot.contracts.pool,
      tickSpacing: snapshot.contracts.tickSpacing,
      feePips: snapshot.contracts.feePips,
    },
    quote,
    spotToken1PerToken0: snapshot.spot.token1PerToken0,
    twapToken1PerToken0: snapshot.twap.token1PerToken0,
    twapDeviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
  };
}
