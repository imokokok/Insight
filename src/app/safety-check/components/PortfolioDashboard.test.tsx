import { render, screen, fireEvent } from '@testing-library/react';

import type { ProtocolDetection } from '@/lib/protocols/detection';
import type { ProtocolHealthEntry } from '@/lib/protocols/portfolio';
import type { PositionCriticalResult } from '@/lib/protocols/protocolHealth';

import { PortfolioDashboard } from './PortfolioDashboard';

const mockHealth = {
  entries: [] as ProtocolHealthEntry[],
  isLoading: false,
  error: null,
  refreshError: null,
  computeAll: jest.fn(),
  refresh: jest.fn(),
  clear: jest.fn(),
};

jest.mock('../hooks/usePortfolioHealth', () => ({
  usePortfolioHealth: () => mockHealth,
}));

function result(critical: number, collateralSymbols: string[]): PositionCriticalResult {
  return {
    protocolId: 'x',
    protocolName: 'X',
    chain: 'ethereum',
    collaterals: collateralSymbols.map((s) => ({
      symbol: s,
      amount: 1,
      price: 1,
      value: 5000,
      collateralFactor: 0.8,
      liquidationThreshold: 1.25,
      exchangeRate: 1,
    })),
    borrows: [{ symbol: 'USDC', amount: 1000, price: 1, value: 1000 }],
    totalCollateralValue: 10000,
    totalAdjustedCollateralValue: 8000,
    totalBorrowValue: 5000,
    currentCollateralRatio: 2,
    currentHealthFactor: 1.6,
    assetDeviations: [],
    jointDeviation: {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: critical,
      criticalPrice: 0,
      direction: 'down',
      description: '',
    },
    deviationRatios: {},
    worstDeviation: {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: critical,
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
    criticalDeviationPercent: critical,
    criticalCollateralPrice: 0,
    liquidationPriceBand: {
      center: 100,
      lower: 90,
      upper: 110,
      adversePercent: 10,
      favorablePercent: 10,
      unknown: false,
    },
    skippedAssets: [],
  } as unknown as PositionCriticalResult;
}

const detections: ProtocolDetection[] = [
  {
    protocolId: 'aave-v3-ethereum',
    name: 'Aave V3',
    chain: 'ethereum',
    supported: true,
    hasPosition: true,
    position: null,
    skippedAssets: [],
    error: null,
  },
  {
    protocolId: 'compound-v3-ethereum',
    name: 'Compound V3',
    chain: 'ethereum',
    supported: true,
    hasPosition: true,
    position: null,
    skippedAssets: [],
    error: null,
  },
];

describe('PortfolioDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealth.entries = [
      {
        protocolId: 'aave-v3-ethereum',
        name: 'Aave V3',
        chain: 'ethereum',
        result: result(-28.3, ['ETH']),
      },
      {
        protocolId: 'compound-v3-ethereum',
        name: 'Compound V3',
        chain: 'ethereum',
        result: result(-22.1, ['ETH']),
      },
    ];
    mockHealth.isLoading = false;
    mockHealth.error = null;
  });

  it('renders the combined guard with weakest protocol and correlated exposure', () => {
    render(<PortfolioDashboard detections={detections} onReset={jest.fn()} />);

    expect(screen.getByText(/Portfolio Liquidation Guard/i)).toBeInTheDocument();
    // Combined liquidation distance = min absolute critical = 22.1% (also shown
    // on the Compound card, so assert at least one occurrence).
    expect(screen.getAllByText(/22\.1%/).length).toBeGreaterThanOrEqual(1);
    // Weakest protocol = Compound V3 (appears in both the combined card and its own card).
    expect(screen.getAllByText('Compound V3').length).toBeGreaterThanOrEqual(1);
    // ETH correlated across both protocols
    expect(screen.getByText(/相关性风险/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ETH/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders a per-protocol card for each detected position', () => {
    render(<PortfolioDashboard detections={detections} onReset={jest.fn()} />);
    // Two "HF" labels (one per card)
    expect(screen.getAllByText(/^HF /).length).toBe(2);
  });

  it('triggers refresh when the Refresh button is clicked', () => {
    render(<PortfolioDashboard detections={detections} onReset={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(mockHealth.refresh).toHaveBeenCalledTimes(1);
  });

  it('shows a helpful message when there are no complete positions', () => {
    mockHealth.entries = [];
    render(<PortfolioDashboard detections={detections} onReset={jest.fn()} />);
    expect(screen.getByText(/没有可用于压力测试的完整仓位/i)).toBeInTheDocument();
  });
});
