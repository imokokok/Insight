import { BandClient } from '@/lib/oracles/clients/band';
import { getBandSignalId, parseBandSignalId } from '@/lib/oracles/constants/bandConstants';
import { Blockchain, OracleProvider, OracleServiceError } from '@/types/oracle';

const NOW_SECONDS = 1_789_928_600;

function response(input: {
  status?: string;
  signalId?: string;
  price?: string;
  timestamp?: number;
}): Response {
  return Response.json({
    price: {
      status: input.status ?? 'PRICE_STATUS_AVAILABLE',
      signal_id: input.signalId ?? 'CS:BTC-USD',
      price: input.price ?? '81181558344838',
      timestamp: String(input.timestamp ?? NOW_SECONDS - 5),
    },
  });
}

function clientWith(result: Response) {
  return new BandClient({
    now: () => NOW_SECONDS * 1000,
    fetchImpl: jest.fn().mockResolvedValue(result),
  });
}

describe('BandClient', () => {
  it('normalizes an available, fresh BandChain v3 price', async () => {
    const client = clientWith(response({}));
    const price = await client.getPrice('BTC', Blockchain.BANDCHAIN);

    expect(price.provider).toBe(OracleProvider.BAND);
    expect(price.chain).toBe(Blockchain.BANDCHAIN);
    expect(price.price).toBeCloseTo(81_181.558344838, 8);
    expect(price.timestamp).toBe((NOW_SECONDS - 5) * 1000);
    expect(price.dataAge).toBe(5);
    expect(price.feedId).toBe('CS:BTC-USD');
    expect(price.verificationLevel).toBe('unsigned');
    expect(price.verification?.sourceTimestamp).toBe(NOW_SECONDS - 5);
    client.destroy();
  });

  it('preserves source age for the shared freshness and coverage policies', async () => {
    const client = clientWith(response({ timestamp: NOW_SECONDS - 7_200 }));
    await expect(client.getPrice('BTC')).resolves.toMatchObject({ dataAge: 7_200 });
    client.destroy();
  });

  it('rejects unavailable, malformed, and implausibly future readings', async () => {
    const unavailable = clientWith(response({ status: 'PRICE_STATUS_NOT_READY' }));
    await expect(unavailable.getPrice('BTC')).rejects.toBeInstanceOf(OracleServiceError);
    unavailable.destroy();

    const malformed = clientWith(response({ price: 'not-a-number' }));
    await expect(malformed.getPrice('BTC')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    malformed.destroy();

    const future = clientWith(response({ timestamp: NOW_SECONDS + 301 }));
    await expect(future.getPrice('BTC')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    future.destroy();
  });

  it('rejects unsupported symbols and never relabels BandChain evidence', async () => {
    const client = clientWith(response({}));
    await expect(client.getPrice('NOTREAL')).rejects.toMatchObject({
      code: 'SYMBOL_NOT_SUPPORTED',
    });
    await expect(client.getPrice('BTC', Blockchain.ETHEREUM)).resolves.toMatchObject({
      chain: Blockchain.BANDCHAIN,
    });
    client.destroy();
  });
});

describe('Band signal IDs', () => {
  it('uses the live v3 namespaces for crypto, fiat, and gold', () => {
    expect(getBandSignalId('ETH')).toBe('CS:ETH-USD');
    expect(getBandSignalId('EUR')).toBe('FS:EUR-USD');
    expect(getBandSignalId('XAU')).toBe('FS:XAU-USD');
    expect(parseBandSignalId('CS:SOL-USD')).toEqual({ symbol: 'SOL', quote: 'USD' });
    expect(parseBandSignalId('invalid')).toBeNull();
  });
});
