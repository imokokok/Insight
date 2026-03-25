'use client';

import { useTranslations } from '@/i18n';
import { EnhancedStatCard } from '@/components/ui';
import { MarketStats as MarketStatsType } from '../types';

interface MarketStatsProps {
  marketStats: MarketStatsType;
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
}

/**
 * 生成模拟趋势数据用于 sparkline 图表
 */
function generateTrendData(baseValue: number, points: number = 20): number[] {
  const data: number[] = [];
  let currentValue = baseValue;

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * baseValue * 0.1;
    currentValue += change;
    data.push(Math.max(currentValue, baseValue * 0.5));
  }

  return data;
}

export default function MarketStats({
  marketStats,
  totalTVS,
  totalChains,
  totalProtocols,
}: MarketStatsProps) {
  const t = useTranslations('marketOverview.stats');

  // 生成各指标的 sparkline 趋势数据
  const tvsTrendData = generateTrendData(marketStats.totalTVS / 1e9, 24);
  const chainsTrendData = generateTrendData(totalChains, 20);
  const protocolsTrendData = generateTrendData(totalProtocols, 20);
  const dominanceTrendData = generateTrendData(marketStats.marketDominance, 20);
  const latencyTrendData = generateTrendData(marketStats.avgUpdateLatency, 20);
  const oracleCountTrendData = generateTrendData(marketStats.oracleCount, 20);

  // TVS 细分数据（按主要预言机）
  const tvsBreakdown = [
    { label: 'Chainlink', value: '$12.5B', percentage: 45.2 },
    { label: 'Pyth', value: '$6.8B', percentage: 24.6 },
    { label: 'Band', value: '$4.2B', percentage: 15.2 },
    { label: 'Others', value: '$4.1B', percentage: 15.0 },
  ];

  // 链支持细分数据
  const chainsBreakdown = [
    { label: 'Ethereum', value: '1', percentage: 100 },
    { label: 'Arbitrum', value: '1', percentage: 100 },
    { label: 'Optimism', value: '1', percentage: 100 },
    { label: 'Base', value: '1', percentage: 100 },
  ];

  // 协议细分数据
  const protocolsBreakdown = [
    { label: 'DeFi', value: '85', percentage: 56.7 },
    { label: 'NFT', value: '35', percentage: 23.3 },
    { label: 'Gaming', value: '20', percentage: 13.3 },
    { label: 'Others', value: '10', percentage: 6.7 },
  ];

  // 市场主导细分数据
  const dominanceBreakdown = [
    { label: 'Chainlink', value: '62%', percentage: 62 },
    { label: 'Pyth', value: '18%', percentage: 18 },
    { label: 'Band', value: '12%', percentage: 12 },
    { label: 'Others', value: '8%', percentage: 8 },
  ];

  // 延迟细分数据
  const latencyBreakdown = [
    { label: 'Chainlink', value: '450ms', percentage: 30 },
    { label: 'Pyth', value: '320ms', percentage: 22 },
    { label: 'Band', value: '380ms', percentage: 25 },
    { label: 'Others', value: '350ms', percentage: 23 },
  ];

  // 预言机细分数据
  const oracleBreakdown = [
    { label: 'Price Feeds', value: '85', percentage: 85 },
    { label: 'VRF', value: '8', percentage: 8 },
    { label: 'Automation', value: '4', percentage: 4 },
    { label: 'CCIP', value: '3', percentage: 3 },
  ];

  const stats = [
    {
      title: t('totalTVS'),
      value: totalTVS,
      change: {
        value: marketStats.change24h,
        percentage: true,
        timeframe: '24h',
      },
      sparklineData: tvsTrendData,
      breakdown: tvsBreakdown,
    },
    {
      title: t('totalChains'),
      value: totalChains,
      change: {
        value: 12.5,
        percentage: true,
        timeframe: '30d',
      },
      sparklineData: chainsTrendData,
      breakdown: chainsBreakdown,
    },
    {
      title: t('totalProtocols'),
      value: `${totalProtocols}+`,
      change: {
        value: 8.3,
        percentage: true,
        timeframe: '30d',
      },
      sparklineData: protocolsTrendData,
      breakdown: protocolsBreakdown,
    },
    {
      title: t('marketDominance'),
      value: `${marketStats.marketDominance}%`,
      change: {
        value: -0.5,
        percentage: true,
        timeframe: '7d',
      },
      sparklineData: dominanceTrendData,
      breakdown: dominanceBreakdown,
    },
    {
      title: t('avgLatency'),
      value: `${marketStats.avgUpdateLatency}ms`,
      change: {
        value: -5.2,
        percentage: true,
        timeframe: '7d',
      },
      sparklineData: latencyTrendData,
      breakdown: latencyBreakdown,
    },
    {
      title: t('oracleCount'),
      value: marketStats.oracleCount,
      change: {
        value: 2,
        percentage: false,
        timeframe: '30d',
      },
      sparklineData: oracleCountTrendData,
      breakdown: oracleBreakdown,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <EnhancedStatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          sparklineData={stat.sparklineData}
          breakdown={stat.breakdown}
          variant="compact"
        />
      ))}
    </div>
  );
}
