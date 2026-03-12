'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from './LanguageSwitcher';
import { DropdownMenu, MobileDrawer, navigationConfig } from './navigation';
import { NavGroup } from './navigation/types';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center group">
              <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                Insight
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationConfig.map((navItem) => {
              if ('items' in navItem) {
                const group = navItem as NavGroup;
                const isGroupActive = group.items.some(item => isActive(item.href));

                return (
                  <DropdownMenu
                    key={group.id}
                    group={group}
                    isActive={isGroupActive}
                    currentPath={currentPath}
                  />
                );
              }

              // Single item
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

          {/* Right side - Language & Mobile menu */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {/* Mobile menu button */}
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

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navStructure={navigationConfig}
        currentPath={currentPath}
      />
    </nav>
  );
}
