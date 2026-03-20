'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuthLoading } from '@/stores/authStore';
import { FavoritesManager } from '@/components/favorites';
import { FavoriteConfig } from '@/hooks/useFavorites';
import type { ConfigType } from '@/lib/supabase/database.types';
import { useTranslations } from 'next-intl';

export default function FavoritesPage() {
  const t = useTranslations();
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/favorites');
    }
  }, [user, loading, router]);

  const handleApply = (config: FavoriteConfig, configType: ConfigType) => {
    switch (configType) {
      case 'oracle_config':
        router.push(
          `/cross-oracle?oracles=${config.selectedOracles?.join(',')}&symbol=${config.symbol}`
        );
        break;
      case 'symbol':
        router.push(`/price-query?symbol=${config.symbol}`);
        break;
      case 'chain_config':
        router.push(`/cross-chain?chain=${config.chain}`);
        break;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-insight min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 w-48 mb-2" />
          <div className="h-4 bg-gray-200 w-64 mb-8" />
          <div className="h-10 bg-gray-200 w-full mb-4" />
          <div className="flex gap-2 mb-6">
            <div className="h-10 bg-gray-200 w-24" />
            <div className="h-10 bg-gray-200 w-24" />
            <div className="h-10 bg-gray-200 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-insight min-h-screen rounded-lg">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-danger-500 flex items-center justify-center border border-danger-600 rounded-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('favorites.page.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('favorites.page.subtitle')}</p>
          </div>
        </div>
      </div>

      <FavoritesManager onApply={handleApply} />
    </div>
  );
}
