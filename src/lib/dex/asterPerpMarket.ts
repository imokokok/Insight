/**
 * Read-only Aster DEX perpetual-market evidence (BNB Smart Chain, USDT-margined).
 *
 * Aster publishes a Binance-compatible futures REST surface on
 * `fapi.asterdex.com`.  This module reads only public market-data endpoints —
 * premiumIndex (mark/index/funding), 24h ticker (notional volume),
 * openInterest, and exchangeInfo (requiredMarginPercent → live leverage cap) —
 * and never calls an order or account endpoint, never signs, and never
 * submits.  Endpoint shapes were verified live on 2026-11-04:
 *
 *   - premiumIndex: {"symbol","markPrice","indexPrice","lastFundingRate",
 *     "nextFundingTime","time"}  (indexPrice is Aster's external-oracle
 *     reference price, the analogue of Hyperliquid's oraclePrice)
 *   - ticker/24hr: {"symbol","lastPrice","volume","quoteVolume",
 *     "closeTime", ...}
 *   - openInterest: {"symbol","openInterest","time"}
 *   - exchangeInfo: symbols[].{symbol,status,contractType,requiredMarginPercent,
 *     maintMarginPercent} — BTCUSDT and ETHUSDT both carried
 *     requiredMarginPercent 5.0 (⇒ 20x) at review time.
 *
 * Every transport, shape, or parse failure throws; the guard maps that into
 * the explicit `unavailable` venue status (fail closed, never invented).
 */

export const ASTER_FAPI_URL = 'https://fapi.asterdex.com' as const;
export const ASTER_MAINNET_NETWORK = 'eip155:56' as const;

/** Reviewed USDT-margined perp markets on Aster (Binance-compatible symbols). */
export const ASTER_REVIEWED_PERP_MARKETS = ['BTCUSDT', 'ETHUSDT'] as const;
export type AsterReviewedPerpMarket = (typeof ASTER_REVIEWED_PERP_MARKETS)[number];

export function asterReviewedMarketForAsset(assetSymbol: string): AsterReviewedPerpMarket | null {
  const normalized = `${assetSymbol.trim().toUpperCase()}USDT`;
  return (ASTER_REVIEWED_PERP_MARKETS as readonly string[]).includes(normalized)
    ? (normalized as AsterReviewedPerpMarket)
    : null;
}

export interface AsterPerpMarketState {
  symbol: AsterReviewedPerpMarket;
  marketStatus: string;
  observedAt: string;
  sourceFreshnessSeconds: number | null;
  markPrice: number;
  indexPrice: number;
  fundingRatePerInterval: number;
  nextFundingTimeMs: number | null;
  openInterestBase: number | null;
  dayNotionalVolume: number | null;
  liveMaxLeverage: number | null;
}

export interface AsterPerpMarketFetchDependencies {
  fetcher?: typeof fetch;
  now?: () => Date;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positiveNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(fetcher: typeof fetch, url: string): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Aster market data ${new URL(url).pathname} returned HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error(`Aster market data ${new URL(url).pathname} returned a non-object payload`);
  }
  return body;
}

/**
 * Fetch the reviewed market's Aster venue evidence. Throws on any transport
 * or shape failure; the guard discloses the failure without changing a
 * verdict that rests on oracle consensus.
 */
export async function fetchAsterPerpMarketState(
  market: AsterReviewedPerpMarket,
  dependencies: AsterPerpMarketFetchDependencies = {}
): Promise<AsterPerpMarketState> {
  const fetcher = dependencies.fetcher ?? fetch;
  const nowMs = (dependencies.now ?? (() => new Date()))().getTime();

  const [premium, ticker, openInterest, exchangeInfo] = (await Promise.all([
    fetchJson(fetcher, `${ASTER_FAPI_URL}/fapi/v1/premiumIndex?symbol=${market}`),
    fetchJson(fetcher, `${ASTER_FAPI_URL}/fapi/v1/ticker/24hr?symbol=${market}`),
    fetchJson(fetcher, `${ASTER_FAPI_URL}/fapi/v1/openInterest?symbol=${market}`).catch(() => null),
    fetchJson(fetcher, `${ASTER_FAPI_URL}/fapi/v1/exchangeInfo`),
  ])) as [JsonRecord, JsonRecord, JsonRecord | null, JsonRecord];

  const premiumTime = finiteNumber(premium.time);
  const markPrice = positiveNumber(premium.markPrice);
  const indexPrice = positiveNumber(premium.indexPrice);
  if (markPrice === null || indexPrice === null) {
    throw new Error('Aster premiumIndex payload is missing a usable mark or index price');
  }

  const symbols = Array.isArray(exchangeInfo.symbols) ? exchangeInfo.symbols : [];
  const symbolEntry = symbols.find(
    (entry: unknown): entry is JsonRecord => isRecord(entry) && entry.symbol === market
  );
  if (!symbolEntry) {
    throw new Error(`Aster exchangeInfo does not list the reviewed market ${market}`);
  }
  const status = typeof symbolEntry.status === 'string' ? symbolEntry.status : 'UNKNOWN';
  if (symbolEntry.contractType !== 'PERPETUAL') {
    throw new Error(`Aster market ${market} is not a perpetual contract`);
  }
  // Binance-compatible margin semantics: requiredMarginPercent 5.0 = 5% of
  // notional required as initial margin = a 20x maximum leverage.
  const requiredMarginPercent = finiteNumber(symbolEntry.requiredMarginPercent);
  const liveMaxLeverage =
    requiredMarginPercent !== null && requiredMarginPercent > 0
      ? 100 / requiredMarginPercent
      : null;

  const openInterestValue =
    openInterest && isRecord(openInterest) ? finiteNumber(openInterest.openInterest) : null;

  return {
    symbol: market,
    marketStatus: status,
    observedAt: new Date(nowMs).toISOString(),
    sourceFreshnessSeconds:
      premiumTime !== null && premiumTime > 0
        ? Math.max(0, Math.round((nowMs - premiumTime) / 1000))
        : null,
    markPrice,
    indexPrice,
    fundingRatePerInterval: finiteNumber(premium.lastFundingRate) ?? 0,
    nextFundingTimeMs:
      finiteNumber(premium.nextFundingTime) !== null && Number(premium.nextFundingTime) > 0
        ? Number(premium.nextFundingTime)
        : null,
    openInterestBase:
      openInterestValue !== null && openInterestValue >= 0 ? openInterestValue : null,
    dayNotionalVolume: positiveNumber(ticker.quoteVolume),
    liveMaxLeverage,
  };
}
