import { render, screen, fireEvent, act } from '@testing-library/react';

import type { PositionCriticalResult, PositionInput } from '@/lib/protocols/protocolHealth';

import { ResultDashboard } from './ResultDashboard';

// Mock the heavy / network-touching children so the test isolates the new
// live-refresh bar and its wiring without rendering charts or firing fetches.
jest.mock('./RiskChart', () => ({ RiskChart: () => null }));
jest.mock('./LendingSafetySection', () => ({ LendingSafetySection: () => null }));
jest.mock('./SafetyPlannerPanel', () => ({ SafetyPlannerPanel: () => null }));
jest.mock('./SafetyBufferBreakdown', () => ({ SafetyBufferBreakdown: () => null }));
jest.mock('./CircularGauge', () => ({ CircularGauge: () => null }));
jest.mock('./CountUp', () => ({ CountUp: () => null }));

const POSITION: PositionInput = {
  protocolId: 'aave-v3-eth',
  collaterals: [{ symbol: 'ETH', amount: 1 }],
  borrows: [{ symbol: 'USDC', amount: 1000 }],
};

const RESULT: PositionCriticalResult = {
  protocolId: 'aave-v3-eth',
  protocolName: 'Aave V3',
  chain: 'ethereum',
  collaterals: [],
  borrows: [],
  totalCollateralValue: 0,
  totalAdjustedCollateralValue: 0,
  totalBorrowValue: 0,
  currentCollateralRatio: 0,
  currentHealthFactor: 1.5,
  assetDeviations: [],
  jointDeviation: {
    symbol: 'JOINT',
    criticalDeviationPercent: -40,
    criticalPrice: 0,
    direction: 'down',
    description: '',
  },
  deviationRatios: {},
  worstDeviation: {
    symbol: 'ETH',
    criticalDeviationPercent: -40,
    criticalPrice: 0,
    direction: 'down',
    description: '',
  },
  pricePoints: [],
  safetyBuffer: {
    overallLevel: 'safe',
    bufferPercent: 0,
    theoreticalBufferPercent: 0,
    oracleAvgDeviationPercent: 0,
    liveDepegRiskPercent: 0,
    liveDepegBreakdown: {},
    bandHalfWidthPercent: 0,
    bandUnknown: false,
    description: '',
    recommendations: [],
  },
  oracleWarnings: [],
  deviationScenarios: [],
  lastUpdated: Date.now(),
  collateralSymbol: 'ETH',
  collateralAmount: 1,
  collateralPrice: 0,
  borrowSymbol: 'USDC',
  borrowAmount: 1000,
  borrowPrice: 0,
  liquidationThreshold: 1.2,
  criticalDeviationPercent: -40,
  criticalCollateralPrice: 0,
  liquidationPriceBand: {
    center: 0,
    lower: 0,
    upper: 0,
    adversePercent: 0,
    favorablePercent: 0,
    unknown: false,
  },
} as PositionCriticalResult;

describe('ResultDashboard live refresh bar', () => {
  it('renders the Live prices bar and triggers onRefresh on click', async () => {
    const onRefresh = jest.fn();
    await act(async () => {
      render(
        <ResultDashboard
          result={RESULT}
          position={POSITION}
          onReset={jest.fn()}
          onRefresh={onRefresh}
          isRefreshing={false}
          lastRefreshedAt={Date.now()}
          prevSnapshot={{ hf: 1.5, critical: 40 }}
          refreshError={null}
        />
      );
    });

    expect(screen.getByText(/Live prices/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables the Refresh button while refreshing', async () => {
    await act(async () => {
      render(
        <ResultDashboard
          result={RESULT}
          position={POSITION}
          onReset={jest.fn()}
          onRefresh={jest.fn()}
          isRefreshing
          lastRefreshedAt={Date.now()}
          prevSnapshot={null}
          refreshError={null}
        />
      );
    });
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeDisabled();
  });

  it('shows the refresh-failed notice when refreshError is set', async () => {
    await act(async () => {
      render(
        <ResultDashboard
          result={RESULT}
          position={POSITION}
          onReset={jest.fn()}
          onRefresh={jest.fn()}
          isRefreshing={false}
          lastRefreshedAt={Date.now()}
          prevSnapshot={null}
          refreshError="timeout"
        />
      );
    });
    expect(screen.getByText(/refresh failed/i)).toBeInTheDocument();
  });
});
