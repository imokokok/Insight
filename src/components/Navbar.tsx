'use client';

import { useEffect, useState, useMemo } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Menu, User } from 'lucide-react';

import { Button } from '@/components/ui';
import { useKeyboardShortcuts } from '@/hooks';
import { apiClient } from '@/lib/api/client/ApiClient';
import { useUser, useProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';

import {
  DropdownMenu,
  MegaMenu,
  MobileDrawer,
  UserMenuDropdown,
  navigationConfig,
} from './navigation';
import { type NavGroup, type NavStructure } from './navigation/types';
import { SearchButton } from './search/SearchButton';

const GlobalSearch = dynamic(() => import('./search').then((m) => m.GlobalSearch), { ssr: false });

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
  const [opsOwnerUserId, setOpsOwnerUserId] = useState<string | null>(null);
  const isOpsOwner = Boolean(user && opsOwnerUserId === user.id);

  // Resolve the UX-only Console link after the client auth store initializes.
  // Keeping this check out of the root Server Component lets public pages stay
  // static/ISR. /ops itself remains protected by requireOpsOwner() server-side.
  useEffect(() => {
    let active = true;

    if (loading || !user) {
      return () => {
        active = false;
      };
    }

    void apiClient
      .get<{ isOpsOwner: boolean }>('/api/auth/ops-status', { cache: 'no-store' })
      .then(({ data }) => {
        if (active) setOpsOwnerUserId(data.isOpsOwner ? user.id : null);
      })
      .catch(() => {
        // Navigation visibility is not an authorization boundary. Fail closed
        // and leave the server-side /ops gate as the source of truth.
        if (active) setOpsOwnerUserId(null);
      });

    return () => {
      active = false;
    };
  }, [loading, user]);

  const navItems: NavStructure = navigationConfig;

  const currentPath = useMemo(() => {
    if (!pathname) return '/';
    const pathWithoutQuery = pathname.split('?')[0];
    return pathWithoutQuery;
  }, [pathname]);

  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/');
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
      <nav className="sticky top-0 z-40 border-b border-slate-900/15 bg-[#f8f7f4]">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-10">
          <div className="flex h-[68px] justify-between">
            <div className="flex items-center">
              <Link href="/" className="group flex flex-shrink-0 items-center gap-2.5">
                <Image
                  src="/logos/insight-glacier-cut.svg"
                  alt="Insight Logo"
                  width={28}
                  height={34}
                  priority
                />
                <div>
                  <div className="text-xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-primary-700">
                    Insight
                  </div>
                  <div className="hidden font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 xl:block">
                    Oracle evidence
                  </div>
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center justify-center space-x-0.5">
              {navItems.map((navItem) => {
                if ('items' in navItem) {
                  const group = navItem as NavGroup;
                  const isGroupActive = group.items.some((item) => isActive(item.href));

                  if (group.megaMenu) {
                    return (
                      <MegaMenu
                        key={group.id}
                        group={group}
                        isActive={isGroupActive}
                        currentPath={currentPath}
                      />
                    );
                  }

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
                    className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-600 hover:border-slate-300 hover:text-primary-700'
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
                  <div className="relative ml-1">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="menu"
                      className="flex items-center gap-2 border border-transparent p-1.5 transition-colors hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-primary-700 text-sm font-medium text-white">
                        {profile?.avatar_url && !avatarError ? (
                          <Image
                            key={profile.avatar_url}
                            src={profile.avatar_url}
                            alt={profile?.display_name || 'User'}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                            unoptimized
                          />
                        ) : null}
                        <span className={profile?.avatar_url && !avatarError ? 'hidden' : ''}>
                          {profile?.display_name?.[0]?.toUpperCase() ||
                            user.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                        </span>
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <UserMenuDropdown
                        profile={profile}
                        userEmail={user.email}
                        isOpsOwner={isOpsOwner}
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
          navStructure={navItems}
          currentPath={currentPath}
          isOpsOwner={isOpsOwner}
        />
      </nav>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
