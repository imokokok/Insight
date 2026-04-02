'use client';

import { memo, useCallback, useMemo } from 'react';

import Link from 'next/link';

import {
  ChevronRight,
  Clock,
  Link2,
  Database,
  Activity,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

import { Tooltip } from '@/components/ui/Tooltip';
import { useHoverPrefetch } from '@/hooks';
import { useTranslations, useLocale } from '@/i18n';
import { formatCompactNumber } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';

const logger = createLogger('OraclePrefetchCard');

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface OracleMetadata {
  updateFrequency: string;
  supportedChains: number;
  dataSources: number;
  lastUpdated: string;
  healthStatus: HealthStatus;
}

interface OraclePrefetchCardProps {
  name: string;
  value: number;
  color: string;
  tvs: string;
  chains: number;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (name: string) => void;
  onHover: (name: string | null) => void;
  metadata?: OracleMetadata;
}

const oracleRouteMap: Record<string, string> = {
  Chainlink: '/chainlink',
  'Pyth Network': '/pyth-network',
  'Band Protocol': '/band-protocol',
  API3: '/api3',
  UMA: '/uma',
  RedStone: '/redstone',
  DIA: '/dia',
  Tellor: '/tellor',
  Chronicle: '/chronicle',
  WINkLink: '/winklink',
};

const oracleProviderMap: Record<string, string> = {
  Chainlink: 'chainlink',
  'Pyth Network': 'pyth',
  'Band Protocol': 'band-protocol',
  API3: 'api3',
  UMA: 'uma',
  RedStone: 'redstone',
  DIA: 'dia',
  Tellor: 'tellor',
  Chronicle: 'chronicle',
  WINkLink: 'winklink',
};

const oracleSymbolMap: Record<string, string> = {
  Chainlink: 'LINK',
  'Pyth Network': 'PYTH',
  'Band Protocol': 'BAND',
  API3: 'API3',
  UMA: 'UMA',
  RedStone: 'REDSTONE',
  DIA: 'DIA',
  Tellor: 'TRB',
  Chronicle: 'CHRONICLE',
  WINkLink: 'WINKLINK',
};

type UpdateFrequencyKey =
  | 'heartbeat1h'
  | 'realtime'
  | 'heartbeat5m'
  | 'heartbeat24h'
  | 'onDemand'
  | 'heartbeat1hSimple';
type LastUpdatedKey = 'justNow' | '1minAgo' | '2minAgo' | '3minAgo' | '5minAgo' | '10minAgo';

interface OracleMetadataConfig {
  updateFrequencyKey: UpdateFrequencyKey;
  supportedChains: number;
  dataSources: number;
  lastUpdatedKey: LastUpdatedKey;
  healthStatus: HealthStatus;
}

const defaultMetadataConfig: Record<string, OracleMetadataConfig> = {
  Chainlink: {
    updateFrequencyKey: 'heartbeat1h',
    supportedChains: 18,
    dataSources: 12,
    lastUpdatedKey: 'justNow',
    healthStatus: 'healthy',
  },
  'Pyth Network': {
    updateFrequencyKey: 'realtime',
    supportedChains: 45,
    dataSources: 8,
    lastUpdatedKey: 'justNow',
    healthStatus: 'healthy',
  },
  'Band Protocol': {
    updateFrequencyKey: 'heartbeat5m',
    supportedChains: 25,
    dataSources: 6,
    lastUpdatedKey: '1minAgo',
    healthStatus: 'healthy',
  },
  API3: {
    updateFrequencyKey: 'heartbeat24h',
    supportedChains: 12,
    dataSources: 10,
    lastUpdatedKey: '2minAgo',
    healthStatus: 'healthy',
  },
  UMA: {
    updateFrequencyKey: 'onDemand',
    supportedChains: 8,
    dataSources: 5,
    lastUpdatedKey: '5minAgo',
    healthStatus: 'healthy',
  },
  RedStone: {
    updateFrequencyKey: 'realtime',
    supportedChains: 35,
    dataSources: 15,
    lastUpdatedKey: 'justNow',
    healthStatus: 'healthy',
  },
  DIA: {
    updateFrequencyKey: 'heartbeat5m',
    supportedChains: 30,
    dataSources: 20,
    lastUpdatedKey: '1minAgo',
    healthStatus: 'healthy',
  },
  Tellor: {
    updateFrequencyKey: 'onDemand',
    supportedChains: 10,
    dataSources: 3,
    lastUpdatedKey: '10minAgo',
    healthStatus: 'warning',
  },
  Chronicle: {
    updateFrequencyKey: 'heartbeat1hSimple',
    supportedChains: 3,
    dataSources: 4,
    lastUpdatedKey: '3minAgo',
    healthStatus: 'healthy',
  },
  WINkLink: {
    updateFrequencyKey: 'heartbeat5m',
    supportedChains: 2,
    dataSources: 2,
    lastUpdatedKey: '2minAgo',
    healthStatus: 'healthy',
  },
};

function HealthIndicator({ status }: { status: HealthStatus }) {
  const t = useTranslations();
  const config = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      label: t('crossOracle.oracleCard.healthStatus.healthy'),
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      label: t('crossOracle.oracleCard.healthStatus.warning'),
    },
    critical: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      label: t('crossOracle.oracleCard.healthStatus.critical'),
    },
  };

  const { icon: Icon, color, bgColor, label } = config[status];

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${bgColor}`}
      role="status"
      aria-label={t('crossOracle.oracleCard.ariaLabel.healthStatus', { status: label })}
    >
      <Icon className={`w-3 h-3 ${color}`} aria-hidden="true" />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

function OraclePrefetchCardBase({
  name,
  value,
  color,
  tvs,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  metadata,
}: OraclePrefetchCardProps) {
  const t = useTranslations();
  const tUi = useTranslations('ui');
  const locale = useLocale();
  const provider = oracleProviderMap[name];
  const route = oracleRouteMap[name];
  const config = defaultMetadataConfig[name];

  const oracleMetadata = useMemo(() => {
    if (metadata) return metadata;
    if (!config) return undefined;
    return {
      updateFrequency: t(`crossOracle.oracleCard.updateFrequencies.${config.updateFrequencyKey}`),
      supportedChains: config.supportedChains,
      dataSources: config.dataSources,
      lastUpdated: t(`crossOracle.oracleCard.lastUpdatedTimes.${config.lastUpdatedKey}`),
      healthStatus: config.healthStatus,
    };
  }, [metadata, config, t]);

  const numberFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }, [locale]);

  const percentFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }, [locale]);

  const formatTvs = useCallback((tvsValue: string) => {
    const numericValue = parseFloat(tvsValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numericValue)) {
      return formatCompactNumber(numericValue);
    }
    return tvsValue;
  }, []);

  const formatMarketShare = useCallback(
    (percentValue: number) => {
      return percentFormatter.format(percentValue / 100);
    },
    [percentFormatter]
  );

  const prefetchConfig = useMemo(() => {
    if (!provider) return null;
    return {
      queryKey: ['oracles', 'detail', provider],
      queryFn: async () => {
        const symbol = oracleSymbolMap[name];
        if (!symbol) {
          throw new Error(`No symbol mapping found for ${name}`);
        }
        const response = await fetch(`/api/oracles/${provider}?symbol=${symbol}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to fetch ${provider} data: ${response.status}`
          );
        }
        return response.json();
      },
      staleTime: STALE_TIME_CONFIG.network,
      gcTime: GC_TIME_CONFIG.network,
    };
  }, [provider, name]);

  const { prefetch, cancelPrefetch } = useHoverPrefetch({
    delay: 200,
    enabled: !!prefetchConfig,
    onSuccess: () => {
      logger.debug(`Prefetched data for ${name}`);
    },
    onError: (error) => {
      logger.error(`Failed to prefetch ${name}`, error);
    },
  });

  const handleMouseEnter = useCallback(() => {
    onHover(name);
    if (prefetchConfig) {
      prefetch(prefetchConfig);
    }
  }, [onHover, name, prefetch, prefetchConfig]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
    cancelPrefetch();
  }, [onHover, cancelPrefetch]);

  const handleClick = useCallback(() => {
    onSelect(name);
  }, [onSelect, name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(name);
      }
    },
    [onSelect, name]
  );

  const handleNavClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleNavKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  }, []);

  const renderDetailTooltip = () => {
    if (!oracleMetadata) return null;

    return (
      <div className="w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <span className="font-semibold text-gray-900">{name}</span>
          <HealthIndicator status={oracleMetadata.healthStatus} />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500">
                {t('crossOracle.oracleCard.updateFrequency')}
              </span>
              <p className="text-sm text-gray-900 truncate">{oracleMetadata.updateFrequency}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500">
                {t('crossOracle.oracleCard.supportedChains')}
              </span>
              <p className="text-sm text-gray-900">
                {numberFormatter.format(oracleMetadata.supportedChains)}{' '}
                {t('crossOracle.oracleCard.chains')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500">
                {t('crossOracle.oracleCard.dataSources')}
              </span>
              <p className="text-sm text-gray-900">
                {numberFormatter.format(oracleMetadata.dataSources)}{' '}
                {t('crossOracle.oracleCard.dataSourcesUnit')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500">
                {t('crossOracle.oracleCard.lastUpdated')}
              </span>
              <p className="text-sm text-gray-900">{oracleMetadata.lastUpdated}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('crossOracle.oracleCard.tvs')}: {formatTvs(tvs)}
          </span>
          <span>
            {t('crossOracle.oracleCard.marketShare')}: {formatMarketShare(value)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Tooltip
      content={renderDetailTooltip()}
      placement="right"
      delay={300}
      disabled={!oracleMetadata}
    >
      <div
        className={`px-4 py-2.5 border-b transition-colors cursor-pointer flex items-center justify-between ${
          isSelected ? '' : 'hover:bg-gray-50'
        } ${isHovered && !isHovered ? 'opacity-50' : 'opacity-100'}`}
        style={{
          borderColor: 'var(--gray-100, #f3f4f6)',
          backgroundColor: isSelected ? 'var(--gray-50, #f9fafb)' : 'transparent',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="listitem"
        aria-selected={isSelected}
        aria-label={t('crossOracle.oracleCard.ariaLabel.oracleInfo', {
          name,
          rank: index + 1,
          share: formatMarketShare(value),
          tvs: formatTvs(tvs),
        })}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            className="text-xs font-medium w-5 text-center"
            style={{ color: 'var(--gray-500, #6b7280)' }}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div
            className="w-2.5 h-2.5 flex-shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--gray-900, #111827)' }}
          >
            {name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs" style={{ color: 'var(--gray-500, #6b7280)' }}>
            {formatTvs(tvs)}
          </span>
          <span
            className="text-sm font-semibold w-12"
            style={{ color }}
            aria-label={formatMarketShare(value)}
          >
            {formatMarketShare(value)}
          </span>
          {route && name !== 'Chronicle' && (
            <Link
              href={route}
              onClick={handleNavClick}
              onKeyDown={handleNavKeyDown}
              className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={t('crossOracle.oracleCard.viewDetails', { name })}
            >
              <ChevronRight
                className={`w-4 h-4 transition-colors ${
                  isHovered ? 'text-gray-600' : 'text-gray-400'
                }`}
                aria-hidden="true"
              />
            </Link>
          )}
          {name === 'Chronicle' && (
            <div className="px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
              {tUi('common.comingSoon')}
            </div>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

const OraclePrefetchCard = memo(OraclePrefetchCardBase);

export default OraclePrefetchCard;
export { oracleRouteMap, oracleProviderMap, oracleSymbolMap };
