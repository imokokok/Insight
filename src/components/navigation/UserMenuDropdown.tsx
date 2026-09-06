'use client';

import Link from 'next/link';

import { LogOut, Settings, Gauge } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/lib/supabase/auth';

interface UserMenuDropdownProps {
  profile: UserProfile | null;
  userEmail: string | undefined;
  isOpsOwner?: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export default function UserMenuDropdown({
  profile,
  userEmail,
  isOpsOwner = false,
  onClose,
  onSignOut,
}: UserMenuDropdownProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 z-50 mt-2 w-64 border border-slate-900/15 bg-[#f8f7f4] py-2">
        <div className="border-b border-slate-900/15 px-4 py-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-blue-700">
            Account record
          </p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile?.display_name || 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
        </div>
        <div className="py-1">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2 border-b border-slate-900/10 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-white/70 hover:text-blue-700"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {isOpsOwner && (
            <Link
              href="/ops"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-white/70 hover:text-blue-700"
            >
              <Gauge className="w-4 h-4" />
              Console
            </Link>
          )}
        </div>
        <div className="border-t border-gray-100 py-1">
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Log Out
          </Button>
        </div>
      </div>
    </>
  );
}
