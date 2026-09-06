'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { User } from 'lucide-react';

import { TrialGrantNotice } from '@/components/billing/TrialGrantNotice';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client/ApiClient';
import { setUser } from '@/lib/monitoring';
import {
  useUser,
  useProfile,
  useAuthLoading,
  useAuthActions,
  useAuthStore,
} from '@/stores/authStore';
import { useRealtimeStore } from '@/stores/realtimeStore';

import UserMenuDropdown from './UserMenuDropdown';

export function AuthNavigation({
  onOpsOwnerChange,
}: {
  onOpsOwnerChange: (isOwner: boolean) => void;
}) {
  const user = useUser();
  const profile = useProfile();
  const loading = useAuthLoading();
  const { signOut } = useAuthActions();
  const initializeAuth = useAuthStore((state) => state.initialize);
  const cleanupAuth = useAuthStore((state) => state.cleanup);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isOpsOwner, setIsOpsOwner] = useState(false);

  useEffect(() => {
    void initializeAuth();
    return cleanupAuth;
  }, [initializeAuth, cleanupAuth]);

  useEffect(() => {
    setUser(user);
    if (!user) useRealtimeStore.getState().reset();
  }, [user]);

  useEffect(() => {
    let active = true;
    if (loading || !user) {
      onOpsOwnerChange(false);
      return () => {
        active = false;
      };
    }

    void apiClient
      .get<{ isOpsOwner: boolean }>('/api/auth/ops-status', { cache: 'no-store' })
      .then(({ data }) => {
        if (!active) return;
        setIsOpsOwner(data.isOpsOwner);
        onOpsOwnerChange(data.isOpsOwner);
      })
      .catch(() => {
        if (!active) return;
        setIsOpsOwner(false);
        onOpsOwnerChange(false);
      });

    return () => {
      active = false;
    };
  }, [loading, user, onOpsOwnerChange]);

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <TrialGrantNotice />
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
                    alt={profile.display_name || 'User'}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : null}
                <span className={profile?.avatar_url && !avatarError ? 'hidden' : ''}>
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || (
                    <User className="h-4 w-4" />
                  )}
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
    </>
  );
}
