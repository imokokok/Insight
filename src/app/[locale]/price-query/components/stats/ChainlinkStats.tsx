import { Hash, Layers, Settings, FileText, History, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

interface ChainlinkStatsProps {
  roundId?: string;
  answeredInRound?: string;
  decimals?: number;
  version?: string | bigint;
  startedAt?: number;
  source?: string;
}

function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: React.ReactNode;
  description?: string;
}) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'group'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <p
        className="text-lg font-bold text-gray-900 font-mono truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
      {description && (
        <div
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg',
            'whitespace-nowrap pointer-events-none',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
          role="tooltip"
        >
          {description}
          <span
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 -mt-1',
              'w-2 h-2 bg-gray-900 border-4 border-gray-900',
              'border-l-transparent border-r-transparent border-b-transparent'
            )}
          />
        </div>
      )}
    </div>
  );
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
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.roundId') || 'Round ID'}
        value={roundId ? `#${roundId.slice(-6)}` : '-'}
        description="当前价格更新轮次的唯一标识符"
      />
      <StatCard
        icon={Layers}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.answeredInRound') || 'Answered In'}
        value={answeredInRound ? `#${answeredInRound.slice(-6)}` : '-'}
        description="提交该轮答案的聚合轮次ID"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.decimals') || 'Decimals'}
        value={decimals ?? '-'}
        description="价格数据的小数位数，用于确定精度"
      />
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.version') || 'Version'}
        value={version ?? '-'}
        description="预言机合约的版本号"
      />
      <StatCard
        icon={History}
        iconColor="text-purple-500"
        title={t('priceQuery.stats.roundStarted') || 'Round Started'}
        value={startedAt ? new Date(startedAt).toLocaleTimeString() : '-'}
        description="当前轮次开始的时间"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.feedDescription') || 'Feed'}
        value={source || '-'}
        description="数据源的描述信息，标识价格来源"
      />
    </>
  );
}
