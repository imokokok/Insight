import { Hash, Layers, Settings, FileText, History, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
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
