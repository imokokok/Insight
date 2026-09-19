import { SwitchboardClient } from '../clients/switchboard';
import { normalizeSwitchboardFeedId } from '../constants/switchboardConstants';

describe('SwitchboardClient', () => {
  it('normalizes Crossbar v2 feed hashes without double-prefixing', () => {
    expect(normalizeSwitchboardFeedId('883e')).toBe('0x883e');
    expect(normalizeSwitchboardFeedId('0x883e')).toBe('0x883e');
  });

  it('returns a terminal empty historical result instead of recursing', async () => {
    const client = new SwitchboardClient();

    try {
      await expect(client.getHistoricalPrices('ETH', undefined, 24)).resolves.toEqual([]);
    } finally {
      client.destroy();
    }
  });
});
