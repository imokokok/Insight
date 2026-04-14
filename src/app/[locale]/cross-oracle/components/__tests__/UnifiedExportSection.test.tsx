import { render, screen } from '@testing-library/react';

import UnifiedExportSection from '../UnifiedExportSection';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('UnifiedExportSection', () => {
  const mockProps = {
    loading: false,
    crossOracleData: [
      {
        asset: 'BTC',
        oracle: 'Chainlink',
        price: 50000,
        timestamp: Date.now(),
        deviation: 0.5,
        latency: 100,
        confidence: 95,
        updateFrequency: 60,
      },
    ],
    selectedAssets: ['BTC'],
    selectedOracles: ['Chainlink'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export section', () => {
    render(<UnifiedExportSection {...mockProps} />);

    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('should show disabled state when loading', () => {
    render(<UnifiedExportSection {...mockProps} loading={true} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should show disabled state when no data', () => {
    render(<UnifiedExportSection {...mockProps} crossOracleData={[]} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });
});
