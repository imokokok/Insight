'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, User, LogOut, Heart, Bell, Settings } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useUser, useProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';
import LanguageSwitcher from './LanguageSwitcher';
import { DropdownMenu, MobileDrawer, navigationConfig } from './navigation';
import { NavGroup } from './navigation/types';
import { GlobalSearch, SearchButton } from './search';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui';

export default function Navbar() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const user = useUser();
  const profile = useProfile();
  const loading = useAuthLoading();
  const { signOut } = useAuthActions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentPath = useMemo(() => {
    if (!pathname) return '/';
    const pathWithoutQuery = pathname.split('?')[0];
    const localeMatch = pathWithoutQuery.match(/^\/(?:zh-CN|en)(\/.*)$/);
    return localeMatch ? localeMatch[1] : pathWithoutQuery;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
                <Image
                  src="/logos/owl-logo.svg"
                  alt="Insight Logo"
                  width={36}
                  height={32}
                  className="group-hover:scale-105 transition-transform duration-300"
                  priority
                />
                <div className="text-xl font-bold text-primary-600 group-hover:text-primary-700 transition-colors duration-300">
                  Insight
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center space-x-1">
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
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 relative ${
                      active
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="w-4 h-4" />}
                    <span>{t(item.label)}</span>
                    {active && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <SearchButton onClick={() => setIsSearchOpen(true)} />

              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              {user && !loading ? (
                <div className="hidden lg:flex items-center gap-1">
                  <Link
                    href={`/${locale}/favorites`}
                    className={`p-2 transition-colors ${
                      isActive('/favorites')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                    title={t('navbar.favorites')}
                  >
                    <Heart className="w-5 h-5" />
                  </Link>
                  <Link
                    href={`/${locale}/alerts`}
                    className={`p-2 transition-colors ${
                      isActive('/alerts')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                    title={t('navbar.alerts')}
                  >
                    <Bell className="w-5 h-5" />
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 p-1.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary-600 border border-primary-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile?.display_name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          profile?.display_name?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 py-2 z-50 shadow-lg">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {profile?.display_name || t('user')}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          <div className="py-1">
                            <Link
                              href={`/${locale}/settings`}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              {t('navbar.settings')}
                            </Link>
                          </div>
                          <div className="border-t border-gray-100 py-1">
                            <Button
                              variant="ghost"
                              onClick={handleSignOut}
                              className="w-full justify-start text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                              leftIcon={<LogOut className="w-4 h-4" />}
                            >
                              {t('navbar.signOut')}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : !loading ? (
                <div className="hidden lg:flex items-center gap-2">
                  <Link href={`/${locale}/login`}>
                    <Button variant="ghost">{t('navbar.login')}</Button>
                  </Link>
                  <Link href={`/${locale}/register`}>
                    <Button variant="primary">{t('navbar.register')}</Button>
                  </Link>
                </div>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden"
                aria-label={t('navbar.openMenu')}
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
