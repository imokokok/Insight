import { render, screen, fireEvent } from '@testing-library/react';

import { SettingsLayout, type SettingsTab } from '../SettingsLayout';

describe('SettingsLayout', () => {
  const mockOnTabChange = jest.fn();
  const defaultProps = {
    children: <div data-testid="test-children">Test Content</div>,
    activeTab: 'profile' as SettingsTab,
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings title and subtitle', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account settings and preferences')).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<SettingsLayout {...defaultProps} activeTab="profile" />);

    const profileTab = screen.getByRole('button', { name: /profile/i });
    expect(profileTab).toHaveClass('bg-primary-50/80');
  });

  it('should call onTabChange when tab is clicked', () => {
    render(<SettingsLayout {...defaultProps} />);

    const preferencesTab = screen.getByRole('button', { name: /preferences/i });
    fireEvent.click(preferencesTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('preferences');
  });

  it('should render tab descriptions', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByText('Manage your account profile')).toBeInTheDocument();
    expect(screen.getByText('Customize your preferences')).toBeInTheDocument();
  });

  it('should render settings icon', () => {
    const { container } = render(<SettingsLayout {...defaultProps} />);

    const settingsIcon = container.querySelector('svg');
    expect(settingsIcon).toBeInTheDocument();
  });

  it('should have correct navigation structure', () => {
    render(<SettingsLayout {...defaultProps} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('should render main content area', () => {
    render(<SettingsLayout {...defaultProps} />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
