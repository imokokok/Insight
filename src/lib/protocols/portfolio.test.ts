import { buildCombinedPortfolio, type ProtocolHealthEntry } from './portfolio';
import type { PositionCriticalResult } from './protocolHealth';

function makeResult(opts: {
  collateral: number;
  borrow: number;
  critical: number;
  collateralSymbols: string[];
  skipped?: { symbol: string; reason: 'unsupported' | 'unknown_reserve' | 'reserve_metadata_unavailable' }[];
  bandUnknown?: boolean;
}): PositionCriticalResult {
  return {
    protocolId: 'x',
    protocolName: 'X',
    chain: 'ethereum',
    collaterals: opts.collateralSymbols.map((s) => ({
      symbol: s,
      amount: 1,
      price: 1,
      value: opts.collateral / opts.collateralSymbols.length,
      collateralFactor: 0.8,
      liquidationThreshold: 1.25,
      exchangeRate: 1,
    })),
    borrows: [{ symbol: 'USDC', amount: opts.borrow, price: 1, value: opts.borrow }],
    totalCollateralValue: opts.collateral,
    totalAdjustedCollateralValue: opts.collateral * 0.8,
    totalBorrowValue: opts.borrow,
    currentCollateralRatio: opts.collateral / opts.borrow,
    currentHealthFactor: opts.collateral / (opts.borrow * 1.25),
    assetDeviations: [],
    jointDeviation: {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: opts.critical,
      criticalPrice: 0,
      direction: 'down',
      description: '',
    },
    deviationRatios: {},
    worstDeviation: {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: opts.critical,
      criticalPrice: 0,
      direction: 'down',
      description: '',
    },
    pricePoints: [],
    safetyBuffer: {} as never,
    oracleWarnings: [],
    deviationScenarios: [],
    lastUpdated: 0,
    collateralSymbol: '',
    collateralAmount: 0,
    collateralPrice: 0,
    borrowSymbol: '',
    borrowAmount: 0,
    borrowPrice: 0,
    liquidationThreshold: 1.25,
    criticalDeviationPercent: opts.critical,
    criticalCollateralPrice: 0,
    liquidationPriceBand: {
      center: 100,
      lower: 90,
      upper: 110,
      adversePercent: 10,
      favorablePercent: 10,
      unknown: opts.bandUnknown ?? false,
    },
    skippedAssets: opts.skipped ?? [],
  } as unknown as PositionCriticalResult;
}

describe('buildCombinedPortfolio', () => {
  it('sums collateral / borrow and reports the first-to-break protocol', () => {
    const entries: ProtocolHealthEntry[] = [
      { protocolId: 'aave', name: 'Aave V3', chain: 'ethereum', result: makeResult({ collateral: 10000, borrow: 5000, critical: -28.3, collateralSymbols: ['ETH'] }) },
      { protocolId: 'compound', name: 'Compound V3', chain: 'ethereum', result: makeResult({ collateral: 8000, borrow: 4000, critical: -22.1, collateralSymbols: ['ETH', 'WBTC'] }) },
    ];

    const combined = buildCombinedPortfolio(entries);

    expect(combined.totalCollateralUsd).toBe(18000);
    expect(combined.totalBorrowUsd).toBe(9000);
    // Compound has the smaller absolute critical deviation → weakest / first to liquidate.
    expect(combined.combinedLiquidationDistancePercent).toBeCloseTo(22.1);
    expect(combined.weakestProtocolId).toBe('compound');
    expect(combined.weakestName).toBe('Compound V3');
  });

  it('flags correlated collateral exposure across protocols', () => {
    const entries: ProtocolHealthEntry[] = [
      { protocolId: 'aave', name: 'Aave V3', chain: 'ethereum', result: makeResult({ collateral: 10000, borrow: 5000, critical: -28.3, collateralSymbols: ['ETH', 'WBTC'] }) },
      { protocolId: 'compound', name: 'Compound V3', chain: 'ethereum', result: makeResult({ collateral: 8000, borrow: 4000, critical: -22.1, collateralSymbols: ['ETH', 'CBETH'] }) },
    ];

    const combined = buildCombinedPortfolio(entries);
    const eth = combined.correlations.find((c) => c.symbol === 'ETH');
    expect(eth).toBeDefined();
    expect(eth?.protocols.sort()).toEqual(['Aave V3', 'Compound V3']);
  });

  it('returns zeros when there are no entries', () => {
    const combined = buildCombinedPortfolio([]);
    expect(combined.totalCollateralUsd).toBe(0);
    expect(combined.combinedLiquidationDistancePercent).toBe(0);
    expect(combined.weakestProtocolId).toBeNull();
    expect(combined.correlations).toHaveLength(0);
  });
});
