/**
 * Read-only Perpl perpetual-market evidence (Monad mainnet, AUSD-margined).
 *
 * Perpl is a fully on-chain CLOB perp DEX on Monad (chain 143). Its public
 * REST surface on `app.perpl.xyz/api` requires no authentication for market
 * data. This module reads exactly one public endpoint —
 * `GET /v1/pub/context` — which carries every market's configuration
 * (`config.is_open`, `price_decimals`, `size_decimals`, `initial_margin`),
 * live state (`state.orl` oracle / `state.mrk` mark / `state.oi` open
 * interest / `state.dva` daily volume), and the most recent funding event
 * (`funding.rate`, micros). Shapes verified live on 2026-11-05.
 *
 * Reviewed market identities come from Perpl's published mainnet market list
 * (docs.perpl.xyz): BTC=1, MON=10, ETH=20, SOL=31. Market 1 and 10 carry an
 * empty `symbol` field in the live payload, so identity binding is by
 * reviewed market id plus (when non-empty) symbol agreement; a mismatch
 * throws. Leverage caps are re-derived live from `initial_margin`
 * (Fraction in hundredths: 1500 ⇒ 15% initial margin ⇒ 6.67x max).
 *
 * Every transport, shape, or parse failure throws; the guard maps that into
 * the explicit `unavailable` venue status (fail closed, never invented).
 */

export const PERPL_API_URL = 'https://app.perpl.xyz/api' as const;
export const PERPL_MAINNET_NETWORK = 'eip155:143' as const;

/**
 * Reviewed AUSD-margined perp markets on Perpl, keyed by the asset symbol
 * Insight callers declare. Static caps are the conservative floor of the
 * live `initial_margin`-derived maximum at review time (2026-11-05: BTC
 * 1500 ⇒ 6.67x, ETH/SOL 1200 ⇒ 8.33x, MON 1000 ⇒ 10x). The guard always
 * re-binds to the freshly observed live value.
 */
export interface PerplReviewedMarket {
  readonly marketId: number;
  /** Perpl's listing symbol when it publishes one; null when the field is empty. */
  readonly venueSymbol: string | null;
  readonly maxLeverage: number;
}

export const PERPL_REVIEWED_MARKETS: Record<string, PerplReviewedMarket> = {
  BTC: { marketId: 1, venueSymbol: null, maxLeverage: 6 },
  MON: { marketId: 10, venueSymbol: null, maxLeverage: 10 },
  ETH: { marketId: 20, venueSymbol: 'ETH', maxLeverage: 8 },
  SOL: { marketId: 31, venueSymbol: 'SOL', maxLeverage: 8 },
} as const;

export function perplReviewedMarketForAsset(assetSymbol: string): PerplReviewedMarket | null {
  return PERPL_REVIEWED_MARKETS[assetSymbol.trim().toUpperCase()] ?? null;
}

export interface PerplPerpMarketState {
  symbol: string;
  marketId: number;
  marketStatus: string;
  observedAt: string;
  sourceFreshnessSeconds: number | null;
  markPrice: number;
  indexPrice: number;
  /** Fraction per funding interval; null while the market has no funding event yet. */
  fundingRatePerInterval: number | null;
  nextFundingTimeMs: number | null;
  openInterestBase: number | null;
  dayNotionalVolume: number | null;
  liveMaxLeverage: number | null;
}

export interface PerplPerpMarketFetchDependencies {
  fetcher?: typeof fetch;
  now?: () => Date;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

async function fetchJson(fetcher: typeof fetch, url: string): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Perpl market data ${new URL(url).pathname} returned HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error(`Perpl market data ${new URL(url).pathname} returned a non-object payload`);
  }
  return body;
}

/**
 * Fetch the reviewed market's Perpl venue evidence from the single public
 * context endpoint. Throws on any transport or shape failure; the guard
 * discloses the failure without changing a verdict that rests on oracle
 * consensus.
 */
