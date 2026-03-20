'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuthLoading, useAuthInitialized } from '@/stores/authStore';
import dynamic from 'next/dynamic';
import type { SettingsTab } from '@/components/settings';
import { useLocale } from 'next-intl';

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
  const initialized = useAuthInitialized();
  const router = useRouter();
  const _pathname = usePathname();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 只有在初始化完成后才检查用户状态
    if (initialized && !loading && !user) {
      // 使用当前语言进行重定向
      const redirectPath = `/${locale}/login?redirect=/${locale}/settings`;
      router.push(redirectPath);
    }
  }, [user, loading, initialized, router, locale]);

  // 等待初始化和挂载完成
  if (loading || !initialized || !mounted) {
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

  // 初始化完成后，如果没有用户，返回 null（正在重定向）
  if (!user) {
    return null;
  }

  return (
    <div className="bg-insight min-h-screen">
      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'profile' && <ProfilePanel />}
        {activeTab === 'preferences' && <PreferencesPanel />}
        {activeTab === 'notifications' && <NotificationPanel />}
        {activeTab === 'data' && <DataManagementPanel />}
      </SettingsLayout>
    </div>
  );
}
