import { z } from 'zod';

/**
 * Rights are a property of evidence, not an assertion made by a caller.  The
 * values below deliberately distinguish a customer's own licensed input from
 * a vendor feed licensed to Insight.  Neither may be silently promoted into a
 * shared data product.
 */
export const EvidenceRightsScopeSchema = z.enum([
  'synthetic',
  'onchain',
  'customer-authorized',
  'vendor-licensed',
  'research-quarantined',
]);

export type EvidenceRightsScope = z.infer<typeof EvidenceRightsScopeSchema>;
export type EvidenceUse = 'staging' | 'customer';

export function evidenceRightsPermit(scope: EvidenceRightsScope, use: EvidenceUse): boolean {
  switch (scope) {
    case 'synthetic':
      return use === 'staging';
    case 'onchain':
    case 'customer-authorized':
    case 'vendor-licensed':
      return true;
    case 'research-quarantined':
      return false;
  }
}

export const MARKET_REFERENCE_VENUES = [
  'coinbase',
  'kraken',
  'gemini',
  'crypto.com',
  'bitstamp',
  'bitfinex',
  'binance',
  'dexscreener',
  'geckoterminal',
  'jupiter',
] as const;

export type MarketReferenceVenue = (typeof MARKET_REFERENCE_VENUES)[number];

export interface MarketReferenceSourceRights {
  sourceId: MarketReferenceVenue;
  rightsScope: EvidenceRightsScope;
  /** Immutable reference to a reviewed written agreement when one exists. */
  agreementReference: string | null;
  /**
   * Whether a customer may receive the underlying venue data.  This is kept
   * separate from `rightsScope`: permission to collect a feed and produce an
   * Insight analysis does not, by itself, permit a raw-data product.
   */
  deliveryPolicy: MarketReferenceDeliveryPolicy;
  /** Optional ISO expiry; an expired agreement fails closed. */
  validUntil?: string | null;
}

/**
 * Delivery control recorded with every market-reference observation.
 *
 * `derived-analytics-only` permits Insight to collect, retain and use the
 * source for its assessments, but forbids exposing the underlying venue quote
 * or a queryable market-data feed to a customer or other third party.
 */
export type MarketReferenceDeliveryPolicy =
  | 'not-authorized'
  | 'derived-analytics-only'
  | 'raw-data-permitted';

/**
 * No venue is customer-eligible until a reviewed written permission is added
 * here. Environment variables may select a cadence but may never manufacture
 * a commercial data right. A customer-eligible source can still be restricted
 * to derived analytics rather than raw-data delivery.
 */
export const MARKET_REFERENCE_SOURCE_RIGHTS: Readonly<
  Record<MarketReferenceVenue, MarketReferenceSourceRights>
> = Object.freeze({
  coinbase: {
    sourceId: 'coinbase',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  kraken: {
    sourceId: 'kraken',
    rightsScope: 'vendor-licensed',
    // Kraken Support email, 2026-10-18 16:05 GMT-7 / 2026-10-19 07:05
    // Asia/Shanghai (Larry): API collection, storage,
    // display and analytics are permitted for Insight's own benefit without a
    // separate licence for this use case. It expressly forbids selling,
    // redistributing, sublicensing, publishing as a data service, or otherwise
    // making the underlying data available to third parties. Derived analytics
    // may be distributed. Reconfirm with Kraken before any scope expansion.
    agreementReference: 'kraken-support-email-2026-10-19-beijing-derived-analytics',
    deliveryPolicy: 'derived-analytics-only',
  },
  gemini: {
    sourceId: 'gemini',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  'crypto.com': {
    sourceId: 'crypto.com',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  bitstamp: {
    sourceId: 'bitstamp',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  bitfinex: {
    sourceId: 'bitfinex',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  binance: {
    sourceId: 'binance',
    rightsScope: 'research-quarantined',
    agreementReference: null,
    deliveryPolicy: 'not-authorized',
  },
  dexscreener: {
    sourceId: 'dexscreener',
    rightsScope: 'vendor-licensed',
    // DexScreener public token API (api.dexscreener.com), reviewed 2026-10:
    // free, unauthenticated, documented rate limits. The underlying prices are
    // derived from public on-chain DEX pools. Same derived-analytics boundary
    // as kraken: Insight may collect, retain and analyze, but raw venue quotes
    // must never be re-served as a market-data product. Reconfirm the public
    // terms before any scope expansion.
    agreementReference: 'dexscreener-public-api-terms-2026-10-derived-analytics',
    deliveryPolicy: 'derived-analytics-only',
  },
  geckoterminal: {
    sourceId: 'geckoterminal',
    rightsScope: 'vendor-licensed',
    // GeckoTerminal public API (api.geckoterminal.com), reviewed 2026-10: free
    // with documented rate limits and attribution expectations; prices are
    // derived from public on-chain DEX pools. Treated identically to
    // dexscreener: derived analytics only, raw delivery forbidden. The
    // published terms emphasize non-commercial use — reconfirm with the vendor
    // before any commercial delivery scope expansion.
    agreementReference: 'geckoterminal-public-api-terms-2026-10-derived-analytics',
    deliveryPolicy: 'derived-analytics-only',
  },
  jupiter: {
    sourceId: 'jupiter',
    rightsScope: 'vendor-licensed',
    // Jupiter Lite public price API (lite-api.jup.ag), reviewed 2026-10:
    // documented free tier (1 req/s, unauthenticated); prices aggregate
    // Solana DEX liquidity. Serves as the Solana market-reference baseline
    // alongside dexscreener and geckoterminal. The paid api.jup.ag host is
    // deliberately unused. Derived analytics only — raw venue quotes are
    // never re-served. Reconfirm the public terms before any scope expansion.
    agreementReference: 'jupiter-lite-api-terms-2026-10-derived-analytics',
    deliveryPolicy: 'derived-analytics-only',
  },
});

export function hasCustomerMarketReferenceRights(
  rights: MarketReferenceSourceRights,
  now = Date.now()
): boolean {
  if (rights.rightsScope !== 'vendor-licensed' || !rights.agreementReference?.trim()) return false;
  if (!rights.validUntil) return true;
  const validUntil = Date.parse(rights.validUntil);
  return Number.isFinite(validUntil) && validUntil > now;
}

export function customerEligibleMarketReferenceVenues(
  rights: Readonly<
    Record<MarketReferenceVenue, MarketReferenceSourceRights>
  > = MARKET_REFERENCE_SOURCE_RIGHTS,
  now = Date.now()
): MarketReferenceVenue[] {
  return MARKET_REFERENCE_VENUES.filter((venue) =>
    hasCustomerMarketReferenceRights(rights[venue], now)
  );
}

/**
 * A public market-reference endpoint would be a data-delivery surface, not a
 * derived Insight assessment. It is enabled only if every admitted vendor has
 * explicitly permitted raw customer delivery; a mixed rollup must fail closed
 * rather than accidentally disclose a derived-only source.
 */
export function customerRawMarketReferenceDeliveryPermitted(
  rights: Readonly<
    Record<MarketReferenceVenue, MarketReferenceSourceRights>
  > = MARKET_REFERENCE_SOURCE_RIGHTS,
  now = Date.now()
): boolean {
  const eligible = customerEligibleMarketReferenceVenues(rights, now);
  return (
    eligible.length > 0 &&
    eligible.every((venue) => rights[venue].deliveryPolicy === 'raw-data-permitted')
  );
}
