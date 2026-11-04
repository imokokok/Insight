import {
  BASE_DEX_VENUE_IDS,
  baseDexVenueDefinition,
  isBaseDexVenueId,
  listBaseDexVenueDefinitions,
} from '../baseDexVenues';

describe('reviewed Base DEX deployment catalog', () => {
  it('contains only bounded Base venue ids and has code pins for every contract', () => {
    expect(BASE_DEX_VENUE_IDS).toEqual([
      'aerodrome-slipstream',
      'pancakeswap-v3',
      'curve-stableswap',
      'maverick-v2',
      'quickswap-v2',
      'quickswap-algebra-v4',
      'uniswap-v4',
      'pancakeswap-infinity',
    ]);
    for (const venue of listBaseDexVenueDefinitions()) {
      expect(isBaseDexVenueId(venue.id)).toBe(true);
      expect(venue.contracts.length).toBeGreaterThan(0);
      for (const contract of venue.contracts) {
        expect(contract.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(contract.codeHash).toMatch(/^0x[0-9a-f]{64}$/);
      }
    }
  });

  it('keeps dynamic implementations fail-closed for transaction preparation', () => {
    expect(baseDexVenueDefinition('uniswap-v4').capabilities.exactInputPreparation).toBe(
      'review-required'
    );
    expect(baseDexVenueDefinition('pancakeswap-infinity').capabilities.exactInputPreparation).toBe(
      'review-required'
    );
    expect(baseDexVenueDefinition('pancakeswap-v3').capabilities.exactInputPreparation).toBe(
      'available'
    );
  });
});
