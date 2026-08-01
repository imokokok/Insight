import { render, screen } from '@testing-library/react';

import { RiskHeatmap } from '../RiskHeatmap';

const thresholds = { warning: 0.25, critical: 1.0, severe: 3.0 };

const rows = [
  { id: 'USDC', label: 'USDC' },
  { id: 'USDT', label: 'USDT' },
];

const cols = [
  { id: 'chainlink:ethereum', label: 'chainlink @ ethereum' },
  { id: 'redstone:solana', label: 'redstone @ solana' },
];

const cells = [
  {
    rowId: 'USDC',
    colId: 'chainlink:ethereum',
    value: 0.05,
    label: 'chainlink @ ethereum: $1.0005',
    riskLevel: 'normal' as const,
    verificationType: 'on-chain' as const,
  },
  {
    rowId: 'USDC',
    colId: 'redstone:solana',
    value: 1.2,
    label: 'redstone @ solana: $1.0120',
    riskLevel: 'critical' as const,
    verificationType: 'api' as const,
  },
];

describe('RiskHeatmap', () => {
  it('renders row and column headers', () => {
    render(
      <RiskHeatmap
        rows={rows}
        cols={cols}
        cells={cells}
        thresholds={thresholds}
        valueFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
      />
    );

    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('chainlink @ ethereum')).toBeInTheDocument();
  });

  it('formats cell values', () => {
    render(
      <RiskHeatmap
        rows={rows}
        cols={cols}
        cells={cells}
        thresholds={thresholds}
        valueFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
      />
    );

    expect(screen.getByText('+0.05%')).toBeInTheDocument();
    expect(screen.getByText('+1.20%')).toBeInTheDocument();
  });

  it('shows empty placeholder for missing cells', () => {
    render(
      <RiskHeatmap
        rows={rows}
        cols={cols}
        cells={cells}
        thresholds={thresholds}
        valueFormatter={(v) => `${v.toFixed(2)}%`}
      />
    );

    // USDT row has no cells, so its columns should show '-'
    const emptyCells = screen.getAllByText('-');
    expect(emptyCells.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the legend', () => {
    render(<RiskHeatmap rows={rows} cols={cols} cells={cells} thresholds={thresholds} />);

    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText(/Continuous scale/)).toBeInTheDocument();
  });
});
