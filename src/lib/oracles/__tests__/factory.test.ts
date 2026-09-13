import { ValidationError } from '@/lib/errors';
import { API3Client } from '@/lib/oracles/clients/api3';
import { OracleProvider } from '@/types/oracle';

import { getDefaultFactory } from '../factory';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/config/env', () => ({
  FEATURE_FLAGS: { useRealChainlinkData: true },
}));

jest.mock('@api3/contracts', () => ({
  computeCommunalApi3ReaderProxyV1Address: jest.fn(),
}));

describe('OracleClientFactory', () => {
  it('returns one default factory instance', () => {
    expect(getDefaultFactory()).toBe(getDefaultFactory());
  });

  it('creates and caches one client per provider', () => {
    const factory = getDefaultFactory();
    const first = factory.getClient(OracleProvider.API3);
    const second = factory.getClient(OracleProvider.API3);

    expect(first).toBeInstanceOf(API3Client);
    expect(second).toBe(first);
  });

  it('rejects unknown providers', () => {
    expect(() => getDefaultFactory().getClient('unknown' as OracleProvider)).toThrow(
      ValidationError
    );
  });
});
