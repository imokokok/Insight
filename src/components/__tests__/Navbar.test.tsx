import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import Navbar from '../Navbar';

const mockPush = jest.fn;
const mockReplace = jest.fn;
const mockSignOut = jest.fn;

jest.mock('next/navigation',  => ({
 useRouter:  => ({
 push: mockPush,
 replace: mockReplace,
 refresh: jest.fn,
 back: jest.fn,
 forward: jest.fn,
 prefetch: jest.fn,
 }),
 usePathname:  => '/en',
 useSearchParams:  => new URLSearchParams,
 useParams:  => ({ locale: 'en' }),
}));

jest.mock('next/image',  => ({
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

jest.mock('next/link',  => ({
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
 onClick?:  => void;
 title?: string;
 }) => (
 <a href={href} className={className} onClick={onClick} title={title}>
 {children}
 </a>
 ),
}));

jest.mock('@/stores/authStore',  => ({
 useUser: jest.fn( => null),
 useProfile: jest.fn( => null),
 useAuthLoading: jest.fn( => false),
 useAuthActions: jest.fn( => ({ signOut: mockSignOut })),
}));

jest.mock('@/lib/security',  => ({
 sanitizeUrl: jest.fn((url: string) => url),
}));

jest.mock('@/hooks',  => ({
 useKeyboardShortcuts: jest.fn,
}));

jest.mock('../navigation',  => ({
 DropdownMenu: ({ group }: { group: { id: string; label: string } }) => (
 <div data-testid={`dropdown-${group.id}`}>{group.label}</div>
 ),
 MobileDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose:  => void }) => (
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
 onClose:  => void;
 onSignOut:  => void;
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
 { href: '/', label: 'navbar.home', icon:  => <span>Home Icon</span> },
 {
 id: 'market',
 label: 'navbar.market',
 icon:  => <span>Market Icon</span>,
 items: [{ href: '/price-query', label: 'navbar.priceQuery' }],
 },
 ],
}));

jest.mock('../search',  => ({
 SearchButton: ({ onClick }: { onClick:  => void }) => (
 <button onClick={onClick} data-testid="search-button">
 Search
 </button>
 ),
 GlobalSearch: ({ isOpen, onClose }: { isOpen: boolean; onClose:  => void }) => (
 <div data-testid="global-search" data-open={isOpen}>
 {isOpen && (
 <button onClick={onClose} data-testid="close-search">
 Close Search
 </button>
 )}
 </div>
 ),
}));

