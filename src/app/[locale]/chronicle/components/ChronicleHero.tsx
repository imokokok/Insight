'use client';

import { OracleHero, StatItem } from '@/components/oracle/data-display/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Shield,
  Zap,
  MessageSquare,
} from 'lucide-react';

export interface ChronicleHeroProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
    activeValidators?: number;
  };
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export function ChronicleHero({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: ChronicleHeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const priceSparklineData = historicalData.length > 0
    ? historicalData.map(d => d.price)
    : undefined;

  // 8个统计项
  const stats: StatItem[] = [
    // 1. Chronicle 价格（带 sparkline）
    {
      title: 'Chronicle Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      sparklineData: priceSparklineData,
    },
    // 2. 24h 变化
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? 'Bullish' : 'Bearish',
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    // 3. 活跃验证者
    {
      title: 'Active Validators',
      value: `${networkStats?.activeValidators ?? 45}+`,
      change: '+2',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
    },
    // 4. 支持的链数
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}+`,
      change: 'Multi-chain',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    // 5. 数据喂价
    {
      title: 'Data Feeds',
      value: `${config.networkData.dataFeeds}`,
      change: 'Real-time',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    // 6. MakerDAO 集成
    {
      title: 'MakerDAO Integrations',
      value: '10+',
      change: 'Active',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
    },
    // 7. 网络正常运行时间
    {
      title: 'Network Uptime',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: 'Reliable',
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
    },
    // 8. Scuttlebutt 消息
    {
      title: 'Scuttlebutt Messages',
      value: '1M+',
      change: 'Decentralized',
      changeType: 'neutral',
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  return (
    <OracleHero
      config={config}
      price={price ?? null}
      historicalData={historicalData}
      stats={stats}
      networkStats={networkStats}
      isLoading={isLoading}
      isError={isError}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      onExport={onExport}
      themeColor="#dc2626"
    />
  );
}

export default ChronicleHero;
