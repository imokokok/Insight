import { render, screen } from '@testing-library/react';

import { LiveStatusStrip } from '../LiveStatusStrip';

const baseProps = {
  activeProviders: 5,
  totalProviders: 5,
  avgSpread: 0.6,
  healthyCount: 2,
  totalAssets: 4,
  updateInterval: '60s',
};

describe('LiveStatusStrip', () => {
  it('separates polling frequency from the age of delayed source observations', () => {
    const now = Date.UTC(2026, 9, 1, 0, 0);
    render(<LiveStatusStrip {...baseProps} now={now} lastObservedAt={now - 60 * 60_000} />);

    expect(screen.getByText('Older observations')).toBeInTheDocument();
    expect(screen.getByText('Rechecks every 60s')).toBeInTheDocument();
    expect(screen.getByText('1h ago')).toBeInTheDocument();
    expect(screen.getByText(/Check the observation time before using a price/)).toBeInTheDocument();
    expect(screen.queryByText('Network live')).not.toBeInTheDocument();
  });

  it('identifies a recent observation without a stale-data warning', () => {
    const now = Date.UTC(2026, 9, 1, 0, 0);
    render(<LiveStatusStrip {...baseProps} now={now} lastObservedAt={now - 2 * 60_000} />);

    expect(screen.getByText('Recent observation')).toBeInTheDocument();
    expect(screen.getByText('2m ago')).toBeInTheDocument();
    expect(screen.queryByText(/Check the observation time before using a price/)).toBeNull();
  });
});
