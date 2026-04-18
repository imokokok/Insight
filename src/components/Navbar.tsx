'use client';

import { useState, useMemo, useEffect } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Menu, User, Heart, Bell } from 'lucide-react';

import { Button } from '@/components/ui';
import { useKeyboardShortcuts } from '@/hooks';
import { useUser, useProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';

import { DropdownMenu, MobileDrawer, UserMenuDropdown, navigationConfig } from './navigation';
import { type NavGroup } from './navigation/types';
import { GlobalSearch, SearchButton } from './search';

export default function Navbar() {
  const pathname = usePathname();
  const user = useUser();
  const profile = useProfile();
  const loading = useAuthLoading();
  const { signOut } = useAuthActions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  const currentPath = useMemo(() => {
    if (!pathname) return '/';
    const pathWithoutQuery = pathname.split('?')[0];
    return pathWithoutQuery;
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') {
      return currentPath === '/';
    }
    return currentPath === href;
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      handler: () => setIsSearchOpen(true),
      preventDefault: true,
    },
    {
      key: 'k',
      ctrlKey: true,
      handler: () => setIsSearchOpen(true),
      preventDefault: true,
    },
  ]);

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
                <Image
                  src="/logos/owl-logo.svg"
                  alt="Insight Logo"
                  width={32}
                  height={28}
                  className="group-hover:scale-105 transition-transform duration-300"
                  priority
                />
                <div className="text-lg font-bold text-primary-600 group-hover:text-primary-700 transition-colors duration-300">
                  Insight
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center justify-center space-x-0.5">
              {navigationConfig.map((navItem) => {
                if ('items' in navItem) {
                  const group = navItem as NavGroup;
                  const isGroupActive = group.items.some((item) => isActive(item.href));

                  return (
                    <DropdownMenu
                      key={group.id}
                      group={group}
                      isActive={isGroupActive}
                      currentPath={currentPath}
                    />
                  );
                }

                const item = navItem;
                const active = isActive(item.href);
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 relative rounded-md ${
                      active
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <SearchButton onClick={() => setIsSearchOpen(true)} />

              {user && !loading ? (
                <div className="hidden lg:flex items-center gap-0.5">
                  <Link
                    href="/favorites"
                    className={`p-2 rounded-md transition-colors ${
                      isActive('/favorites')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                    title="Favorites"
                  >
                    <Heart className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/alerts"
                    className={`p-2 rounded-md transition-colors ${
                      isActive('/alerts')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                    title="Alerts"
                  >
                    <Bell className="w-4 h-4" />
                  </Link>
                  <div className="relative ml-1">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="menu"
                      className="flex items-center gap-1.5 p-1 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <div className="w-7 h-7 bg-primary-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden rounded">
                        {profile?.avatar_url && !avatarError ? (
                          <Image
                            src={profile.avatar_url}
                            alt={profile?.display_name || 'User'}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                            unoptimized
                          />
                        ) : null}
                        <span className={profile?.avatar_url && !avatarError ? 'hidden' : ''}>
                          {profile?.display_name?.[0]?.toUpperCase() ||
                            user.email?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <UserMenuDropdown
                        profile={profile}
                        userEmail={user.email}
                        onClose={() => setIsUserMenuOpen(false)}
                        onSignOut={handleSignOut}
                      />
                    )}
                  </div>
                </div>
              ) : !loading ? (
                <div className="hidden lg:flex items-center gap-1">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      Register
                    </Button>
                  </Link>
                </div>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navStructure={navigationConfig}
          currentPath={currentPath}
        />
      </nav>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
