'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('navbar.home') },
    { href: '/price-query', label: t('navbar.priceQuery') },
    { href: '/cross-oracle', label: t('navbar.crossOracle') },
    { href: '/cross-chain', label: t('navbar.crossChain') },
    { href: '/chainlink', label: t('navbar.chainlink') },
    { href: '/band-protocol', label: t('navbar.bandProtocol') },
    { href: '/uma', label: t('navbar.uma') },
    { href: '/pyth-network', label: t('navbar.pythNetwork') },
    { href: '/api3', label: t('navbar.api3') },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    const currentPath = pathname.split('?')[0]; // 移除查询参数
    if (href === '/') {
      return currentPath === '/';
    }
    return currentPath === href;
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

          <div className="hidden lg:flex items-center space-x-1 mx-auto">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-all duration-300 text-sm font-medium px-3 py-2 rounded-lg relative ${
                    active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg
                className={`h-6 w-6 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 max-h-96 overflow-y-auto">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
