'use client';

import { RefreshCw, ExternalLink } from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface ActionButtonsProps {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
  themeColor: string;
}

export function ActionButtons({
  onRefresh,
  onExport,
  isRefreshing,
  themeColor,
}: ActionButtonsProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{t('common.refresh')}</span>
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-all shadow-sm"
        style={{ backgroundColor: themeColor }}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('common.export')}</span>
      </button>
    </div>
  );
}
