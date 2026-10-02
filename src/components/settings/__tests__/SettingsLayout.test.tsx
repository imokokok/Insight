import { render, screen, fireEvent, within } from '@testing-library/react';

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

  it('should render the account workspace title and subtitle', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Make this space yours.' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keep your identity, verified email, and password in clear view.')
    ).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /data/i })).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(<SettingsLayout {...defaultProps} />);

    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<SettingsLayout {...defaultProps} activeTab="profile" />);

    const profileTab = screen.getByRole('tab', { name: /profile/i });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(profileTab).toHaveClass('is-active');
  });

  it('should call onTabChange when tab is clicked', () => {
    render(<SettingsLayout {...defaultProps} />);

    const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
    fireEvent.click(preferencesTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('preferences');
  });

  it('should render tab descriptions', () => {
    render(<SettingsLayout {...defaultProps} />);

    const navigation = within(screen.getByRole('navigation'));
    expect(navigation.getByText('Identity & security')).toBeInTheDocument();
    expect(navigation.getByText('Your default view')).toBeInTheDocument();
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
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'settings-tab-profile');
  });

  it('supports keyboard navigation between controls', () => {
    render(<SettingsLayout {...defaultProps} />);

    const profileTab = screen.getByRole('tab', { name: /profile/i });
    const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
    profileTab.focus();
    fireEvent.keyDown(profileTab, { key: 'ArrowDown' });

    expect(mockOnTabChange).toHaveBeenCalledWith('preferences');
    expect(preferencesTab).toHaveFocus();
  });
});
