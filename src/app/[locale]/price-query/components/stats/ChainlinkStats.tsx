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
        title={t('priceQuery.stats.roundId')}
        value={roundId ? `#${roundId.slice(-6)}` : '-'}
        description={t('priceQuery.stats.roundIdDesc')}
      />
      <StatCard
        icon={Layers}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.answeredInRound')}
        value={answeredInRound ? `#${answeredInRound.slice(-6)}` : '-'}
        description={t('priceQuery.stats.answeredInRoundDesc')}
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.decimals')}
        value={decimals ?? '-'}
        description={t('priceQuery.stats.decimalsDesc')}
      />
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.version')}
        value={version ?? '-'}
        description={t('priceQuery.stats.versionDesc')}
      />
      <StatCard
        icon={History}
        iconColor="text-purple-500"
        title={t('priceQuery.stats.roundStarted')}
        value={startedAt ? new Date(startedAt).toLocaleTimeString() : '-'}
        description={t('priceQuery.stats.roundStartedDesc')}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.feedDescription')}
        value={source || '-'}
        description={t('priceQuery.stats.feedDescriptionDesc')}
      />
    </>
  );
}
