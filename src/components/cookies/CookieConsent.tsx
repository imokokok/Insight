'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import {
  DEFAULT_PREFERENCES,
  loadConsent,
  saveConsent,
  type CookiePreferences,
} from '@/lib/cookies/consent';
import { cn } from '@/lib/utils';

/**
 * GDPR / ePrivacy compliant cookie consent banner. Displayed on first visit
 * until the user makes a choice. Non-essential tracking scripts must wait for
 * explicit opt-in.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (loadConsent()) return;
    // Small delay so the banner doesn't flash during initial hydration
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, functional: true });
    setVisible(false);
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, analytics: false, functional: false });
    setVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent(prefs);
    setVisible(false);
    setShowPrefs(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2',
        'w-[calc(100vw-2rem)] max-w-2xl',
        'border border-slate-900/20 bg-[#f8f7f4]'
      )}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-primary-700">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-4-4 4 4 0 0 1-4-4z" />
              <circle cx="8.5" cy="8.5" r="1" />
              <circle cx="15" cy="11" r="1" />
              <circle cx="9" cy="14" r="1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="cookie-consent-title" className="text-base font-semibold text-gray-900">
              Cookie Preferences
            </h3>
            <p id="cookie-consent-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
              We use cookies to operate the platform, analyze usage, and improve your experience.
              You can choose which categories to allow. See our{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </div>
        </div>

        {showPrefs && (
          <div className="mb-4 space-y-3 border-y border-slate-900/15 bg-white/55 p-3">
            <label className="flex items-start gap-3 cursor-not-allowed">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-0.5 h-4 w-4 border-gray-300 text-primary-600"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Essential (Required)</div>
                <div className="text-xs text-gray-500">
                  Authentication, session, security. Always on.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                className="mt-0.5 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Analytics & Performance</div>
                <div className="text-xs text-gray-500">
                  Vercel Analytics, Speed Insights, Sentry. Helps us understand usage and fix bugs.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.functional}
                onChange={(e) => setPrefs((p) => ({ ...p, functional: e.target.checked }))}
                className="mt-0.5 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Functional</div>
                <div className="text-xs text-gray-500">
                  Remember your preferences and personalized settings.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {!showPrefs ? (
            <>
              <Button onClick={handleAcceptAll} size="sm" className="flex-1 whitespace-nowrap">
                Accept all
              </Button>
              <Button
                onClick={handleRejectNonEssential}
                variant="secondary"
                size="sm"
                className="flex-1 whitespace-nowrap"
              >
                Reject non-essential
              </Button>
              <Button
                onClick={() => setShowPrefs(true)}
                variant="ghost"
                size="sm"
                className="flex-1 whitespace-nowrap"
              >
                Preferences
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSavePreferences}
                size="sm"
                className="flex-1 whitespace-nowrap"
              >
                Save preferences
              </Button>
              <Button
                onClick={() => {
                  setShowPrefs(false);
                  setPrefs(DEFAULT_PREFERENCES);
                }}
                variant="ghost"
                size="sm"
                className="flex-1 whitespace-nowrap"
              >
                Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
