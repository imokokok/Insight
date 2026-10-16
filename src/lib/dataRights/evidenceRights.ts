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
] as const;

export type MarketReferenceVenue = (typeof MARKET_REFERENCE_VENUES)[number];

export interface MarketReferenceSourceRights {
  sourceId: MarketReferenceVenue;
  rightsScope: EvidenceRightsScope;
  /** Immutable reference to a reviewed written agreement when one exists. */
  agreementReference: string | null;
  /** Optional ISO expiry; an expired agreement fails closed. */
  validUntil?: string | null;
}

/**
 * No venue is customer-eligible until a reviewed written agreement is added
 * here. Environment variables may select a cadence but may never manufacture
 * a commercial data right.
 */
export const MARKET_REFERENCE_SOURCE_RIGHTS: Readonly<
  Record<MarketReferenceVenue, MarketReferenceSourceRights>
> = Object.freeze({
  coinbase: { sourceId: 'coinbase', rightsScope: 'research-quarantined', agreementReference: null },
  kraken: { sourceId: 'kraken', rightsScope: 'research-quarantined', agreementReference: null },
  gemini: { sourceId: 'gemini', rightsScope: 'research-quarantined', agreementReference: null },
  'crypto.com': {
    sourceId: 'crypto.com',
    rightsScope: 'research-quarantined',
    agreementReference: null,
  },
  bitstamp: { sourceId: 'bitstamp', rightsScope: 'research-quarantined', agreementReference: null },
  bitfinex: { sourceId: 'bitfinex', rightsScope: 'research-quarantined', agreementReference: null },
  binance: { sourceId: 'binance', rightsScope: 'research-quarantined', agreementReference: null },
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
