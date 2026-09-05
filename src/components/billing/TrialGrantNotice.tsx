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
      <div className="relative flex items-start gap-4 border border-emerald-300 bg-[#f8f7f4] p-4">
        <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden="true" />
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-emerald-300 bg-emerald-50">
          <Gift className="h-4 w-4 text-emerald-700" />
        </div>
        <div className="flex-1 text-sm">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700">
            Trial credit issued
          </p>
          <p className="font-semibold text-slate-900">You&apos;ve got 100 free trial credits!</p>
          <p className="text-slate-600 mt-0.5">
            Sample the API now — then{' '}
            <Link href="/pricing" className="font-semibold text-blue-700 underline">
              view plans
            </Link>{' '}
            to keep going with a subscription or top-up.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissTrialNotice}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-slate-900/15 text-slate-500 transition-colors hover:border-blue-600 hover:text-blue-700"
          aria-label="Dismiss trial notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
