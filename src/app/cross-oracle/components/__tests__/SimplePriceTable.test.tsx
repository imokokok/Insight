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

jest.mock('@/lib/constants', () => ({
  chainNames: {
    ethereum: 'Ethereum',
    arbitrum: 'Arbitrum',
  },
  chainColors: {
    ethereum: '#627EEA',
    arbitrum: '#28A0F0',
  },
  oracleColors: {
    chainlink: '#2563EB',
    pyth: '#7C3AED',
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

  it('should show oracle count in footer', () => {
    render(<SimplePriceTable {...mockProps} />);

    expect(screen.getByText(/2 oracles/i)).toBeInTheDocument();
  });

  it('should toggle expand row on click', () => {
    render(<SimplePriceTable {...mockProps} />);

    const firstRow = screen.getByText('Chainlink').closest('tr');
    if (firstRow) {
      fireEvent.click(firstRow);
    }
  });

  it('should show loading state', () => {
    render(<SimplePriceTable {...mockProps} isLoading={true} />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<SimplePriceTable {...mockProps} priceData={[]} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should filter by status', () => {
    const { rerender } = render(<SimplePriceTable {...mockProps} statusFilter="all" />);

    expect(screen.getByText('Chainlink')).toBeInTheDocument();
    expect(screen.getByText('Pyth')).toBeInTheDocument();

    rerender(<SimplePriceTable {...mockProps} statusFilter="normal" />);
  });
});
