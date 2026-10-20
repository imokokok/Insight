import {
  customerEligibleMarketReferenceVenues,
  customerRawMarketReferenceDeliveryPermitted,
  evidenceRightsPermit,
  hasCustomerMarketReferenceRights,
  MARKET_REFERENCE_SOURCE_RIGHTS,
} from '../evidenceRights';

describe('evidence rights', () => {
  it('admits Kraken and the Solana sources for derived Insight analytics, never raw customer delivery', () => {
    expect(customerEligibleMarketReferenceVenues()).toEqual([
      'kraken',
      'dexscreener',
      'geckoterminal',
      'jupiter',
    ]);
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.coinbase)).toBe(false);
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.kraken)).toBe(true);
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.dexscreener)).toBe(true);
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.geckoterminal)).toBe(
      true
    );
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.jupiter)).toBe(true);
    expect(MARKET_REFERENCE_SOURCE_RIGHTS.dexscreener.deliveryPolicy).toBe(
      'derived-analytics-only'
    );
    expect(MARKET_REFERENCE_SOURCE_RIGHTS.geckoterminal.deliveryPolicy).toBe(
      'derived-analytics-only'
    );
    expect(MARKET_REFERENCE_SOURCE_RIGHTS.jupiter.deliveryPolicy).toBe('derived-analytics-only');
    expect(customerRawMarketReferenceDeliveryPermitted()).toBe(false);
  });

  it('does not treat a scope label without an agreement reference as customer rights', () => {
    expect(
      hasCustomerMarketReferenceRights({
        sourceId: 'coinbase',
        rightsScope: 'vendor-licensed',
        agreementReference: null,
        deliveryPolicy: 'not-authorized',
      })
    ).toBe(false);
    expect(
      hasCustomerMarketReferenceRights(
        {
          sourceId: 'coinbase',
          rightsScope: 'vendor-licensed',
          agreementReference: 'agreement-123',
          deliveryPolicy: 'raw-data-permitted',
          validUntil: '2026-10-13T06:00:00.000Z',
        },
        Date.parse('2026-10-13T06:00:01.000Z')
      )
    ).toBe(false);
  });

  it('permits synthetic evidence only in a staging evaluation', () => {
    expect(evidenceRightsPermit('synthetic', 'staging')).toBe(true);
    expect(evidenceRightsPermit('synthetic', 'customer')).toBe(false);
    expect(evidenceRightsPermit('research-quarantined', 'staging')).toBe(false);
    expect(evidenceRightsPermit('customer-authorized', 'customer')).toBe(true);
  });
});
