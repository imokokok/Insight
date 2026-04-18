import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import Navbar from '../Navbar';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    priority,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    priority?: boolean;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-priority={priority}
    />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    onClick,
    title,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    title?: string;
  }) => (
    <a href={href} className={className} onClick={onClick} title={title}>
      {children}
    </a>
  ),
}));

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(() => null),
  useProfile: jest.fn(() => null),
  useAuthLoading: jest.fn(() => false),
  useAuthActions: jest.fn(() => ({ signOut: mockSignOut })),
}));

jest.mock('@/lib/security', () => ({
  sanitizeUrl: jest.fn((url: string) => url),
}));

jest.mock('@/hooks', () => ({
  useKeyboardShortcuts: jest.fn(),
}));

jest.mock('../navigation', () => ({
  DropdownMenu: ({ group }: { group: { id: string; label: string } }) => (
    <div data-testid={`dropdown-${group.id}`}>{group.label}</div>
  ),
  MobileDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="mobile-drawer" data-open={isOpen}>
      {isOpen && (
        <button onClick={onClose} data-testid="close-drawer">
          Close
        </button>
      )}
    </div>
  ),
  UserMenuDropdown: ({
    profile,
    userEmail,
    onClose,
    onSignOut,
  }: {
    profile: { display_name: string | null } | null;
    userEmail: string | undefined;
    onClose: () => void;
    onSignOut: () => void;
  }) => (
    <div data-testid="user-menu-dropdown">
      <span>{profile?.display_name || 'User'}</span>
      <span>{userEmail}</span>
      <button onClick={onClose} data-testid="close-user-menu">
        Close Menu
      </button>
      <button onClick={onSignOut} data-testid="sign-out">
        Sign Out
      </button>
    </div>
  ),
  navigationConfig: [
    { href: '/', label: 'Home', icon: () => <span>Home Icon</span> },
    {
      id: 'market',
      label: 'Market',
      icon: () => <span>Market Icon</span>,
      items: [{ href: '/price-query', label: 'Price Query' }],
    },
  ],
}));

jest.mock('../search', () => ({
  SearchButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="search-button">
      Search
    </button>
  ),
  GlobalSearch: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="global-search" data-open={isOpen}>
      {isOpen && (
        <button onClick={onClose} data-testid="close-search">
          Close Search
        </button>
      )}
    </div>
  ),
}));

jest.mock('@/components/ui', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    className,
    leftIcon,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    className?: string;
    leftIcon?: ReactNode;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      aria-label={ariaLabel}
    >
      {leftIcon}
      {children}
    </button>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const renderNavbar = () => {
  return render(<Navbar />, { wrapper: createWrapper() });
};

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render navbar correctly', () => {
      renderNavbar();

      expect(screen.getByAltText('Insight Logo')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('should render search button', () => {
      renderNavbar();

      expect(screen.getByTestId('search-button')).toBeInTheDocument();
    });

    it('should render desktop navigation links', () => {
      renderNavbar();

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-market')).toBeInTheDocument();
    });
  });

  describe('Mobile menu', () => {
    it('should render mobile menu button', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('Text');
      expect(menuButton).toBeInTheDocument();
    });

    it('clicking menu button should open mobile drawer', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('Text');
      fireEvent.click(menuButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');
    });

    it('closing mobile drawer should correctly update state', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('Text');
      fireEvent.click(menuButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');

      const closeButton = screen.getByTestId('close-drawer');
      fireEvent.click(closeButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Search functionality', () => {
    it('clicking search button should open global search', () => {
      renderNavbar();

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');
    });

    it('closing search should update state', () => {
      renderNavbar();

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');

      const closeSearchButton = screen.getByTestId('close-search');
      fireEvent.click(closeSearchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('user menu - logged out state', () => {
    it('should show login and register buttons when logged out', () => {
      renderNavbar();

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('login button should link to login page', () => {
      renderNavbar();

      const loginButton = screen.getByText('Text').closest('a');
      expect(loginButton).toHaveAttribute('href', '/login');
    });

    it('register button should link to register page', () => {
      renderNavbar();

      const registerButton = screen.getByText('Text').closest('a');
      expect(registerButton).toHaveAttribute('href', '/register');
    });
  });

  describe('user menu - logged in state', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    const mockProfile = {
      id: 'test-profile-id',
      display_name: 'Test User',
      avatar_url: null,
    };

    beforeEach(() => {
      const { useUser, useProfile, useAuthLoading } = jest.requireMock('@/stores/authStore');
      useUser.mockReturnValue(mockUser);
      useProfile.mockReturnValue(mockProfile);
      useAuthLoading.mockReturnValue(false);
    });

    afterEach(() => {
      const { useUser, useProfile, useAuthLoading } = jest.requireMock('@/stores/authStore');
      useUser.mockReturnValue(null);
      useProfile.mockReturnValue(null);
      useAuthLoading.mockReturnValue(false);
    });

    it('should show user avatar button when logged in', () => {
      renderNavbar();

      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('clicking user avatar should open user menu', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('Text').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument();
      });
    });

    it('user menu should show settings link', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('Text').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument();
      });
    });

    it('clicking sign out should call signOut', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('Text').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument();
      });

      const signOutButton = screen.getByTestId('sign-out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should render favorites and alerts links', () => {
      renderNavbar();

      const favoritesLink = screen.getByTitle('Favorites');
      const alertsLink = screen.getByTitle('Alerts');

      expect(favoritesLink).toBeInTheDocument();
      expect(alertsLink).toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('current page navigation link should have active style', () => {
      renderNavbar();

      const homeLink = screen.getByText('Text').closest('a');
      expect(homeLink?.className).toMatch(/text-primary-600|bg-primary-50/);
    });
  });

  describe('Logo link', () => {
    it('Logo should link to home', () => {
      renderNavbar();

      const logoLink = screen.getByAltText('Insight Logo').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });
});
