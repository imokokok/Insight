'use client';

import Link from 'next/link';

import { Gift, X } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';

/**
 * Ephemeral toast shown once right after the one-time signup trial credit is
 * claimed (see POST /api/billing/signup-grant and authStore.claimSignupGrant).
 * `trialGranted` is intentionally never persisted, so this only appears in the
 * session where the grant was actually issued. The element mounts only once
 * the flag flips true, so `animate-fade-in` plays exactly once.
 */
export function TrialGrantNotice() {
  const trialGranted = useAuthStore((state) => state.trialGranted);
  const dismissTrialNotice = useAuthStore((state) => state.dismissTrialNotice);

  if (!trialGranted) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,520px)] animate-fade-in">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white/95 backdrop-blur shadow-lg p-4">
        <Gift className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-slate-900">You&apos;ve got 30 free trial credits!</p>
          <p className="text-slate-600 mt-0.5">
            Sample the API now — then{' '}
            <Link href="/pricing" className="font-semibold underline">
              view plans
            </Link>{' '}
            to keep going with a subscription or top-up.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissTrialNotice}
          className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          aria-label="Dismiss trial notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
