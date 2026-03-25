'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from '@/i18n';
import { Home, BarChart3, Search, Bell, Settings, Menu, X, Heart, Activity } from 'lucide-react';

import { Icon } from '@/components/ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface BottomNavigationProps {
  className?: string;
  onMoreClick?: () => void;
}

export function BottomNavigation({ className = '', onMoreClick }: BottomNavigationProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Main navigation items (always visible)
  const mainNavItems: NavItem[] = [
    { href: '/', label: t('navbar.home'), icon: Home },
    { href: '/market-overview', label: t('navbar.marketOverview'), icon: BarChart3 },
    { href: '/price-query', label: t('navbar.priceQuery'), icon: Search },
    { href: '/alerts', label: t('navbar.alerts'), icon: Bell, badge: 0 },
  ];

  // More menu items
  const moreNavItems: NavItem[] = [
    { href: '/favorites', label: t('navbar.favorites'), icon: Heart },
    { href: '/cross-oracle', label: t('navbar.crossOracle'), icon: Activity },
    { href: '/cross-chain', label: t('navbar.crossChain'), icon: BarChart3 },
    { href: '/settings', label: t('navbar.settings'), icon: Settings },
  ];

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') {
        return pathname === '/' || pathname === '/zh-CN/' || pathname === '/en/';
      }
      return pathname.includes(href);
    },
    [pathname]
  );

  const handleMoreClick = useCallback(() => {
    setShowMore(!showMore);
    onMoreClick?.();
  }, [showMore, onMoreClick]);

  const handleItemClick = useCallback(() => {
    setShowMore(false);
  }, []);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-14">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleItemClick}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] transition-colors ${
                  active ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={handleMoreClick}
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] transition-colors ${
              showMore ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label={t('navbar.menu')}
            aria-expanded={showMore}
          >
            {showMore ? (
              <X className="w-5 h-5" strokeWidth={2.5} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={2} />
            )}
            <span className="text-[10px] mt-0.5">{t('navbar.menu')}</span>
          </button>
        </div>
      </nav>

      {/* More Menu Overlay */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-30 animate-fade-in"
            onClick={() => setShowMore(false)}
          />

          {/* More Menu Panel */}
          <div className="fixed bottom-16 left-4 right-4 bg-white rounded-lg shadow-lg z-40 animate-slide-in-up overflow-hidden">
            <div className="p-2">
              <div className="grid grid-cols-4 gap-2">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleItemClick}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-h-[72px] ${
                        active
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                      <span className="text-xs text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Oracle Access */}
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs text-gray-500 mb-2 px-1">{t('navbar.oracleDetails')}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { href: '/chainlink', label: 'Chainlink', color: '#375bd2' },
                  { href: '/pyth-network', label: 'Pyth', color: '#e6c200' },
                  { href: '/band-protocol', label: 'Band', color: '#46288b' },
                  { href: '/api3', label: 'API3', color: '#7c3aed' },
                ].map((oracle) => (
                  <Link
                    key={oracle.href}
                    href={oracle.href}
                    onClick={handleItemClick}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors active:scale-95"
                    style={{
                      borderColor: `${oracle.color}40`,
                      color: oracle.color,
                      backgroundColor: `${oracle.color}10`,
                    }}
                  >
                    {oracle.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spacer for fixed navigation */}
      <div className="h-14" />
    </>
  );
}

export default BottomNavigation;
