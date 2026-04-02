'use client';

import { useMemo, useState, useCallback, memo } from 'react';

import {
  Info,
  Zap,
  Globe,
  Shield,
  Scale,
  Clock,
  Coins,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

type SortColumn = 'name' | 'symbols' | 'latency' | 'frequency';

interface SortHeaderProps {
  column: SortColumn;
  children: React.ReactNode;
  className?: string;
  sortColumn: SortColumn;
  sortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
}

const SortHeaderComponent = ({
  column,
  children,
  className,
  sortColumn,
  sortDirection,
  onSort,
}: SortHeaderProps) => {
  const isActive = sortColumn === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        'flex items-center justify-center gap-1 w-full py-2 px-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:bg-gray-100 transition-colors',
        className
      )}
    >
      {children}
      <span className="inline-flex flex-col">
        <ChevronUp
          className={cn(
            'w-3 h-3 -mb-1',
            isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'
          )}
        />
        <ChevronDown
          className={cn(
            'w-3 h-3',
            isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'
          )}
        />
      </span>
    </button>
  );
};

const SortHeader = memo(SortHeaderComponent);

export interface OracleFeature {
  provider: string;
  name: string;
  symbolCount: number;
  avgLatency: number;
  updateFrequency: string;
  features: string[];
  description: string;
}

interface OracleComparisonMatrixProps {
  oracleFeatures: OracleFeature[];
  selectedOracles: string[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

type FeatureType = 'high-frequency' | 'cross-chain' | 'first-party' | 'dispute-resolution';

interface FeatureConfig {
  key: FeatureType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  {
    key: 'high-frequency',
    label: 'High Frequency',
    shortLabel: 'High Freq',
    icon: <Zap className="w-3 h-3" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    key: 'cross-chain',
    label: 'Cross-Chain',
    shortLabel: 'Cross-Chain',
    icon: <Globe className="w-3 h-3" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'first-party',
    label: 'First-Party',
    shortLabel: '1st Party',
    icon: <Shield className="w-3 h-3" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'dispute-resolution',
    label: 'Dispute Resolution',
    shortLabel: 'Dispute',
    icon: <Scale className="w-3 h-3" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
];

function getFeatureConfig(featureKey: string): FeatureConfig | undefined {
  return FEATURE_CONFIGS.find((f) => f.key === featureKey);
}

function FeatureBadge({ feature }: { feature: string }) {
  const config = getFeatureConfig(feature);

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-gray-50 text-gray-700 border-gray-200">
        {feature}
      </span>
    );
  }

  return (
    <Tooltip content={config.label} placement="top" delay={300}>
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border cursor-help',
          config.bgColor,
          config.color,
          config.borderColor
        )}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{config.shortLabel}</span>
      </span>
    </Tooltip>
  );
}

