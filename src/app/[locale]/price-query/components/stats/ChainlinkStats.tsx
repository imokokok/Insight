import { Hash, Layers, Settings, FileText, History, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface ChainlinkStatsProps {
  roundId?: string;
  answeredInRound?: string;
  decimals?: number;
  version?: string | bigint;
  startedAt?: number;
  source?: string;
}

export function ChainlinkStats({
  roundId,
  answeredInRound,
  decimals,
  version,
  startedAt,
  source,
}: ChainlinkStatsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Hash className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.roundId') || 'Round ID'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono truncate" title={roundId}>
          {roundId ? `#${roundId.slice(-6)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.answeredInRound') || 'Answered In'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono truncate" title={answeredInRound}>
          {answeredInRound ? `#${answeredInRound.slice(-6)}` : '-'}
        </p>
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
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.version') || 'Version'}
          </p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{version ?? '-'}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <History className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.roundStarted') || 'Round Started'}
          </p>
        </div>
        <p className="text-sm font-bold text-gray-900">
          {startedAt ? new Date(startedAt).toLocaleTimeString() : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('priceQuery.stats.feedDescription') || 'Feed'}
          </p>
        </div>
        <p className="text-sm font-bold text-gray-900 truncate" title={source}>
          {source || '-'}
        </p>
      </div>
    </>
  );
}
