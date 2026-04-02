'use client';

import { Heart, Download, RefreshCw } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface PageHeaderProps {
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  onExport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PageHeader({
  onToggleFavorite,
  isFavorite,
  onExport,
  onRefresh,
  isRefreshing,
}: PageHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">{t('navbar.priceQuery')}</h1>

      <div className="flex items-center gap-3">
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`flex items-center gap-2 px-4 py-2 font-medium border transition-colors ${
              isFavorite
                ? 'bg-danger-50 border-danger-200 text-danger-600 hover:border-red-300'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? t('favorited') : t('favorite')}
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            {t('export.export')}
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('actions.refresh')}
          </button>
        )}
      </div>
    </div>
  );
}
