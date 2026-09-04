'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { AnimatePresence, motion } from 'framer-motion';

import { SectionErrorBoundary } from '@/components/error-boundary';
import type { SettingsTab } from '@/components/settings';
import { useUser, useAuthLoading, useAuthInitialized } from '@/stores/authStore';

const SettingsLayout = dynamic(
  () => import('@/components/settings').then((mod) => mod.SettingsLayout),
  { loading: () => <div className="min-h-screen" /> }
);

const ProfilePanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.ProfilePanel),
  {
    loading: () => <PanelLoadingSkeleton />,
  }
);

const PreferencesPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.PreferencesPanel),
  { loading: () => <PanelLoadingSkeleton /> }
);

const DataManagementPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.DataManagementPanel),
  { loading: () => <PanelLoadingSkeleton /> }
);

const ApiKeysPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.ApiKeysPanel),
  { loading: () => <PanelLoadingSkeleton /> }
);

const BillingPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.BillingPanel),
  { loading: () => <PanelLoadingSkeleton /> }
);

function PanelLoadingSkeleton() {
  return (
    <div className="border-y border-slate-900/15 bg-white/55 p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 w-40 rounded-xl" />
        <div className="h-4 bg-slate-200 w-64 rounded-xl" />
        <div className="h-10 bg-slate-200 w-full rounded-xl" />
        <div className="h-10 bg-slate-200 w-full rounded-xl" />
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

export default function SettingsContent() {
  const user = useUser();
  const loading = useAuthLoading();
  const initialized = useAuthInitialized();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const isClient = useIsClient();

  useEffect(() => {
    if (initialized && !loading && !user) {
      // Preserve the current path (including ?tab=billing) so the user returns
      // to the same settings tab after login.
      const currentPath =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/settings';
      const redirectPath = `/login?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectPath);
    }
  }, [user, loading, initialized, router]);

  // Read `tab` query param to support deep-linking (e.g. NOWPayments checkout
  // success_url redirects to /settings?tab=billing&status=success).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'preferences', 'data', 'api-keys', 'billing'].includes(tab)) {
      // This is intentional one-way hydration from the URL on initial client mount;
      // it does not cause cascading renders because it runs once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab as SettingsTab);
    }
  }, []);

  if (loading || !initialized || !isClient) {
    return (
      <div className="editorial-workspace min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-200 rounded-xl" />
              <div>
                <div className="h-6 bg-slate-200 w-24 mb-2 rounded-xl" />
                <div className="h-4 bg-slate-200 w-48 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-64 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-slate-200 rounded-xl" />
                ))}
              </div>
              <div className="flex-1">
                <div className="h-96 bg-slate-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <motion.div
      className="editorial-workspace min-h-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <SectionErrorBoundary componentName="SettingsPanel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={activeTab} {...pageTransition}>
              {activeTab === 'profile' && <ProfilePanel />}
              {activeTab === 'preferences' && <PreferencesPanel />}
              {activeTab === 'data' && <DataManagementPanel />}
              {activeTab === 'api-keys' && <ApiKeysPanel />}
              {activeTab === 'billing' && <BillingPanel />}
            </motion.div>
          </AnimatePresence>
        </SectionErrorBoundary>
      </SettingsLayout>
    </motion.div>
  );
}
