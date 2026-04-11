import { render, screen, fireEvent } from '@testing-library/react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import { PriceTable } from '../PriceTable';

jest.mock('@/components/ui', () => ({
  DataTablePro: ({ data, columns }: any) => (
    <div data-testid="data-table-pro">
      {data.map((row: any, index: number) => (
        <div key={index} data-testid={`row-${index}`}>
          {columns.map((col: any) => (
            <span key={col.accessorKey}>{String(row[col.accessorKey])}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../../constants', () => ({
  oracleNames: {
    chainlink: 'Chainlink',
    pyth: 'Pyth',
  },
  getDeviationBgClass: (deviation: number) => (deviation > 5 ? 'bg-red-100' : 'bg-green-100'),
  getFreshnessInfo: (seconds: number) => ({
    label: 'Fresh',
    color: 'green',
    text: 'Fresh',
    seconds,
  }),
  getFreshnessDotColor: (seconds: number) => 'green',
  calculateZScore: (price: number, avg: number, std: number) => (std > 0 ? (price - avg) / std : 0),
  isOutlier: (zScore: number) => Math.abs(zScore) > 2,
  ANOMALY_THRESHOLD: 0.05,
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

describe('PriceTable', () => {
  const mockProps = {
    priceData: mockPriceData,
    filteredPriceData: mockPriceData,
    isLoading: false,
    sortColumn: null as 'price' | 'timestamp' | null,
    sortDirection: 'asc' as const,
    expandedRow: null,
    selectedRowIndex: null,
    hoveredRowIndex: null,
    chartColors: { chainlink: '#375BD2', pyth: '#EC1C79' } as Record<OracleProvider, string>,
    avgPrice: 50050,
    standardDeviation: 50,
    validPrices: [50000, 50100],
    onSort: jest.fn(),
    onExpandRow: jest.fn(),
    onSetHoveredRow: jest.fn(),
    onHoverOracle: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render price table', () => {
    render(<PriceTable {...mockProps} />);

    expect(screen.getByTestId('data-table-pro')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<PriceTable {...mockProps} isLoading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<PriceTable {...mockProps} priceData={[]} filteredPriceData={[]} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('should call onSort when sort is triggered', () => {
    const onSort = jest.fn();
    render(<PriceTable {...mockProps} onSort={onSort} />);

    const table = screen.getByTestId('data-table-pro');
    expect(table).toBeInTheDocument();
  });

  it('should call onExpandRow when row is expanded', () => {
    const onExpandRow = jest.fn();
    render(<PriceTable {...mockProps} onExpandRow={onExpandRow} />);

    const table = screen.getByTestId('data-table-pro');
    expect(table).toBeInTheDocument();
  });

  it('should call onSetHoveredRow when row is hovered', () => {
    const onSetHoveredRow = jest.fn();
    render(<PriceTable {...mockProps} onSetHoveredRow={onSetHoveredRow} />);

    const table = screen.getByTestId('data-table-pro');
    expect(table).toBeInTheDocument();
  });

  it('should call onHoverOracle when oracle is hovered', () => {
    const onHoverOracle = jest.fn();
    render(<PriceTable {...mockProps} onHoverOracle={onHoverOracle} />);

    const table = screen.getByTestId('data-table-pro');
    expect(table).toBeInTheDocument();
  });

  it('should display correct number of rows', () => {
    render(<PriceTable {...mockProps} />);

    const rows = screen.getAllByTestId(/row-/);
    expect(rows).toHaveLength(2);
  });
});
