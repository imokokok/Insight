import { render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/en/settings'),
}));

jest.mock('@/i18n', () => ({
  useLocale: () => 'en',
}));

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
  useAuthLoading: jest.fn(),
  useAuthInitialized: jest.fn(),
}));

jest.mock('@/components/settings', () => ({
  SettingsLayout: ({ children, activeTab, onTabChange }: any) => (
    <div data-testid="settings-layout">
      <div data-testid="active-tab">{activeTab}</div>
      <button onClick={() => onTabChange('preferences')}>Change Tab</button>
      {children}
    </div>
  ),
  ProfilePanel: () => <div data-testid="profile-panel">Profile Panel</div>,
  PreferencesPanel: () => <div data-testid="preferences-panel">Preferences Panel</div>,
  NotificationPanel: () => <div data-testid="notification-panel">Notification Panel</div>,
  DataManagementPanel: () => <div data-testid="data-panel">Data Panel</div>,
}));

const mockUseUser = useUser as jest.Mock;
const mockUseAuthLoading = useAuthLoading as jest.Mock;
const mockUseAuthInitialized = useAuthInitialized as jest.Mock;

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state when auth is loading', () => {
    mockUseAuthLoading.mockReturnValue(true);
    mockUseAuthInitialized.mockReturnValue(false);
    mockUseUser.mockReturnValue(null);
    
    render(<SettingsPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show loading state when not initialized', () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseAuthInitialized.mockReturnValue(false);
    mockUseUser.mockReturnValue(null);
    
    render(<SettingsPage />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render settings page when user is authenticated', async () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseAuthInitialized.mockReturnValue(true);
    mockUseUser.mockReturnValue({ id: 'user-1', email: 'test@example.com' });
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('settings-layout')).toBeInTheDocument();
    });
  });

  it('should render profile panel by default', async () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseAuthInitialized.mockReturnValue(true);
    mockUseUser.mockReturnValue({ id: 'user-1' });
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('profile-panel')).toBeInTheDocument();
    });
  });

  it('should show active tab', async () => {
    mockUseAuthLoading.mockReturnValue(false);
    mockUseAuthInitialized.mockReturnValue(true);
    mockUseUser.mockReturnValue({ id: 'user-1' });
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('active-tab')).toHaveTextContent('profile');
    });
  });
});
