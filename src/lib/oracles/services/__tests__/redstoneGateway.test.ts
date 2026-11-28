import { DataPackage, NumericDataPoint, type SignedDataPackage } from '@redstone-finance/protocol';
import { getSignersForDataServiceId, requestDataPackages } from '@redstone-finance/sdk';

import {
  fetchRedStoneFeedCatalogue,
  fetchRedStoneFeedSnapshot,
  REDSTONE_AUTHENTICATED_GATEWAY_URL,
  REDSTONE_DATA_SERVICE_ID,
  REDSTONE_MAX_PACKAGE_AGE_MS,
} from '../redstoneGateway';

jest.mock('@redstone-finance/sdk', () => {
  const sdk = jest.requireActual('@redstone-finance/sdk');
  return {
    ...sdk,
    getSignersForDataServiceId: jest.fn(),
    requestDataPackages: jest.fn(),
  };
});

const mockGetSigners = jest.mocked(getSignersForDataServiceId);
const mockRequestPackages = jest.mocked(requestDataPackages);
const PRIVATE_KEYS = ['0x' + '11'.repeat(32), '0x' + '22'.repeat(32), '0x' + '33'.repeat(32)];

function makeSignedPackage(
  dataFeedId: string,
  value: number,
  timestampMilliseconds: number,
  privateKey: string
): SignedDataPackage {
  const dataPoint = new NumericDataPoint({ dataFeedId, value, decimals: 8 });
  return new DataPackage([dataPoint], timestampMilliseconds, dataFeedId).sign(privateKey);
}

