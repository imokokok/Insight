import { render, screen, waitFor } from '@testing-library/react';

import { DeviationTrendChart } from '../DeviationTrendChart';

const mockResponse = {
  success: true,
  data: {
    symbol: 'USDC',
    dateRange: { from: '2026-07-20', to: '2026-07-27' },
    providers: [{ provider: 'chainlink' }, { provider: 'redstone' }],
    timeline: [
      {
        timestamp: '2026-07-20T00:00:00.000Z',
        consensusPrice: 1.0,
        providers: {
          chainlink: { price: 1.0001, deviationPct: 0.01 },
          redstone: { price: 0.9999, deviationPct: -0.01 },
        },
      },
      {
        timestamp: '2026-07-21T00:00:00.000Z',
        consensusPrice: 1.0,
        providers: {
          chainlink: { price: 1.0002, deviationPct: 0.02 },
          redstone: { price: 0.9998, deviationPct: -0.02 },
        },
      },
    ],
  },
};

describe('DeviationTrendChart', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as Response);
  });

  it('fetches and renders the chart header', async () => {
    render(<DeviationTrendChart symbol="USDC" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/deviation?symbol=USDC')
      );
    });

    expect(screen.getByText('Deviation Trend')).toBeInTheDocument();
    expect(screen.getByText('7D')).toBeInTheDocument();
  });

  it('renders range selector buttons when data is available', async () => {
    render(<DeviationTrendChart symbol="USDC" />);

    await waitFor(() => {
      expect(screen.getByText('Deviation Trend')).toBeInTheDocument();
    });

    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('90D')).toBeInTheDocument();
  });

  it('hides the module when no timeline data is returned', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          symbol: 'USDC',
          dateRange: { from: '2026-07-20', to: '2026-07-27' },
          providers: [],
          timeline: [],
        },
      }),
    } as unknown as Response);

    render(<DeviationTrendChart symbol="USDC" />);

    await waitFor(() => {
      expect(screen.queryByText('Deviation Trend')).not.toBeInTheDocument();
    });
  });

  it('hides the module on fetch error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Network error' },
      }),
    } as unknown as Response);

    render(<DeviationTrendChart symbol="USDC" />);

    await waitFor(() => {
      expect(screen.queryByText('Deviation Trend')).not.toBeInTheDocument();
    });
  });
});
