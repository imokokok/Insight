import { SwitchboardClient } from '../clients/switchboard';

describe('SwitchboardClient', () => {
  it('returns a terminal empty historical result instead of recursing', async () => {
    const client = new SwitchboardClient();

    try {
      await expect(client.getHistoricalPrices('ETH', undefined, 24)).resolves.toEqual([]);
    } finally {
      client.destroy();
    }
  });
});
