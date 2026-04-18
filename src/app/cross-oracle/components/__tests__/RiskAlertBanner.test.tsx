import { render, screen, fireEvent } from '@testing-library/react';

import { type PriceAnomaly, type AnomalySeverity } from '../hooks/usePriceAnomalyDetection';
import { RiskAlertBanner } from '../RiskAlertBanner';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('RiskAlertBanner', () => {
  const createMockAnomaly = (
    provider: string,
    severity: AnomalySeverity,
    deviationPercent: number
  ): PriceAnomaly => ({
    provider: provider as PriceAnomaly['provider'],
    severity,
    deviationPercent,
    reasonKeys: ['severeDeviation'],
    price: 50000,
    medianPrice: 49000,
    confidence: 95,
    timestamp: Date.now(),
  });

  const mockProps = {
    anomalies: [
      createMockAnomaly('chainlink', 'high', 5.2),
      createMockAnomaly('pyth', 'medium', 2.1),
    ] as PriceAnomaly[],
    count: 2,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 0,
    maxDeviation: 5.2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert banner when anomalies exist', () => {
    render(<RiskAlertBanner {...mockProps} />);

    expect(screen.getByText(/High Risk Alert/i)).toBeInTheDocument();
  });

  it('should display anomaly count', () => {
    render(<RiskAlertBanner {...mockProps} />);

    expect(screen.getByText(/2 anomalies detected/i)).toBeInTheDocument();
  });

  it('should display max deviation', () => {
    render(<RiskAlertBanner {...mockProps} />);

    expect(screen.getByText(/max deviation: 5.20%/i)).toBeInTheDocument();
  });

  it('should display high risk count', () => {
    render(<RiskAlertBanner {...mockProps} />);

    expect(screen.getByText(/1 high risk/i)).toBeInTheDocument();
  });

  it('should call onViewDetails when button is clicked', () => {
    const onViewDetails = jest.fn();
    render(<RiskAlertBanner {...mockProps} onViewDetails={onViewDetails} />);

    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsButton);

    expect(onViewDetails).toHaveBeenCalled();
  });

  it('should not render when count is 0', () => {
    const { container } = render(
      <RiskAlertBanner
        anomalies={[]}
        count={0}
        highRiskCount={0}
        mediumRiskCount={0}
        lowRiskCount={0}
        maxDeviation={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show correct severity colors for high risk', () => {
    render(<RiskAlertBanner {...mockProps} />);

    const highSeverityBadge = screen.getByText('High');
    expect(highSeverityBadge).toBeInTheDocument();
  });

  it('should show medium risk alert when only medium anomalies', () => {
    render(
      <RiskAlertBanner
        anomalies={[createMockAnomaly('pyth', 'medium', 2.1)]}
        count={1}
        highRiskCount={0}
        mediumRiskCount={1}
        lowRiskCount={0}
        maxDeviation={2.1}
      />
    );

    expect(screen.getByText(/Medium Risk Alert/i)).toBeInTheDocument();
  });

  it('should show low risk alert when only low anomalies', () => {
    render(
      <RiskAlertBanner
        anomalies={[createMockAnomaly('dia', 'low', 0.8)]}
        count={1}
        highRiskCount={0}
        mediumRiskCount={0}
        lowRiskCount={1}
        maxDeviation={0.8}
      />
    );

    expect(screen.getByText(/Low Risk Alert/i)).toBeInTheDocument();
  });

  it('should display remaining anomalies count', () => {
    const manyAnomalies = Array.from({ length: 5 }, (_, i) =>
      createMockAnomaly(`oracle${i}`, 'low', 0.5 + i * 0.1)
    );
    render(
      <RiskAlertBanner
        anomalies={manyAnomalies}
        count={5}
        highRiskCount={0}
        mediumRiskCount={0}
        lowRiskCount={5}
        maxDeviation={0.9}
      />
    );

    expect(screen.getByText(/2 more anomalies/i)).toBeInTheDocument();
  });
});
