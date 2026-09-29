import {
  calculateAllStablecoinSnapshots,
  calculateStablecoinDepegSnapshot,
} from '@/lib/stablecoins/monitor';
import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';
import type { OracleProvider } from '@/types/oracle';

import {
  PositionSafetyRequestSchema,
  classifyOracleIssues,
  classifyOracleReputation,
  fetchLiveAssetDeviations,
  getPositionSymbols,
  mapPositionProviders,
} from '../positionSafetyShared';

jest.mock('@/lib/stablecoins/monitor', () => ({
  calculateAllStablecoinSnapshots: jest.fn(),
  calculateStablecoinDepegSnapshot: jest.fn(),
}));
jest.mock('@/lib/wrapped-assets/monitor', () => ({
  calculateAllWrappedAssetSnapshots: jest.fn(),
  calculateWrappedAssetSnapshot: jest.fn(),
}));

const allStable = calculateAllStablecoinSnapshots as jest.MockedFunction<
  typeof calculateAllStablecoinSnapshots
>;
const selectedStable = calculateStablecoinDepegSnapshot as jest.MockedFunction<
  typeof calculateStablecoinDepegSnapshot
>;
const allWrapped = calculateAllWrappedAssetSnapshots as jest.MockedFunction<
  typeof calculateAllWrappedAssetSnapshots
>;
const selectedWrapped = calculateWrappedAssetSnapshot as jest.MockedFunction<
  typeof calculateWrappedAssetSnapshot
>;

it('keeps multi-asset and legacy single-asset request validation aligned', () => {
  expect(
    PositionSafetyRequestSchema.safeParse({
      protocolId: 'aave-v3',
      collaterals: [{ symbol: 'ETH', amount: 2 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    }).success
  ).toBe(true);
  expect(
    PositionSafetyRequestSchema.safeParse({
      protocolId: 'aave-v3',
      collateralSymbol: 'ETH',
      collateralAmount: 2,
      borrowSymbol: 'USDC',
      borrowAmount: 1000,
    }).success
  ).toBe(true);
  expect(PositionSafetyRequestSchema.safeParse({ protocolId: 'aave-v3' }).success).toBe(false);
});

it('deduplicates symbols and groups them by the first matching protocol asset', () => {
  const input = {
    protocolId: 'aave-v3',
    collaterals: [{ symbol: 'ETH', amount: 2 }],
    borrows: [{ symbol: 'USDC', amount: 1000 }],
    collateralSymbol: 'ETH',
    collateralAmount: 2,
  };
  const symbols = getPositionSymbols(input);
  expect(symbols).toEqual(['ETH', 'USDC']);
  expect(
    mapPositionProviders(symbols, [
      { symbol: 'ETH', oracleProvider: 'chainlink' as OracleProvider },
      { symbol: 'USDC', oracleProvider: 'chainlink' as OracleProvider },
      { symbol: 'ETH', oracleProvider: 'pyth' as OracleProvider },
    ])
  ).toEqual([{ provider: 'chainlink', symbols: ['ETH', 'USDC'] }]);
  expect([39, 40, 59, 60, 79, 80].map(classifyOracleReputation)).toEqual([
    'critical',
    'degraded',
    'degraded',
    'fair',
    'fair',
    'healthy',
  ]);
});

it('preserves oracle warning precedence and threshold boundaries', () => {
  const { issues, messages } = classifyOracleIssues({
    freshness_score: 59.6,
    reliability_score: 59,
    avg_deviation_pct: 0.51,
    uptime_percentage: 94.9,
  } as never);
  expect(issues).toEqual([
    { type: 'freshness', value: 59.6 },
    { type: 'reliability', value: 59 },
    { type: 'deviation', value: 0.51 },
    { type: 'uptime', value: 94.9 },
  ]);
  expect(messages).toEqual([
    'Data freshness is low (60/100), price updates may be delayed',
    'Reliability score is degraded (59/100), price may deviate from market',
    'Average deviation from consensus is 0.51%, which may affect liquidation accuracy',
    'Uptime is 94.9%, oracle outages could delay liquidation protection',
  ]);
  expect(
    classifyOracleIssues({
      freshness_score: 60,
      reliability_score: 60,
      avg_deviation_pct: 0.5,
      uptime_percentage: 95,
    } as never)
  ).toEqual({ issues: [], messages: [] });
});

it('uses only requested nonzero deviations in the all-snapshot path', async () => {
  allStable.mockResolvedValue([
    { symbol: 'USDC', maxDeviationPercent: -0.8 },
    { symbol: 'DAI', maxDeviationPercent: 1.5 },
  ] as never);
  allWrapped.mockResolvedValue([{ symbol: 'WBTC', deviationPercent: 0 }] as never);
  await expect(fetchLiveAssetDeviations(['USDC', 'WBTC'])).resolves.toEqual({ USDC: -0.8 });
});

it('keeps a successful tracker result if the other tracker fails', async () => {
  const onError = jest.fn();
  allStable.mockRejectedValue(new Error('tracker unavailable'));
  allWrapped.mockResolvedValue([{ symbol: 'WBTC', deviationPercent: 1.2 }] as never);
  await expect(fetchLiveAssetDeviations(['WBTC'], 'all', onError)).resolves.toEqual({
    WBTC: 1.2,
  });
  expect(onError).toHaveBeenCalledTimes(1);
});

it('keeps selected snapshot failures isolated from successful position assets', async () => {
  selectedStable.mockResolvedValue({ symbol: 'USDC', maxDeviationPercent: -0.3 } as never);
  selectedWrapped.mockRejectedValue(new Error('wrapped feed unavailable'));
  await expect(fetchLiveAssetDeviations(['USDC', 'WBTC'], 'selected')).resolves.toEqual({
    USDC: -0.3,
  });
  expect(allStable).not.toHaveBeenCalled();
  expect(allWrapped).not.toHaveBeenCalled();
});
