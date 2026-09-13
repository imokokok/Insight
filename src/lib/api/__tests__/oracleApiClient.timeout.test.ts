import { OracleProvider } from '@/types/oracle';

import { getMultiOracleBatchTimeoutMs } from '../oracleApiClient';

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