export async function fetchPerplPerpMarketState(
  assetSymbol: string,
  dependencies: PerplPerpMarketFetchDependencies = {}
): Promise<PerplPerpMarketState> {
  const reviewed = perplReviewedMarketForAsset(assetSymbol);
  if (!reviewed) {
    throw new Error(`assetSymbol ${assetSymbol} is not a reviewed Perpl perp market`);
  }

  const fetcher = dependencies.fetcher ?? fetch;
  const nowMs = (dependencies.now ?? (() => new Date()))().getTime();

  const context = (await fetchJson(fetcher, `${PERPL_API_URL}/v1/pub/context`)) as JsonRecord;
  const markets = Array.isArray(context.markets) ? context.markets : [];
  const market = markets.find(
    (entry: unknown): entry is JsonRecord => isRecord(entry) && entry.id === reviewed.marketId
  );
  if (!market) {
    throw new Error(`Perpl context no longer lists reviewed market id ${reviewed.marketId}`);
  }

  // Notional amounts (daily volume, TVL) are decimal strings scaled by the
  // collateral token's decimals (AUSD: 6). Resolve the collateral scale from
  // the context itself instead of hard-coding it.
  const instances = Array.isArray(context.instances) ? context.instances : [];
  const collateralTokenId = isRecord(instances[0])
    ? finiteNumber(instances[0].collateral_token_id)
    : null;
  const tokens = Array.isArray(context.tokens) ? context.tokens : [];
  const collateralToken = tokens.find(
    (entry: unknown): entry is JsonRecord =>
      isRecord(entry) && collateralTokenId !== null && entry.id === collateralTokenId
  );
  const collateralDecimals = isRecord(collateralToken)
    ? finiteNumber(collateralToken.decimals)
    : null;
  const amountScale =
    collateralDecimals === null || collateralDecimals < 0 ? 1_000_000 : 10 ** collateralDecimals;

  const publishedSymbol = typeof market.symbol === 'string' ? market.symbol.trim() : '';
  if (
    reviewed.venueSymbol !== null &&
    publishedSymbol !== '' &&
    publishedSymbol.toUpperCase() !== reviewed.venueSymbol
  ) {
    throw new Error(
      `Perpl market id ${reviewed.marketId} now publishes symbol ${publishedSymbol}, reviewed as ${reviewed.venueSymbol}`
    );
  }

  const config = isRecord(market.config) ? market.config : {};
  const state = isRecord(market.state) ? market.state : {};
  const funding = isRecord(market.funding) ? market.funding : {};

  const priceDecimals = finiteNumber(config.price_decimals);
  const sizeDecimals = finiteNumber(config.size_decimals);
  const initialMargin = finiteNumber(config.initial_margin);
  const markScaled = positiveNumber(state.mrk);
  const indexScaled = positiveNumber(state.orl);
  if (
    priceDecimals === null ||
    initialMargin === null ||
    markScaled === null ||
    indexScaled === null
  ) {
    throw new Error(`Perpl market id ${reviewed.marketId} payload lacks usable config or prices`);
  }
  if (initialMargin <= 0) {
    throw new Error(`Perpl market id ${reviewed.marketId} carries a non-positive initial margin`);
  }

  const priceScale = 10 ** priceDecimals;
  const sizeScale = sizeDecimals === null ? null : 10 ** sizeDecimals;

  const stateAt = isRecord(state.at) ? state.at : {};
  const observedAtMs = finiteNumber(stateAt.t);
  const observedAt = new Date(observedAtMs ?? nowMs).toISOString();
  const sourceFreshnessSeconds =
    observedAtMs === null || Number.isNaN(observedAtMs)
      ? null
      : Math.max(0, Math.round((nowMs - observedAtMs) / 1_000));

  const fundingRateMicros = finiteNumber(funding.rate);
  const fundingAt = isRecord(funding.at) ? funding.at : {};
  const fundingAppliedAtMs = finiteNumber(fundingAt.t);
  const fundingIntervalSec = finiteNumber(market.funding_interval_sec);

  // initial_margin is a Fraction in hundredths (1500 = 15% ⇒ 6.67x max).
  const liveMaxLeverage = Math.floor(10_000 / initialMargin);

  const isOpen = config.is_open === true;

  return {
    symbol:
      reviewed.venueSymbol ??
      (publishedSymbol !== '' ? publishedSymbol.toUpperCase() : assetSymbol.trim().toUpperCase()),
    marketId: reviewed.marketId,
    marketStatus: isOpen ? 'TRADING' : 'CLOSED',
    observedAt,
    sourceFreshnessSeconds,
    markPrice: markScaled / priceScale,
    indexPrice: indexScaled / priceScale,
    fundingRatePerInterval: fundingRateMicros === null ? null : fundingRateMicros / 1_000_000,
    nextFundingTimeMs:
      fundingAppliedAtMs !== null && fundingIntervalSec !== null
        ? fundingAppliedAtMs + fundingIntervalSec * 1_000
        : null,
    openInterestBase:
      sizeScale === null || finiteNumber(state.oi) === null
        ? null
        : (finiteNumber(state.oi) as number) / sizeScale,
    dayNotionalVolume:
      finiteNumber(state.dva) === null ? null : (finiteNumber(state.dva) as number) / amountScale,
    liveMaxLeverage,
  };
}
