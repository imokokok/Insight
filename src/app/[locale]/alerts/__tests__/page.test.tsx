import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlertsPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/en/alerts'),
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/hooks', () => ({
  useAlerts: () => ({
    alerts: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useAlertEvents: () => ({
    events: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useAlertEventsRealtime: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
  useAuthLoading: jest.fn(),
}));

jest.mock('@/components/alerts/AlertConfig', () => ({
  AlertConfig: ({ onAlertCreated }: { onAlertCreated: () => void }) => (
    <div data-testid="alert-config">
      <button onClick={onAlertCreated}>Create Alert</button>
    </div>
  ),
}));

jest.mock('@/components/alerts/AlertList', () => ({
  AlertList: () => <div data-testid="alert-list">Alert List</div>,
}));

jest.mock('@/components/alerts/AlertHistory', () => ({
  AlertHistory: () => <div data-testid="alert-history">Alert History</div>,
}));

const mockUseUser = useUser as jest.Mock;
const mockUseAuthLoading = useAuthLoading as jest.Mock;

describe('AlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state when auth is loading', () => {
    mockUseAuthLoading.mockReturnValue(true);
    mockUseUser.mockReturnValue(null);
    
    render(<AlertsPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show login required when user is not authenticated', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseUser.mockReturnValue(null);
    
    render(<AlertsPage />);
    
    expect(screen.getByText('alerts.page.loginRequired')).toBeInTheDocument();
  });

  it('should render alerts page when user is authenticated', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseUser.mockReturnValue({ id: 'user-1', email: 'test@example.com' });
    
    render(<AlertsPage />);
    
    expect(screen.getByText('alerts.page.title')).toBeInTheDocument();
    expect(screen.getByTestId('alert-config')).toBeInTheDocument();
    expect(screen.getByTestId('alert-list')).toBeInTheDocument();
    expect(screen.getByTestId('alert-history')).toBeInTheDocument();
  });

  it('should render page subtitle', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseUser.mockReturnValue({ id: 'user-1' });
    
    render(<AlertsPage />);
    
    expect(screen.getByText('alerts.page.subtitle')).toBeInTheDocument();
  });

  it('should render instructions section', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseUser.mockReturnValue({ id: 'user-1' });
    
    render(<AlertsPage />);
    
    expect(screen.getByText('alerts.page.instructions.title')).toBeInTheDocument();
  });

  it('should render login link when not authenticated', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseUser.mockReturnValue(null);
    
    render(<AlertsPage />);
    
    const loginLink = screen.getByRole('link', { name: 'alerts.page.goToLogin' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
