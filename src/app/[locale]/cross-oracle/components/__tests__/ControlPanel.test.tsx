import { render, screen, fireEvent } from '@testing-library/react';

import { type OracleProvider } from '@/types/oracle';

import { ControlPanel } from '../ControlPanel';

jest.mock('@/components/ui', () => ({
  SegmentedControl: ({ options, value, onChange }: any) => (
    <div data-testid="segmented-control">
      {options.map((opt: any) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          data-active={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
  DropdownSelect: ({ value, onChange, options }: any) => (
    <select data-testid="dropdown-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('@/lib/config/oracles', () => ({
  getOracleConfig: (provider: string) => ({
    name: provider,
    features: {
      hasFirstPartyOracle: true,
      hasQuantifiableSecurity: false,
      hasDisputeResolution: false,
      hasDataStreams: false,
      hasCrossChain: false,
      hasCoreFeatures: true,
    },
    networkData: {
      dataFeeds: 100,
      avgResponseTime: 100,
    },
  }),
  getPriceOracleProvidersSortedByMarketCap: () => ['chainlink', 'pyth'],
  oracleNames: {
    chainlink: 'Chainlink',
    pyth: 'Pyth',
  },
}));

describe('ControlPanel', () => {
  const mockProps = {
    selectedSymbol: 'BTC',
    onSymbolChange: jest.fn(),
    symbols: ['BTC', 'ETH', 'SOL'],
    selectedOracles: ['chainlink', 'pyth'] as OracleProvider[],
    onOracleToggle: jest.fn(),
    oracleChartColors: { chainlink: '#375BD2', pyth: '#EC1C79' },
    timeRange: '24h' as const,
    onTimeRangeChange: jest.fn(),
    onQuery: jest.fn(),
    isLoading: false,
    activeFilterCount: 0,
    onClearFilters: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render control panel', () => {
    render(<ControlPanel {...mockProps} />);

    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('should render symbol selector', () => {
    render(<ControlPanel {...mockProps} />);

    expect(screen.getByTestId('dropdown-select')).toBeInTheDocument();
  });

  it('should call onSymbolChange when symbol is changed', () => {
    const onSymbolChange = jest.fn();
    render(<ControlPanel {...mockProps} onSymbolChange={onSymbolChange} />);

    const select = screen.getByTestId('dropdown-select');
    fireEvent.change(select, { target: { value: 'ETH' } });

    expect(onSymbolChange).toHaveBeenCalledWith('ETH');
  });

  it('should render query button', () => {
    render(<ControlPanel {...mockProps} />);

    const queryButton = screen.getByRole('button', { name: /query/i });
    expect(queryButton).toBeInTheDocument();
  });

  it('should call onQuery when query button is clicked', () => {
    const onQuery = jest.fn();
    render(<ControlPanel {...mockProps} onQuery={onQuery} />);

    const queryButton = screen.getByRole('button', { name: /query/i });
    fireEvent.click(queryButton);

    expect(onQuery).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<ControlPanel {...mockProps} isLoading={true} />);

    const queryButton = screen.getByRole('button', { name: /query/i });
    expect(queryButton).toBeDisabled();
  });

  it('should show active filter count', () => {
    render(<ControlPanel {...mockProps} activeFilterCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onClearFilters when clear button is clicked', () => {
    const onClearFilters = jest.fn();
    render(<ControlPanel {...mockProps} activeFilterCount={2} onClearFilters={onClearFilters} />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(onClearFilters).toHaveBeenCalled();
  });
});