function OracleNameCell({
  oracle,
  isSelected,
  t,
}: {
  oracle: OracleFeature;
  isSelected: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <Tooltip
        content={
          <div className="max-w-xs">
            <div className="font-semibold text-white mb-1">{oracle.name}</div>
            <div className="text-gray-300 text-xs leading-relaxed">{oracle.description}</div>
          </div>
        }
        placement="right"
        delay={200}
      >
        <div
          className={cn('flex items-center gap-2 cursor-help group', isSelected && 'font-semibold')}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              isSelected ? 'bg-blue-500' : 'bg-gray-400 group-hover:bg-blue-400'
            )}
          />
          <span className="text-gray-900 group-hover:text-blue-600 transition-colors">
            {oracle.name}
          </span>
          <Info className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Tooltip>

      {/* Mobile Description Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="sm:hidden mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            {t('common.hide')}
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            {t('common.details')}
          </>
        )}
      </button>

      {isExpanded && (
        <div className="sm:hidden mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 leading-relaxed">
          {oracle.description}
        </div>
      )}
    </div>
  );
}

function LatencyCell({ latency }: { latency: number }) {
  const getLatencyColor = (ms: number): string => {
    if (ms < 100) return 'text-emerald-600';
    if (ms < 300) return 'text-blue-600';
    if (ms < 500) return 'text-amber-600';
    return 'text-red-600';
  };

  const getLatencyBg = (ms: number): string => {
    if (ms < 100) return 'bg-emerald-50';
    if (ms < 300) return 'bg-blue-50';
    if (ms < 500) return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className="flex items-center justify-center">
      <Tooltip
        content={
          <div>
            <div className="font-semibold text-white">Average Response Time</div>
            <div className="text-gray-300 text-xs mt-1">
              {latency < 100
                ? 'Excellent - Ultra-low latency'
                : latency < 300
                  ? 'Good - Low latency'
                  : latency < 500
                    ? 'Fair - Moderate latency'
                    : 'High - Considerable latency'}
            </div>
          </div>
        }
        placement="top"
        delay={300}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium cursor-help',
            getLatencyBg(latency),
            getLatencyColor(latency)
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          {latency}ms
        </span>
      </Tooltip>
    </div>
  );
}

function SymbolCountCell({ count }: { count: number }) {
  const getCountColor = (c: number): string => {
    if (c >= 1000) return 'text-emerald-600';
    if (c >= 500) return 'text-blue-600';
    if (c >= 100) return 'text-amber-600';
    return 'text-gray-600';
  };

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold text-white">Supported Trading Pairs</div>
          <div className="text-gray-300 text-xs mt-1">
            {count >= 1000
              ? 'Extensive coverage - 1000+ pairs'
              : count >= 500
                ? 'Broad coverage - 500+ pairs'
                : count >= 100
                  ? 'Standard coverage - 100+ pairs'
                  : 'Limited coverage - Under 100 pairs'}
          </div>
        </div>
      }
      placement="top"
      delay={300}
    >
      <div className="flex items-center justify-center gap-1 cursor-help">
        <Coins className={cn('w-4 h-4', getCountColor(count))} />
        <span className={cn('font-medium', getCountColor(count))}>{count.toLocaleString()}</span>
      </div>
    </Tooltip>
  );
}

function UpdateFrequencyCell({ frequency }: { frequency?: string }) {
  const isRealTime = frequency?.toLowerCase().includes('real') ?? false;

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold text-white">Update Frequency</div>
          <div className="text-gray-300 text-xs mt-1">
            {isRealTime
              ? 'Real-time updates with sub-second latency'
              : `Updates every ${frequency}`}
          </div>
        </div>
      }
      placement="top"
      delay={300}
    >
      <div className="flex items-center justify-center gap-1 cursor-help">
        <Clock className={cn('w-4 h-4', isRealTime ? 'text-emerald-500' : 'text-blue-500')} />
        <span
          className={cn('text-sm font-medium', isRealTime ? 'text-emerald-600' : 'text-blue-600')}
        >
          {isRealTime ? 'Real-time' : frequency}
        </span>
      </div>
    </Tooltip>
  );
}

function OracleComparisonMatrixComponent({
  oracleFeatures,
  selectedOracles,
  t,
}: OracleComparisonMatrixProps) {
  const [sortColumn, setSortColumn] = useState<'name' | 'symbols' | 'latency' | 'frequency'>(
    'name'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedFeatures = useMemo(() => {
    const sorted = [...oracleFeatures].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'symbols':
          comparison = a.symbolCount - b.symbolCount;
          break;
        case 'latency':
          comparison = a.avgLatency - b.avgLatency;
          break;
        case 'frequency':
          comparison = a.updateFrequency.localeCompare(b.updateFrequency);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [oracleFeatures, sortColumn, sortDirection]);

  const handleSort = useCallback(
    (column: 'name' | 'symbols' | 'latency' | 'frequency') => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  if (oracleFeatures.length === 0) {
    return (
      <DashboardCard>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Info className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-lg font-medium">{t('crossOracle.noData')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('crossOracle.selectOracles')}</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.featureComparison')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.featureComparisonDesc')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {t('crossOracle.hoverForDetails')}
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-48">
                  <SortHeader
                    column="name"
                    className="justify-start"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('crossOracle.oracle')}
                  </SortHeader>
                </th>
                <th className="w-32">
                  <SortHeader
                    column="symbols"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('crossOracle.symbols')}
                  </SortHeader>
                </th>
                <th className="w-32">
                  <SortHeader
                    column="latency"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('crossOracle.avgLatency')}
                  </SortHeader>
                </th>
                <th className="w-32">
                  <SortHeader
                    column="frequency"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('crossOracle.updateFrequency')}
                  </SortHeader>
                </th>
                <th className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider text-left">
                  {t('crossOracle.features')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedFeatures.map((oracle) => {
                const isSelected = selectedOracles.includes(oracle.provider);

                return (
                  <tr
                    key={oracle.provider}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <OracleNameCell oracle={oracle} isSelected={isSelected} t={t} />
                    </td>
                    <td className="px-4 py-3">
                      <SymbolCountCell count={oracle.symbolCount} />
                    </td>
                    <td className="px-4 py-3">
                      <LatencyCell latency={oracle.avgLatency} />
                    </td>
                    <td className="px-4 py-3">
                      <UpdateFrequencyCell frequency={oracle.updateFrequency} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {oracle.features.map((feature) => (
                          <FeatureBadge key={feature} feature={feature} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedFeatures.map((oracle) => {
          const isSelected = selectedOracles.includes(oracle.provider);

          return (
            <div
              key={oracle.provider}
              className={cn(
                'p-4 border rounded-lg transition-colors',
                isSelected
                  ? 'bg-blue-50/50 border-blue-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <OracleNameCell oracle={oracle} isSelected={isSelected} t={t} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">{t('crossOracle.symbols')}</div>
                  <SymbolCountCell count={oracle.symbolCount} />
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">{t('crossOracle.latency')}</div>
                  <LatencyCell latency={oracle.avgLatency} />
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">{t('crossOracle.frequency')}</div>
                  <UpdateFrequencyCell frequency={oracle.updateFrequency} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {oracle.features.map((feature) => (
                  <FeatureBadge key={feature} feature={feature} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="text-xs font-medium text-gray-500 mb-3">
          {t('crossOracle.featureLegend')}
        </div>
        <div className="flex flex-wrap gap-2">
          {FEATURE_CONFIGS.map((config) => (
            <Tooltip key={config.key} content={config.label} placement="bottom" delay={200}>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border cursor-help',
                  config.bgColor,
                  config.color,
                  config.borderColor
                )}
              >
                {config.icon}
                {config.label}
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{oracleFeatures.length}</div>
            <div className="text-xs text-gray-500">{t('crossOracle.totalOracles')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {Math.max(...oracleFeatures.map((o) => o.symbolCount)).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">{t('crossOracle.maxSymbols')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Math.min(...oracleFeatures.map((o) => o.avgLatency))}ms
            </div>
            <div className="text-xs text-gray-500">{t('crossOracle.bestLatency')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {oracleFeatures.filter((o) => o.features.includes('high-frequency')).length}
            </div>
            <div className="text-xs text-gray-500">{t('crossOracle.highFreqCount')}</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

const OracleComparisonMatrix = memo(OracleComparisonMatrixComponent);
OracleComparisonMatrix.displayName = 'OracleComparisonMatrix';

export { OracleComparisonMatrix };
export default OracleComparisonMatrix;
