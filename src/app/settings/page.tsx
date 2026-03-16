'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SettingsLayout,
  ProfilePanel,
  PreferencesPanel,
  NotificationPanel,
  DataManagementPanel,
} from '@/components/settings';
import type { SettingsTab } from '@/components/settings';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/settings');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dune">
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
    <div className="bg-dune min-h-screen">
      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'profile' && <ProfilePanel />}
        {activeTab === 'preferences' && <PreferencesPanel />}
        {activeTab === 'notifications' && <NotificationPanel />}
        {activeTab === 'data' && <DataManagementPanel />}
      </SettingsLayout>
    </div>
  );
}
