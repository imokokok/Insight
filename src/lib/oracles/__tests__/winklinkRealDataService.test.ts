import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { FailureMode } from '@/types/oracle/signals';

describe('WINkLinkRealDataService source timestamps', () => {
  const service = getWINkLinkRealDataService();
  const rpcSpy = jest.spyOn(service as never, 'callContractMethodWithRetry' as never);
  const feedAddress = 'TQoijQ1iZKRgJsAAWNPMu6amgtCJ3WMUV7';

  beforeEach(() => {
    service.clearCache();
    rpcSpy.mockReset();
    rpcSpy.mockImplementation(async (_address: string, method: string) => {
      if (method === 'decimals') return '0x8';
      if (method === 'latestAnswer') return '0x5f5e100';
      if (method === 'latestTimestamp') return null;
      return null;
    });
  });

  afterAll(() => {
    rpcSpy.mockRestore();
    service.destroy();
  });

  it('excludes a price with no source timestamp from oracle quorum', async () => {
    const price = await service.getPriceFromContract('BTC', undefined, undefined, feedAddress);

    expect(price).toMatchObject({
      metadataFallback: true,
      failureMode: FailureMode.FALLBACK_METADATA,
      countsTowardOracleQuorum: false,
      dataAge: Number.MAX_SAFE_INTEGER,
    });
    expect(price?.signalVector?.freshness).toBe(0);
  });

  it('keeps a timestamped source observation eligible for quorum', async () => {
    rpcSpy.mockImplementation(async (_address: string, method: string) => {
      if (method === 'decimals') return '0x8';
      if (method === 'latestAnswer') return '0x5f5e100';
      if (method === 'latestTimestamp') return `0x${Math.floor(Date.now() / 1000).toString(16)}`;
      return null;
    });

    const price = await service.getPriceFromContract('BTC', undefined, undefined, feedAddress);

    expect(price?.countsTowardOracleQuorum).toBe(true);
    expect(price?.dataAge).toBeLessThanOrEqual(1);
    expect(price?.metadataFallback).toBeUndefined();
  });
});
