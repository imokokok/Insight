import { Hash, Settings, BarChart3, Clock, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface PythStatsProps {
  priceId?: string;
  exponent?: number;
  conf?: number;
  publishTime?: number;
  confidenceInterval?: {
    widthPercentage?: number;
  };
  confidence?: number;
}

export function PythStats({
  priceId,
  exponent,
  conf,
  publishTime,
  confidenceInterval,
  confidence,
}: PythStatsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Hash className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.priceId') || 'Price Feed ID'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono truncate" title={priceId}>
          {priceId ? `${priceId.slice(0, 6)}...${priceId.slice(-4)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.exponent') || 'Exponent'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {exponent !== undefined ? `10^${exponent}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.confidenceAbs') || 'Confidence'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.publishTime') || 'Published'}
          </p>
        </div>
        <p className="text-sm font-bold text-gray-900">
          {publishTime ? new Date(publishTime).toLocaleTimeString() : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.confidenceWidth') || 'Spread %'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.confidenceScore') || 'Confidence Score'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {confidence !== undefined ? `${confidence.toFixed(2)}%` : '-'}
        </p>
      </div>
    </>
  );
}
