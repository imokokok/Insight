'use client';

import { Suspense, useState, useMemo, useRef } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useKeyboardShortcuts } from '@/hooks/ui/useKeyboardShortcuts';

import { DropdownMenu, MegaMenu, MobileDrawer, navigationConfig } from './navigation';
import {
  isNavigationGroupActive,
  isNavigationLinkActive,
} from './navigation/isNavigationLinkActive';
import { type NavGroup, type NavStructure } from './navigation/types';
import { SearchButton } from './search/SearchButton';

const GlobalSearch = dynamic(() => import('./search').then((m) => m.GlobalSearch), { ssr: false });
const AuthNavigation = dynamic(
  () => import('./navigation/AuthNavigation').then((m) => m.AuthNavigation),
  { ssr: false }
);

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarContent currentSearch="" />}>
      <NavbarSearchAware />
    </Suspense>
  );
}

function NavbarSearchAware() {
  const searchParams = useSearchParams();

  return <NavbarContent currentSearch={searchParams.toString()} />;
}

function NavbarContent({ currentSearch }: { currentSearch: string }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOpsOwner, setIsOpsOwner] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const navItems: NavStructure = navigationConfig;

  const currentPath = useMemo(() => {
    if (!pathname) return '/';
    const pathWithoutQuery = pathname.split('?')[0];
    return pathWithoutQuery;
  }, [pathname]);
  const isActive = (href: string) => {
    return isNavigationLinkActive(href, currentPath, currentSearch);
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
      <nav className="site-navbar sticky top-0 z-40 border-b border-slate-900/10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-10">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/" className="group flex flex-shrink-0 items-center gap-2.5">
                <Image
                  src="/logos/insight-glacier-cut.svg"
                  alt="Insight Logo"
                  width={28}
                  height={34}
                  priority
                  className="h-[34px] w-auto"
                />
                <div className="leading-none">
                  <div className="font-display text-xl font-bold tracking-[-0.04em] text-slate-950 transition-colors group-hover:text-primary-700">
                    Insight
                  </div>
                  <div className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-slate-400 xl:block">
                    Oracle evidence
                  </div>
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center justify-center space-x-0.5">
              {navItems.map((navItem) => {
                if ('items' in navItem) {
                  const group = navItem as NavGroup;
                  const isGroupActive = isNavigationGroupActive(
                    group.items,
                    currentPath,
                    currentSearch
                  );

                  if (group.megaMenu) {
                    return (
                      <MegaMenu
                        key={group.id}
                        group={group}
                        isActive={isGroupActive}
                        currentPath={currentPath}
                        currentSearch={currentSearch}
                      />
                    );
                  }

                  return (
                    <DropdownMenu
                      key={group.id}
                      group={group}
                      isActive={isGroupActive}
                      currentPath={currentPath}
                      currentSearch={currentSearch}
                    />
                  );
                }

                const item = navItem;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-600 hover:border-slate-300 hover:text-primary-700'
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <SearchButton onClick={() => setIsSearchOpen(true)} />

              <AuthNavigation onOpsOwnerChange={setIsOpsOwner} />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden"
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
                ref={mobileMenuTriggerRef}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navStructure={navItems}
          currentPath={currentPath}
          currentSearch={currentSearch}
          isOpsOwner={isOpsOwner}
          triggerRef={mobileMenuTriggerRef}
        />
      </nav>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
