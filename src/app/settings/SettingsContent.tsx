'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { SectionErrorBoundary } from '@/components/error-boundary';
import type { SettingsTab } from '@/components/settings';
import { useUser, useAuthLoading, useAuthInitialized } from '@/stores/authStore';

const SettingsLayout = dynamic(() =>
  import('@/components/settings').then((mod) => mod.SettingsLayout)
);

const ProfilePanel = dynamic(() => import('@/components/settings').then((mod) => mod.ProfilePanel));

const PreferencesPanel = dynamic(() =>
  import('@/components/settings').then((mod) => mod.PreferencesPanel)
);

const NotificationPanel = dynamic(() =>
  import('@/components/settings').then((mod) => mod.NotificationPanel)
);

const DataManagementPanel = dynamic(() =>
  import('@/components/settings').then((mod) => mod.DataManagementPanel)
);

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function SettingsContent() {
  const user = useUser();
  const loading = useAuthLoading();
  const initialized = useAuthInitialized();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const isClient = useIsClient();

  useEffect(() => {
    if (initialized && !loading && !user) {
      const redirectPath = `/login?redirect=/settings`;
      router.push(redirectPath);
    }
  }, [user, loading, initialized, router]);

  if (loading || !initialized || !isClient) {
    return (
      <div className="min-h-screen bg-insight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gray-200" />
              <div>
                <div className="h-6 bg-gray-200 w-24 mb-2" />
                <div className="h-4 bg-gray-200 w-48" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-64 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-200" />
                ))}
              </div>
              <div className="flex-1">
                <div className="h-96 bg-gray-200" />
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
    <div className="bg-insight min-h-screen rounded-lg">
      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <SectionErrorBoundary componentName="SettingsPanel">
          {activeTab === 'profile' && <ProfilePanel />}
          {activeTab === 'preferences' && <PreferencesPanel />}
          {activeTab === 'notifications' && <NotificationPanel />}
          {activeTab === 'data' && <DataManagementPanel />}
        </SectionErrorBoundary>
      </SettingsLayout>
    </div>
  );
}
