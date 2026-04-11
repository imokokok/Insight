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
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, priority, className }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    priority?: boolean;
    className?: string;
  }) => (
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
  default: ({ href, children, className, onClick, title }: {
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

jest.mock('@/hooks', () => ({
  useKeyboardShortcuts: jest.fn(),
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'zh-CN'],
    defaultLocale: 'en',
  },
}));

jest.mock('../LanguageSwitcher', () => ({
  __esModule: true,
  default: () => <div data-testid="language-switcher">Language Switcher</div>,
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
  navigationConfig: [
    { href: '/', label: 'navbar.home', icon: () => <span>Home Icon</span> },
    {
      id: 'market',
      label: 'navbar.market',
      icon: () => <span>Market Icon</span>,
      items: [{ href: '/price-query', label: 'navbar.priceQuery' }],
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

  describe('基础渲染', () => {
    it('应该正确渲染导航栏', () => {
      renderNavbar();

      expect(screen.getByAltText('Insight Logo')).toBeInTheDocument();
      expect(screen.getByText('Insight')).toBeInTheDocument();
    });

    it('应该渲染语言切换器', () => {
      renderNavbar();

      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('应该渲染搜索按钮', () => {
      renderNavbar();

      expect(screen.getByTestId('search-button')).toBeInTheDocument();
    });

    it('应该渲染桌面端导航链接', () => {
      renderNavbar();

      expect(screen.getByText('navbar.home')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-market')).toBeInTheDocument();
    });
  });

  describe('移动端菜单', () => {
    it('应该显示移动端菜单按钮', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('navbar.openMenu');
      expect(menuButton).toBeInTheDocument();
    });

    it('点击菜单按钮应该打开移动端抽屉', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('navbar.openMenu');
      fireEvent.click(menuButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');
    });

    it('关闭移动端抽屉应该正确更新状态', () => {
      renderNavbar();

      const menuButton = screen.getByLabelText('navbar.openMenu');
      fireEvent.click(menuButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');

      const closeButton = screen.getByTestId('close-drawer');
      fireEvent.click(closeButton);

      expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('搜索功能', () => {
    it('点击搜索按钮应该打开全局搜索', () => {
      renderNavbar();

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');
    });

    it('关闭全局搜索应该正确更新状态', () => {
      renderNavbar();

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');

      const closeSearchButton = screen.getByTestId('close-search');
      fireEvent.click(closeSearchButton);

      expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('用户菜单 - 未登录状态', () => {
    it('未登录时应该显示登录和注册按钮', () => {
      renderNavbar();

      expect(screen.getByText('navbar.login')).toBeInTheDocument();
      expect(screen.getByText('navbar.register')).toBeInTheDocument();
    });

    it('登录按钮应该链接到登录页面', () => {
      renderNavbar();

      const loginButton = screen.getByText('navbar.login').closest('a');
      expect(loginButton).toHaveAttribute('href', '/en/login');
    });

    it('注册按钮应该链接到注册页面', () => {
      renderNavbar();

      const registerButton = screen.getByText('navbar.register').closest('a');
      expect(registerButton).toHaveAttribute('href', '/en/register');
    });
  });

  describe('用户菜单 - 已登录状态', () => {
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

    it('已登录时应该显示用户头像按钮', () => {
      renderNavbar();

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('点击用户头像应该打开用户菜单', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('T').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('用户菜单应该显示设置链接', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('T').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        const settingsLink = screen.getByText('navbar.settings').closest('a');
        expect(settingsLink).toHaveAttribute('href', '/en/settings');
      });
    });

    it('点击退出登录应该调用 signOut', async () => {
      renderNavbar();

      const avatarButton = screen.getByText('T').closest('button');
      fireEvent.click(avatarButton!);

      await waitFor(() => {
        expect(screen.getByText('navbar.signOut')).toBeInTheDocument();
      });

      const signOutButton = screen.getByText('navbar.signOut').closest('button');
      fireEvent.click(signOutButton!);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('应该显示收藏和提醒链接', () => {
      renderNavbar();

      const favoritesLink = screen.getByTitle('navbar.favorites');
      const alertsLink = screen.getByTitle('navbar.alerts');

      expect(favoritesLink).toBeInTheDocument();
      expect(alertsLink).toBeInTheDocument();
    });
  });

  describe('导航链接高亮', () => {
    it('当前页面的导航链接应该有高亮样式', () => {
      renderNavbar();

      const homeLink = screen.getByText('navbar.home').closest('a');
      expect(homeLink?.className).toMatch(/text-primary-600|bg-primary-50/);
    });
  });

  describe('Logo 链接', () => {
    it('Logo 应该链接到首页', () => {
      renderNavbar();

      const logoLink = screen.getByAltText('Insight Logo').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });
});
