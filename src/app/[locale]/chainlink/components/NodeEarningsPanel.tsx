'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SparklineChart } from '@/components/oracle/charts/SparklineChart';
import { StatComparisonCard } from '@/components/oracle/charts/StatComparisonCard';
import { NodeData } from '../types';
import { Wallet, TrendingUp, PieChart, BarChart3 } from 'lucide-react';

interface NodeEarningsPanelProps {
  nodes: NodeData[];
}

type NodeTier = 'small' | 'medium' | 'large';

interface TierConfig {
  minStake: number;
  maxStake: number;
  label: string;
  color: string;
  avgEarningsPerDay: number;
}

const TIER_CONFIG: Record<NodeTier, TierConfig> = {
  small: {
    minStake: 0,
    maxStake: 1500000,
    label: 'Small',
    color: '#60a5fa',
    avgEarningsPerDay: 45,
  },
  medium: {
    minStake: 1500000,
    maxStake: 2000000,
    label: 'Medium',
    color: '#3b82f6',
    avgEarningsPerDay: 85,
  },
  large: {
    minStake: 2000000,
    maxStake: Infinity,
    label: 'Large',
    color: '#1d4ed8',
    avgEarningsPerDay: 150,
  },
};

function getNodeTier(stakedAmount: number): NodeTier {
  if (stakedAmount >= TIER_CONFIG.large.minStake) return 'large';
  if (stakedAmount >= TIER_CONFIG.medium.minStake) return 'medium';
  return 'small';
}

// Generate deterministic mock earnings trend data
function generateEarningsTrend(days: number, baseEarnings: number, seed: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const trend = Math.sin(i / 7) * 0.1;
    // Use deterministic pseudo-random based on index and seed
    const noise = Math.sin(i * seed * 0.5) * 0.5 * 0.2;
    return baseEarnings * (1 + trend + noise);
  });
}

export function NodeEarningsPanel({ nodes }: NodeEarningsPanelProps) {
  const t = useTranslations();

  const tierStats = useMemo(() => {
    const stats: Record<NodeTier, { count: number; totalStake: number; avgEarnings: number }> = {
      small: { count: 0, totalStake: 0, avgEarnings: 0 },
      medium: { count: 0, totalStake: 0, avgEarnings: 0 },
      large: { count: 0, totalStake: 0, avgEarnings: 0 },
    };

    nodes.forEach((node) => {
      const tier = getNodeTier(node.stakedAmount);
      stats[tier].count++;
      stats[tier].totalStake += node.stakedAmount;
    });

    (Object.keys(stats) as NodeTier[]).forEach((tier) => {
      if (stats[tier].count > 0) {
        stats[tier].avgEarnings = TIER_CONFIG[tier].avgEarningsPerDay;
      }
    });

    return stats;
  }, [nodes]);

  const earningsTrendData = useMemo(() => {
    return {
      small: generateEarningsTrend(30, TIER_CONFIG.small.avgEarningsPerDay, 1),
      medium: generateEarningsTrend(30, TIER_CONFIG.medium.avgEarningsPerDay, 2),
      large: generateEarningsTrend(30, TIER_CONFIG.large.avgEarningsPerDay, 3),
    };
  }, []);

  // Predefined changes for each tier to avoid Math.random in render
  const tierChanges = useMemo(
    () => ({
      small: 3.5,
      medium: 5.2,
      large: 7.8,
    }),
    []
  );

  const comparisonStats = useMemo(() => {
    return (Object.keys(TIER_CONFIG) as NodeTier[]).map((tier) => ({
      label: TIER_CONFIG[tier].label,
      value: `${tierStats[tier].avgEarnings} LINK`,
      change: tierChanges[tier],
      icon: <Wallet className="w-4 h-4" />,
    }));
  }, [tierStats, tierChanges]);

  const totalDailyEarnings = useMemo(() => {
    return (Object.keys(tierStats) as NodeTier[]).reduce(
      (acc, tier) => acc + tierStats[tier].count * tierStats[tier].avgEarnings,
      0
    );
  }, [tierStats]);

  const totalNodes = nodes.length;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 uppercase">
              {t('chainlink.nodes.avgDailyEarnings')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(totalDailyEarnings / totalNodes)} LINK
          </div>
          <div className="text-xs text-gray-500 mt-1">{t('chainlink.nodes.perNodeAvg')}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600 uppercase">
              {t('chainlink.nodes.monthlyGrowth')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">+12.5%</div>
          <div className="text-xs text-gray-500 mt-1">{t('chainlink.nodes.vsLastMonth')}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600 uppercase">
              {t('chainlink.nodes.topTierShare')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round((tierStats.large.count / totalNodes) * 100)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {tierStats.large.count} {t('chainlink.nodes.largeNodes')}
          </div>
        </div>
      </div>

      {/* Earnings Comparison */}
      <StatComparisonCard
        title={t('chainlink.nodes.earningsByTier')}
        stats={comparisonStats}
        layout="horizontal"
        showDividers={true}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {t('chainlink.nodes.nodeDistribution')}
            </h3>
          </div>
          <div className="flex items-end justify-around h-32 px-4">
            {(Object.keys(TIER_CONFIG) as NodeTier[]).map((tier) => {
              const percentage = totalNodes > 0 ? (tierStats[tier].count / totalNodes) * 100 : 0;
              return (
                <div key={tier} className="flex flex-col items-center gap-2">
                  <div className="text-xs font-medium text-gray-600">{tierStats[tier].count}</div>
                  <div
                    className="w-16 rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(percentage * 2, 8)}px`,
                      backgroundColor: TIER_CONFIG[tier].color,
                    }}
                  />
                  <div className="text-xs text-gray-500">{TIER_CONFIG[tier].label}</div>
                  <div className="text-xs font-medium text-gray-700">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earnings Trend Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('chainlink.nodes.earningsTrend')}
              </h3>
            </div>
            <span className="text-xs text-gray-400">30D</span>
          </div>
          <div className="space-y-3">
            {(Object.keys(TIER_CONFIG) as NodeTier[]).map((tier) => (
              <div key={tier} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500">{TIER_CONFIG[tier].label}</div>
                <div className="flex-1">
                  <SparklineChart
                    data={earningsTrendData[tier]}
                    color={TIER_CONFIG[tier].color}
                    height={30}
                    width={200}
                    showArea={true}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-xs font-medium" style={{ color: TIER_CONFIG[tier].color }}>
                    {TIER_CONFIG[tier].avgEarningsPerDay} LINK
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NodeEarningsPanel;
