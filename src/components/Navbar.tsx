'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User, LogOut, Heart, Bell, Settings } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { DropdownMenu, MobileDrawer, navigationConfig, userNavigationConfig } from './navigation';
import { NavGroup } from './navigation/types';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, profile, signOut, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const currentPath = useMemo(() => {
    if (!pathname) return '/';
    return pathname.split('?')[0];
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

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center group">
              <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
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
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative ${
                    active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  <span>{t(item.label)}</span>
                  {active && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {user && !loading ? (
              <div className="hidden lg:flex items-center gap-1">
                <Link
                  href="/favorites"
                  className={`p-2 rounded-lg transition-colors ${
                    isActive('/favorites')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  title={t('navbar.favorites')}
                >
                  <Heart className="w-5 h-5" />
                </Link>
                <Link
                  href="/alerts"
                  className={`p-2 rounded-lg transition-colors ${
                    isActive('/alerts')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  title={t('navbar.alerts')}
                >
                  <Bell className="w-5 h-5" />
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                      {profile?.display_name?.[0]?.toUpperCase() ||
                        user.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {profile?.display_name || '用户'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            {t('navbar.settings')}
                          </Link>
                        </div>
                        <div className="border-t border-gray-100 py-1">
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('navbar.signOut')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : !loading ? (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {t('navbar.login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('navbar.register')}
                </Link>
              </div>
            ) : null}

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('navbar.openMenu')}
            >
              <Menu className="w-6 h-6" />
            </button>
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
  );
}
