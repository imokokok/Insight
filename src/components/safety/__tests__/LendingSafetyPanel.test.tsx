import { render, screen } from '@testing-library/react';

import { LendingSafetyPanel } from '@/components/safety/LendingSafetyPanel';

describe('LendingSafetyPanel pre-trade integration', () => {
  it('renders the pre-trade verdict badge, live oracle state and forward-looking ML risk', () => {
    render(
      <LendingSafetyPanel
        protocolSafety={null}
        actions={[]}
        verdict="BLOCK"
        maxDeviationPct={4.5}
        crossProviderAgreement={0.72}
        participantCount={4}
        manipulationRiskScore={0.7}
        mlScore1h={0.62}
        mlScore6h={0.55}
        anomalyScore={0.4}
      />
    );

    // Decision summary badge
    expect(screen.getByText(/pre-trade block/i)).toBeInTheDocument();
    expect(
      screen.getByText('Critical risk — do not act. Oracle may be manipulated.')
    ).toBeInTheDocument();

    // Live oracle state line
    expect(screen.getByText(/dev 4\.50%/)).toBeInTheDocument();
    expect(screen.getByText(/agreement 72%/)).toBeInTheDocument();
    expect(screen.getByText(/4 providers/)).toBeInTheDocument();

    // Forward-looking ML dimension
    expect(screen.getByText('Forward-looking oracle risk')).toBeInTheDocument();
    expect(screen.getByText('ML 1h / 6h')).toBeInTheDocument();
    expect(screen.getByText('0.62 / 0.55')).toBeInTheDocument();
    expect(screen.getByText('Anomaly (24h)')).toBeInTheDocument();
    expect(screen.getByText('0.40')).toBeInTheDocument();
  });

  it('does not render verdict or forward-looking sections when not provided (swap path)', () => {
    render(<LendingSafetyPanel protocolSafety={null} actions={[]} />);

    expect(screen.queryByText(/pre-trade/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Forward-looking oracle risk')).not.toBeInTheDocument();
  });
});
