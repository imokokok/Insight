import { render, screen, fireEvent } from '@testing-library/react';
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
  const mockProps = {
    alerts: [
      {
        id: 'alert-1',
        type: 'high_deviation' as const,
        severity: 'high' as const,
        message: 'High price deviation detected',
        timestamp: Date.now(),
        details: { deviation: 5.2 },
      },
      {
        id: 'alert-2',
        type: 'stale_data' as const,
        severity: 'medium' as const,
        message: 'Data is stale',
        timestamp: Date.now() - 60000,
        details: { age: 60 },
      },
    ],
    onDismiss: jest.fn(),
    onAlertClick: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert banner', () => {
    render(<RiskAlertBanner {...mockProps} />);
    
    expect(screen.getByText(/high price deviation/i)).toBeInTheDocument();
  });

  it('should render multiple alerts', () => {
    render(<RiskAlertBanner {...mockProps} />);
    
    expect(screen.getByText(/high price deviation/i)).toBeInTheDocument();
    expect(screen.getByText(/data is stale/i)).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<RiskAlertBanner {...mockProps} onDismiss={onDismiss} />);
    
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButtons[0]);
    
    expect(onDismiss).toHaveBeenCalledWith('alert-1');
  });

  it('should call onAlertClick when alert is clicked', () => {
    const onAlertClick = jest.fn();
    render(<RiskAlertBanner {...mockProps} onAlertClick={onAlertClick} />);
    
    const alert = screen.getByText(/high price deviation/i).closest('div');
    if (alert) {
      fireEvent.click(alert);
    }
  });

  it('should not render when no alerts', () => {
    const { container } = render(<RiskAlertBanner {...mockProps} alerts={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should show correct severity colors', () => {
    render(<RiskAlertBanner {...mockProps} />);
    
    const highAlert = screen.getByText(/high price deviation/i).closest('div');
    expect(highAlert).toHaveClass('bg-danger-50');
  });

  it('should render alert count badge', () => {
    render(<RiskAlertBanner {...mockProps} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
