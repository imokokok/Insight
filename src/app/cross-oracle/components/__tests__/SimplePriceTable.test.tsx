import { render, screen, fireEvent } from '@testing-library/react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import { SimplePriceTable } from '../SimplePriceTable';

jest.mock('@/lib/config/colors', () => ({
  chartColors: {
    recharts: { primary: '#3B82F6' },
    oracle: {
      chainlink: '#2563EB',
      pyth: '#7C3AED',
    },
  },
}));

jest.mock('@/lib/oracles/utils/performanceMetricsConfig', () => ({
  getProviderDefaults: (_provider: string) => ({
    reliability: 95,
    responseTime: 300,
    dataSources: 5,
  }),
}));

jest.mock('@/lib/utils/format', () => ({
  formatPrice: (price: number) => `$${price.toLocaleString()}`,
  formatRelativeTime: (_timestamp: number) => 'Just now',
}));

jest.mock('../../constants', () => ({
  oracleNames: {
    chainlink: 'Chainlink',
    pyth: 'Pyth',
  },
  calculateZScore: (price: number, avg: number, std: number) => (std > 0 ? (price - avg) / std : 0),
  ANOMALY_ZSCORE_THRESHOLD: 2,
}));

jest.mock('../../thresholds', () => ({
  ANOMALY_DEVIATION_THRESHOLD: 1.0,
  SEVERITY_THRESHOLDS: { HIGH: 3.0, MEDIUM: 1.0 },
  FRESHNESS_THRESHOLDS: { FRESH: 30, NORMAL: 60, DELAYED: 120, SEVERELY_DELAYED: 300 },
  CONFIDENCE_THRESHOLDS: { LOW: 0.5, MEDIUM: 0.8 },
}));

jest.mock('../price-comparison/ConfidenceBar', () => ({
  ConfidenceBar: ({ confidence }: { confidence: number }) => (
    <div data-testid="confidence-bar">{confidence}%</div>
  ),
}));

const mockPriceData: PriceData[] = [
  {
    provider: 'chainlink' as OracleProvider,
    symbol: 'BTC',
    price: 50000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.99,
  },
  {
    provider: 'pyth' as OracleProvider,
    symbol: 'BTC',
    price: 50100,
    timestamp: Date.now() - 1000,
    decimals: 8,
    confidence: 0.98,
  },
];

describe('SimplePriceTable', () => {
  const mockProps = {
    priceData: mockPriceData,
    medianPrice: 50050,
    isLoading: false,
    statusFilter: 'all' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render price table with data', () => {
    render(<SimplePriceTable {...mockProps} />);

    expect(screen.getByText('Chainlink')).toBeInTheDocument();
    expect(screen.getByText('Pyth')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<SimplePriceTable {...mockProps} isLoading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<SimplePriceTable {...mockProps} priceData={[]} />);

    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('should show oracle count in footer', () => {
    render(<SimplePriceTable {...mockProps} />);

    expect(screen.getByText(/Showing 2 \/ 2 oracles/)).toBeInTheDocument();
  });

  it('should filter by status', () => {
    render(<SimplePriceTable {...mockProps} statusFilter="critical" />);

    expect(screen.getByText(/Showing 0 \/ 2 oracles/)).toBeInTheDocument();
  });

  it('should toggle expand row on click', () => {
    render(<SimplePriceTable {...mockProps} />);

    const expandButtons = screen.getAllByTitle('Expand details');
    expect(expandButtons).toHaveLength(2);

    fireEvent.click(expandButtons[0]);

    expect(screen.getByTitle('Collapse details')).toBeInTheDocument();
  });

  it('should render with zscore anomaly detection mode', () => {
    render(
      <SimplePriceTable
        {...mockProps}
        anomalyDetectionMode="zscore"
        avgPrice={50050}
        standardDeviation={50}
      />
    );

    expect(screen.getByText('Z-score mode')).toBeInTheDocument();
  });

  it('should default to deviation anomaly detection mode', () => {
    render(<SimplePriceTable {...mockProps} />);

    expect(screen.queryByText('Z-score mode')).not.toBeInTheDocument();
  });

  it('should display anomalies count', () => {
    const anomalies = [
      {
        provider: 'chainlink' as OracleProvider,
        price: 50000,
        deviationPercent: 1.5,
        severity: 'low' as const,
        reasonKeys: ['test'],
        timestamp: Date.now(),
        freshnessSeconds: 5,
      },
    ];

    render(<SimplePriceTable {...mockProps} anomalies={anomalies} />);

    expect(screen.getByText('1 anomalies detected')).toBeInTheDocument();
  });
});
