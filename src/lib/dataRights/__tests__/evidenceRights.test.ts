import {
  customerEligibleMarketReferenceVenues,
  evidenceRightsPermit,
  hasCustomerMarketReferenceRights,
  MARKET_REFERENCE_SOURCE_RIGHTS,
} from '../evidenceRights';

describe('evidence rights', () => {
  it('keeps the checked-in CEX register quarantined until a reviewed agreement is supplied', () => {
    expect(customerEligibleMarketReferenceVenues()).toEqual([]);
    expect(hasCustomerMarketReferenceRights(MARKET_REFERENCE_SOURCE_RIGHTS.coinbase)).toBe(false);
  });

  it('does not treat a scope label without an agreement reference as customer rights', () => {
    expect(
      hasCustomerMarketReferenceRights({
        sourceId: 'coinbase',
        rightsScope: 'vendor-licensed',
        agreementReference: null,
      })
    ).toBe(false);
    expect(
      hasCustomerMarketReferenceRights(
        {
          sourceId: 'coinbase',
          rightsScope: 'vendor-licensed',
          agreementReference: 'agreement-123',
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
