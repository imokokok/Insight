'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuthLoading } from '@/stores/authStore';
import dynamic from 'next/dynamic';
import type { SettingsTab } from '@/components/settings';
import { getValidLocale } from '@/i18n/routing';

// 动态导入设置组件
const SettingsLayout = dynamic(
  () => import('@/components/settings').then((mod) => mod.SettingsLayout),
  { ssr: false }
);

const ProfilePanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.ProfilePanel),
  { ssr: false }
);

const PreferencesPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.PreferencesPanel),
  { ssr: false }
);

const NotificationPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.NotificationPanel),
  { ssr: false }
);

const DataManagementPanel = dynamic(
  () => import('@/components/settings').then((mod) => mod.DataManagementPanel),
  { ssr: false }
);

export default function SettingsPage() {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [mounted, setMounted] = useState(false);

  // 从路径或浏览器语言检测语言
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    setMounted(true);
    // 检测语言
    const browserLocale = navigator.language;
    const validLocale = getValidLocale(browserLocale);
    setLocale(validLocale);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // 使用检测到的语言进行重定向
      const redirectPath = `/${locale}/login?redirect=/${locale}/settings`;
      router.push(redirectPath);
    }
  }, [user, loading, router, locale]);

  if (loading || !mounted) {
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
