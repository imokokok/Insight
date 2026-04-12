

import { GET, getServerConfig } from '../route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('/api/config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return public config successfully', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('config');
  });

  it('should return features config', async () => {
    const response = await GET();

    expect(response.data.config).toHaveProperty('features');
    expect(response.data.config.features).toHaveProperty('useRealWinklinkData');
    expect(response.data.config.features).toHaveProperty('useRealChainlinkData');
  });

  it('should return cache config', async () => {
    const response = await GET();

    expect(response.data.config).toHaveProperty('cache');
    expect(response.data.config.cache).toHaveProperty('winklinkTtl');
    expect(response.data.config.cache).toHaveProperty('umaTtl');
  });

  it('should return api3 config', async () => {
    const response = await GET();

    expect(response.data.config).toHaveProperty('api3');
    expect(response.data.config.api3).toHaveProperty('marketApiUrl');
    expect(response.data.config.api3).toHaveProperty('daoApiUrl');
  });

  it('should return tron public config', async () => {
    const response = await GET();

    expect(response.data.config).toHaveProperty('tron');
    expect(response.data.config.tron).toHaveProperty('rpcUrl');
  });

  it('should not expose sensitive config', async () => {
    const response = await GET();

    expect(response.data.config).not.toHaveProperty('alchemy');
    expect(response.data.config).not.toHaveProperty('thegraph');
  });
});

describe('getServerConfig', () => {
  it('should return server config with alchemy endpoints', () => {
    const config = getServerConfig();

    expect(config).toHaveProperty('alchemy');
    expect(config.alchemy).toHaveProperty('ethereum');
    expect(config.alchemy).toHaveProperty('arbitrum');
  });

  it('should return server config with features', () => {
    const config = getServerConfig();

    expect(config).toHaveProperty('features');
    expect(config.features).toHaveProperty('useRealWinklinkData');
  });

  it('should return server config with cache settings', () => {
    const config = getServerConfig();

    expect(config).toHaveProperty('cache');
    expect(config.cache).toHaveProperty('winklinkTtl');
  });
});
