import { OracleProvider } from '@/types/oracle';

import { getCrossChainBatchTimeoutMs, getMultiOracleBatchTimeoutMs } from '../oracleApiClient';

describe('getMultiOracleBatchTimeoutMs', () => {
  it('uses the slowest provider rather than the first provider', () => {
    const forward = getMultiOracleBatchTimeoutMs([OracleProvider.CHAINLINK, OracleProvider.DIA]);
    const reversed = getMultiOracleBatchTimeoutMs([OracleProvider.DIA, OracleProvider.CHAINLINK]);

    expect(forward).toBe(30_000);
    expect(reversed).toBe(forward);
  });

  it('accounts for bounded-concurrency execution waves', () => {
    const providers = [
      OracleProvider.CHAINLINK,
      OracleProvider.API3,
      OracleProvider.DIA,
      OracleProvider.WINKLINK,
      OracleProvider.REDSTONE,
      OracleProvider.SUPRA,
    ];

    expect(getMultiOracleBatchTimeoutMs(providers)).toBe(55_000);
  });
});

describe('getCrossChainBatchTimeoutMs', () => {
  it('accounts for every bounded-concurrency chain wave', () => {
    expect(getCrossChainBatchTimeoutMs(OracleProvider.FLARE, 16)).toBe(53_000);
  });

  it('keeps a buffer for a single chain request', () => {
    expect(getCrossChainBatchTimeoutMs(OracleProvider.CHAINLINK, 1)).toBe(15_000);
  });
});
