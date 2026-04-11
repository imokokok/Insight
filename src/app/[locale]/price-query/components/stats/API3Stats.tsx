import { FileText, Hash, Globe, Settings, Clock, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface API3StatsProps {
  dapiName?: string;
  proxyAddress?: string;
  chain?: string;
  decimals?: number;
  dataAge?: number;
  confidence?: number;
}

export function API3Stats({
  dapiName,
  proxyAddress,
  chain,
  decimals,
  dataAge,
  confidence,
}: API3StatsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.dapiName') || 'dAPI Name'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{dapiName || '-'}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Hash className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.proxyAddress') || 'Proxy'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono truncate" title={proxyAddress}>
          {proxyAddress ? `${proxyAddress.slice(0, 6)}...${proxyAddress.slice(-4)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.blockchain') || 'Blockchain'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900">{chain || '-'}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.decimals') || 'Decimals'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{decimals ?? '-'}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.dataAge') || 'Data Age'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900">
          {dataAge !== undefined
            ? dataAge < 60000
              ? `${Math.round(dataAge / 1000)}s`
              : `${Math.round(dataAge / 60000)}m`
            : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.confidenceScore') || 'Confidence'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : '-'}
        </p>
      </div>
    </>
  );
}
