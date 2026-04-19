'use client';

import Link from 'next/link';

import { LogOut, Settings } from 'lucide-react';

import { Button } from '@/components/ui';
import type { UserProfile } from '@/lib/supabase/auth';

interface UserMenuDropdownProps {
  profile: UserProfile | null;
  userEmail: string | undefined;
  onClose: () => void;
  onSignOut: () => void;
}

export default function UserMenuDropdown({
  profile,
  userEmail,
  onClose,
  onSignOut,
}: UserMenuDropdownProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 py-2 z-50 shadow-lg rounded-md">
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile?.display_name || 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
        </div>
        <div className="py-1">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
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