jest.mock('@/components/ui',  => ({
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
 onClick?:  => void;
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

const createWrapper =  => {
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

const renderNavbar =  => {
 return render(<Navbar />, { wrapper: createWrapper });
};

describe('Navbar',  => {
 beforeEach( => {
 jest.clearAllMocks;
 });

 describe('Basic rendering',  => {
 it('should render navbar correctly',  => {
 renderNavbar;

 expect(screen.getByAltText('Insight Logo')).toBeInTheDocument;
 expect(screen.getByText('Text')).toBeInTheDocument;
 });

 it('should render search button',  => {
 renderNavbar;

 expect(screen.getByTestId('search-button')).toBeInTheDocument;
 });

 it('should render desktop navigation links',  => {
 renderNavbar;

 expect(screen.getByText('Text')).toBeInTheDocument;
 expect(screen.getByTestId('dropdown-market')).toBeInTheDocument;
 });
 });

 describe('Mobile menu',  => {
 it('shouldMobile menubutton',  => {
 renderNavbar;

 const menuButton = screen.getByLabelText('Text');
 expect(menuButton).toBeInTheDocument;
 });

 it('clicking menu button should open mobile drawer',  => {
 renderNavbar;

 const menuButton = screen.getByLabelText('Text');
 fireEvent.click(menuButton);

 expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');
 });

 it('closing mobile drawer should correctly update state',  => {
 renderNavbar;

 const menuButton = screen.getByLabelText('Text');
 fireEvent.click(menuButton);

 expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'true');

 const closeButton = screen.getByTestId('close-drawer');
 fireEvent.click(closeButton);

 expect(screen.getByTestId('mobile-drawer')).toHaveAttribute('data-open', 'false');
 });
 });

 describe('Search functionality',  => {
 it('clicking search button should open global search',  => {
 renderNavbar;

 const searchButton = screen.getByTestId('search-button');
 fireEvent.click(searchButton);

 expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');
 });

 it('closesearchshouldupdatestate',  => {
 renderNavbar;

 const searchButton = screen.getByTestId('search-button');
 fireEvent.click(searchButton);

 expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'true');

 const closeSearchButton = screen.getByTestId('close-search');
 fireEvent.click(closeSearchButton);

 expect(screen.getByTestId('global-search')).toHaveAttribute('data-open', 'false');
 });
 });

 describe('usermenu - loginstate',  => {
 it('loginshouldloginandregisterbutton',  => {
 renderNavbar;

 expect(screen.getByText('Text')).toBeInTheDocument;
 expect(screen.getByText('Text')).toBeInTheDocument;
 });

 it('loginbuttonshouldlinktologinpage',  => {
 renderNavbar;

 const loginButton = screen.getByText('Text').closest('Text');
 expect(loginButton).toHaveAttribute('href', '/en/login');
 });

 it('registerbuttonshouldlinktoregisterpage',  => {
 renderNavbar;

 const registerButton = screen.getByText('Text').closest('Text');
 expect(registerButton).toHaveAttribute('href', '/en/register');
 });
 });

 describe('usermenu - loginstate',  => {
 const mockUser = {
 id: 'test-user-id',
 email: 'test@example.com',
 };

 const mockProfile = {
 id: 'test-profile-id',
 display_name: 'Test User',
 avatar_url: null,
 };

 beforeEach( => {
 const { useUser, useProfile, useAuthLoading } = jest.requireMock('@/stores/authStore');
 useUser.mockReturnValue(mockUser);
 useProfile.mockReturnValue(mockProfile);
 useAuthLoading.mockReturnValue(false);
 });

 afterEach( => {
 const { useUser, useProfile, useAuthLoading } = jest.requireMock('@/stores/authStore');
 useUser.mockReturnValue(null);
 useProfile.mockReturnValue(null);
 useAuthLoading.mockReturnValue(false);
 });

 it('loginshoulduserheadbutton',  => {
 renderNavbar;

 expect(screen.getByText('Text')).toBeInTheDocument;
 });

 it('clickuserheadshouldopenusermenu', async  => {
 renderNavbar;

 const avatarButton = screen.getByText('Text').closest('Text');
 fireEvent.click(avatarButton!);

 await waitFor( => {
 expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument;
 });
 });

 it('usermenushouldsettingslink', async  => {
 renderNavbar;

 const avatarButton = screen.getByText('Text').closest('Text');
 fireEvent.click(avatarButton!);

 await waitFor( => {
 expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument;
 });
 });

 it('clicklogoutloginshoulduse signOut', async  => {
 renderNavbar;

 const avatarButton = screen.getByText('Text').closest('Text');
 fireEvent.click(avatarButton!);

 await waitFor( => {
 expect(screen.getByTestId('user-menu-dropdown')).toBeInTheDocument;
 });

 const signOutButton = screen.getByTestId('sign-out');
 fireEvent.click(signOutButton);

 await waitFor( => {
 expect(mockSignOut).toHaveBeenCalled;
 });
 });

 it('shouldFavoritesandlink',  => {
 renderNavbar;

 const favoritesLink = screen.getByTitle('navbar.favorites');
 const alertsLink = screen.getByTitle('navbar.alerts');

 expect(favoritesLink).toBeInTheDocument;
 expect(alertsLink).toBeInTheDocument;
 });
 });

 describe('navigationlink',  => {
 it('currentpagenavigationlinkshouldhavestyle',  => {
 renderNavbar;

 const homeLink = screen.getByText('Text').closest('Text');
 expect(homeLink?.className).toMatch(/text-primary-600|bg-primary-50/);
 });
 });

 describe('Logo link',  => {
 it('Logo shouldlinkto',  => {
 renderNavbar;

 const logoLink = screen.getByAltText('Insight Logo').closest('Text');
 expect(logoLink).toHaveAttribute('href', '/');
 });
 });
});