describe('RedStone authenticated gateway service', () => {
  const originalApiKey = process.env.REDSTONE_GATEWAY_API_KEY;
  const originalAdminApiKey = process.env.REDSTONE_GATEWAY_ADMIN_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REDSTONE_GATEWAY_API_KEY = 'test-only-runtime-key';
    process.env.REDSTONE_GATEWAY_ADMIN_API_KEY = 'test-only-admin-key';
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.REDSTONE_GATEWAY_API_KEY;
    else process.env.REDSTONE_GATEWAY_API_KEY = originalApiKey;
    if (originalAdminApiKey === undefined) delete process.env.REDSTONE_GATEWAY_ADMIN_API_KEY;
    else process.env.REDSTONE_GATEWAY_ADMIN_API_KEY = originalAdminApiKey;
  });

  it('requires a gateway key before making any request', async () => {
    delete process.env.REDSTONE_GATEWAY_API_KEY;

    await expect(fetchRedStoneFeedSnapshot('BTC')).rejects.toThrow(
      'REDSTONE_GATEWAY_API_KEY is required'
    );
    expect(mockRequestPackages).not.toHaveBeenCalled();
  });

  it('requires a separate admin key before requesting the full catalogue', async () => {
    delete process.env.REDSTONE_GATEWAY_ADMIN_API_KEY;

    await expect(fetchRedStoneFeedCatalogue()).rejects.toThrow(
      'REDSTONE_GATEWAY_ADMIN_API_KEY is required'
    );
    expect(mockRequestPackages).not.toHaveBeenCalled();
  });

  it('uses the production gateway, official signer allowlist, signature checking, and 3-signer quorum', async () => {
    const timestamp = Date.now();
    const packages = [
      makeSignedPackage('BTC', 20, timestamp, PRIVATE_KEYS[0]),
      makeSignedPackage('BTC', 22, timestamp, PRIVATE_KEYS[1]),
      makeSignedPackage('BTC', 18, timestamp, PRIVATE_KEYS[2]),
    ];
    const signers = packages.map((signedPackage) => signedPackage.getSignerAddress());
    mockGetSigners.mockReturnValue(signers);
    mockRequestPackages.mockResolvedValue({ BTC: packages });

    const result = await fetchRedStoneFeedSnapshot('BTC');

    expect(result).toEqual({ dataFeedId: 'BTC', value: 20, timestampMilliseconds: timestamp });
    expect(mockRequestPackages).toHaveBeenCalledWith(
      expect.objectContaining({
        dataServiceId: REDSTONE_DATA_SERVICE_ID,
        dataPackagesIds: ['BTC'],
        uniqueSignersCount: 3,
        authorizedSigners: signers,
        maxTimestampDeviationMS: REDSTONE_MAX_PACKAGE_AGE_MS,
        authenticatedGateways: [
          { url: REDSTONE_AUTHENTICATED_GATEWAY_URL, apiKey: 'test-only-runtime-key' },
        ],
      })
    );
    const requestOptions = mockRequestPackages.mock.calls[0][0];
    expect(requestOptions.skipSignatureVerification).not.toBe(true);
  });

  it('does not return stale or future-dated values even if the SDK response is malformed', async () => {
    const stalePackages = PRIVATE_KEYS.map((key, index) =>
      makeSignedPackage('BTC', 20 + index, Date.now() - REDSTONE_MAX_PACKAGE_AGE_MS - 1, key)
    );
    mockGetSigners.mockReturnValue(
      stalePackages.map((signedPackage) => signedPackage.getSignerAddress())
    );
    mockRequestPackages.mockResolvedValue({ BTC: stalePackages });

    await expect(fetchRedStoneFeedSnapshot('BTC')).resolves.toBeNull();
  });

  it('retries a transient catalogue transport failure before returning verified feeds', async () => {
    const timestamp = Date.now();
    const packages = PRIVATE_KEYS.map((key, index) =>
      makeSignedPackage('BTC', 20 + index, timestamp, key)
    );
    mockGetSigners.mockReturnValue(
      packages.map((signedPackage) => signedPackage.getSignerAddress())
    );
    mockRequestPackages
      .mockRejectedValueOnce(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce({ BTC: packages });

    await expect(fetchRedStoneFeedCatalogue()).resolves.toMatchObject([
      { dataFeedId: 'BTC', timestampMilliseconds: timestamp },
    ]);
    expect(mockRequestPackages).toHaveBeenCalledTimes(2);
  });

  it('does not retry deterministic authenticated gateway client errors', async () => {
    const packages = PRIVATE_KEYS.map((key, index) =>
      makeSignedPackage('BTC', 20 + index, Date.now(), key)
    );
    mockGetSigners.mockReturnValue(
      packages.map((signedPackage) => signedPackage.getSignerAddress())
    );
    mockRequestPackages.mockRejectedValue(
      Object.assign(new Error('HTTP 403: Forbidden'), { response: { status: 403 } })
    );

    await expect(fetchRedStoneFeedCatalogue()).rejects.toThrow('HTTP 403: Forbidden');
    expect(mockRequestPackages).toHaveBeenCalledTimes(1);
  });

  it('filters stale feeds while leaving USD-denomination policy to discovery', async () => {
    const now = Date.now();
    const btcPackages = PRIVATE_KEYS.map((key, index) =>
      makeSignedPackage('BTC', 60_000 + index, now, key)
    );
    const crossRatePackages = PRIVATE_KEYS.map((key, index) =>
      makeSignedPackage('USDC/BRL', 5 + index / 100, now, key)
    );
    const stalePackages = [
      makeSignedPackage('OLD', 1, now - REDSTONE_MAX_PACKAGE_AGE_MS - 1, PRIVATE_KEYS[0]),
    ];
    mockGetSigners.mockReturnValue(
      [...btcPackages, ...crossRatePackages, ...stalePackages].map((signedPackage) =>
        signedPackage.getSignerAddress()
      )
    );
    mockRequestPackages.mockResolvedValue({
      BTC: btcPackages,
      'USDC/BRL': crossRatePackages,
      OLD: stalePackages,
    });

    const result = await fetchRedStoneFeedCatalogue();

    expect(result.map((snapshot) => snapshot.dataFeedId)).toEqual(['BTC', 'USDC/BRL']);
    expect(mockRequestPackages).toHaveBeenCalledWith(
      expect.objectContaining({
        returnAllPackages: true,
        authenticatedGateways: [
          { url: REDSTONE_AUTHENTICATED_GATEWAY_URL, apiKey: 'test-only-admin-key' },
        ],
      })
    );
    expect(mockRequestPackages.mock.calls[0][0].maxTimestampDeviationMS).toBeUndefined();
  });
});
