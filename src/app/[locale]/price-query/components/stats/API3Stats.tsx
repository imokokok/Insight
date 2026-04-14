import { FileText, Hash, Globe, Settings, Clock, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

interface API3StatsProps {
  dapiName?: string;
  proxyAddress?: string;
  chain?: string;
  decimals?: number;
  dataAge?: number;
  confidence?: number;
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
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.dapiName') || 'dAPI Name'}
        value={dapiName || '-'}
        description="API3 去中心化 API 的名称标识"
      />
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.proxyAddress') || 'Proxy'}
        value={proxyAddress ? `${proxyAddress.slice(0, 6)}...${proxyAddress.slice(-4)}` : '-'}
        description="链上代理合约地址，用于读取价格数据"
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.blockchain') || 'Blockchain'}
        value={chain || '-'}
        description="部署该数据源的区块链网络"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.decimals') || 'Decimals'}
        value={decimals ?? '-'}
        description="价格数据的小数位数，用于确定精度"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title={t('priceQuery.stats.dataAge') || 'Data Age'}
        value={
          dataAge !== undefined
            ? dataAge < 60000
              ? `${Math.round(dataAge / 1000)}s`
              : `${Math.round(dataAge / 60000)}m`
            : '-'
        }
        description="距离上次价格更新的时间间隔"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.confidenceScore') || 'Confidence'}
        value={confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : '-'}
        description="价格数据的置信度评分，越高表示数据越可靠"
      />
    </>
  );
}
