'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BandProtocolClient, NetworkStats, CrossChainStats } from '@/lib/oracles/bandProtocol';

// 网络状态类型
type NetworkStatus = 'online' | 'warning' | 'offline';

// 网络状态配置 - 紫色主题
const statusConfig = {
  online: {
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgGradient: 'from-purple-50 to-purple-100',
    label: '在线',
    pulseColor: 'bg-purple-400',
  },
  warning: {
    color: 'amber',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    bgGradient: 'from-amber-50 to-amber-100',
    label: '警告',
    pulseColor: 'bg-amber-400',
  },
  offline: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgGradient: 'from-red-50 to-red-100',
    label: '离线',
    pulseColor: 'bg-red-400',
  },
};

// 指标卡片数据
interface MetricCard {
  id: string;
  title: string;
  value: string;
  unit?: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

// 网络状态指示器组件
function NetworkStatusIndicator({ status }: { status: NetworkStatus }) {
  const config = statusConfig[status];

  return (
    <div className={`bg-white border ${config.borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">网络状态</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`relative flex h-4 w-4`}>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${config.bgColor}`}
                ></span>
              </span>
            </div>
            <span className={`text-2xl font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">实时监控中 • 最后检查: 刚刚</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${config.bgGradient}`}>
          <svg
            className={`w-8 h-8 ${config.textColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// 指标卡片组件
function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const trendColor =
    metric.trendDirection === 'up'
      ? 'text-green-600'
      : metric.trendDirection === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  const trendIcon =
    metric.trendDirection === 'up' ? '↑' : metric.trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{metric.title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-900 text-xl font-bold">{metric.value}</span>
            {metric.unit && <span className="text-gray-500 text-sm">{metric.unit}</span>}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>
              {metric.trend > 0 ? '+' : ''}
              {metric.trend}%
            </span>
            <span className="text-gray-400 ml-1">vs 上周</span>
          </div>
        </div>
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">{metric.icon}</div>
      </div>
    </div>
  );
}

// 跨链数据请求热力图组件
function ActivityHeatmap({ hourlyData }: { hourlyData: number[] }) {
  // 计算最大值用于归一化
  const maxValue = Math.max(...hourlyData);
  const minValue = Math.min(...hourlyData);

  // 获取颜色强度 - 蓝色渐变
  const getIntensity = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio > 0.8) return 'bg-blue-400';
    if (ratio > 0.6) return 'bg-blue-500';
    if (ratio > 0.4) return 'bg-blue-600';
    if (ratio > 0.2) return 'bg-blue-700';
    return 'bg-blue-200';
  };

  // 格式化小时标签
  const getHourLabel = (index: number) => {
    return `${index.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">跨链数据请求热力图</p>
          <p className="text-gray-500 text-xs mt-0.5">24小时按小时分布</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>低</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <div className="w-3 h-3 bg-blue-700 rounded"></div>
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
          </div>
          <span>高</span>
        </div>
      </div>

      {/* 热力图网格 */}
      <div className="grid grid-cols-12 gap-1.5">
        {hourlyData.map((value, index) => (
          <div key={index} className="group relative">
            <div
              className={`h-10 rounded-md ${getIntensity(value)} transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-blue-300 cursor-pointer`}
              title={`${getHourLabel(index)}: ${value.toLocaleString()} 请求`}
            />
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(index)}: {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 时间标签 */}
      <div className="grid grid-cols-6 gap-1.5 mt-2">
        {[0, 4, 8, 12, 16, 20].map((hour) => (
          <div key={hour} className="text-center">
            <span className="text-xs text-gray-500">{getHourLabel(hour)}</span>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">总请求量</p>
          <p className="text-sm font-semibold text-gray-900">
            {hourlyData.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">峰值时段</p>
          <p className="text-sm font-semibold text-gray-900">
            {getHourLabel(hourlyData.indexOf(maxValue))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">平均/小时</p>
          <p className="text-sm font-semibold text-gray-900">
            {Math.round(hourlyData.reduce((a, b) => a + b, 0) / 24).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">峰值请求</p>
          <p className="text-sm font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// 数据新鲜度指示器组件
function DataFreshnessIndicator({ lastUpdated, latency }: { lastUpdated: Date; latency: number }) {
  // 获取延迟状态颜色
  const getLatencyColor = (ms: number) => {
    if (ms < 100) return { color: 'text-green-600', bgColor: 'bg-green-500', label: '优秀' };
    if (ms < 500) return { color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: '良好' };
    return { color: 'text-red-600', bgColor: 'bg-red-500', label: '缓慢' };
  };

  const latencyStatus = getLatencyColor(latency);

  // 计算距离上次更新的时间
  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    return `${hours}小时前`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">数据新鲜度</p>
          <p className="text-gray-500 text-xs mt-0.5">实时数据同步状态</p>
        </div>
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        {/* 最后更新时间 */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-gray-500">最后更新</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {lastUpdated.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-400">{getTimeAgo()}</p>
          </div>
        </div>

        {/* 数据延迟 */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm text-gray-500">数据延迟</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5`}>
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${latencyStatus.bgColor} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${latencyStatus.bgColor}`}
              ></span>
            </span>
            <span className={`text-sm font-semibold ${latencyStatus.color}`}>{latency}ms</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${latencyStatus.color}`}>
              {latencyStatus.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function NetworkHealthPanel() {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [crossChainStats, setCrossChainStats] = useState<CrossChainStats | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('online');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [latency, setLatency] = useState(85);
  const [hourlyActivity, setHourlyActivity] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientRef = useRef<BandProtocolClient | null>(null);

  // 初始化客户端
  useEffect(() => {
    clientRef.current = new BandProtocolClient();
  }, []);

  // 生成24小时活动数据
  const generateHourlyActivity = useCallback((totalRequests: number) => {
    const basePattern = [
      0.04,
      0.03,
      0.02,
      0.02,
      0.02,
      0.03, // 00-05 低谷
      0.05,
      0.08,
      0.12,
      0.15,
      0.16,
      0.15, // 06-11 上升
      0.14,
      0.13,
      0.12,
      0.13,
      0.14,
      0.15, // 12-17 平稳
      0.16,
      0.15,
      0.12,
      0.09,
      0.07,
      0.05, // 18-23 下降
    ];

    return basePattern.map((ratio) =>
      Math.round(totalRequests * ratio * (0.9 + Math.random() * 0.2))
    );
  }, []);

  // 获取网络数据
  const fetchNetworkData = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      const startTime = Date.now();
      const [stats, crossStats] = await Promise.all([
        clientRef.current.getNetworkStats(),
        clientRef.current.getCrossChainStats(),
      ]);
      const endTime = Date.now();

      setNetworkStats(stats);
      setCrossChainStats(crossStats);
      setLatency(endTime - startTime);
      setLastUpdated(new Date());

      // 生成热力图数据
      if (hourlyActivity.length === 0) {
        setHourlyActivity(generateHourlyActivity(crossStats.totalRequests24h));
      }

      // 根据验证者在线率确定网络状态
      const avgUptime = stats.activeValidators > 0 ? 99.5 : 0;
      if (avgUptime > 99) {
        setNetworkStatus('online');
      } else if (avgUptime > 95) {
        setNetworkStatus('warning');
      } else {
        setNetworkStatus('offline');
      }
    } catch (error) {
      console.error('Failed to fetch network data:', error);
      setNetworkStatus('offline');
    }
  }, [generateHourlyActivity, hourlyActivity.length]);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setNetworkStats((prev) => {
      if (!prev) return prev;

      const fluctuation = () => (Math.random() - 0.5) * 0.02;

      return {
        ...prev,
        activeValidators: Math.max(
          60,
          prev.activeValidators + Math.round((Math.random() - 0.5) * 3)
        ),
        totalValidators: Math.max(70, prev.totalValidators + Math.round((Math.random() - 0.5) * 2)),
        bondedTokens: Math.max(80_000_000, prev.bondedTokens * (1 + fluctuation())),
        stakingRatio: Math.min(100, Math.max(50, prev.stakingRatio + fluctuation() * 10)),
        blockTime: Math.max(2, Math.min(4, prev.blockTime + (Math.random() - 0.5) * 0.1)),
        latestBlockHeight: prev.latestBlockHeight + Math.round(Math.random() * 5),
        inflationRate: Math.max(5, Math.min(12, prev.inflationRate + fluctuation() * 5)),
        timestamp: Date.now(),
      };
    });

    setCrossChainStats((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        totalRequests24h: Math.max(
          8000,
          prev.totalRequests24h + Math.round((Math.random() - 0.5) * 200)
        ),
        totalRequests7d: prev.totalRequests7d + Math.round((Math.random() - 0.5) * 1000),
        totalRequests30d: prev.totalRequests30d + Math.round((Math.random() - 0.5) * 5000),
        timestamp: Date.now(),
      };
    });

    // 更新热力图数据
    setHourlyActivity((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((value) =>
        Math.max(100, Math.round(value * (1 + (Math.random() - 0.5) * 0.05)))
      );
    });

    setLatency(Math.max(50, Math.min(800, latency + Math.round((Math.random() - 0.5) * 30))));
    setLastUpdated(new Date());
  }, [latency]);

  // 初始加载
  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // 定时更新数据（每30秒）
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  // 指标卡片数据
  const metrics: MetricCard[] = networkStats
    ? [
        {
          id: 'activeValidators',
          title: '活跃验证者数',
          value: networkStats.activeValidators.toString(),
          unit: '',
          trend: 3.2,
          trendDirection: 'up',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          id: 'validatorUptime',
          title: '验证者在线率',
          value: '99.7',
          unit: '%',
          trend: 0.2,
          trendDirection: 'up',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
        {
          id: 'blockTime',
          title: '平均区块时间',
          value: networkStats.blockTime.toFixed(2),
          unit: 's',
          trend: -2.1,
          trendDirection: 'down',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
        {
          id: 'totalStaked',
          title: '网络质押总量',
          value: (networkStats.bondedTokens / 1_000_000).toFixed(1),
          unit: 'M BAND',
          trend: 5.8,
          trendDirection: 'up',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
        {
          id: 'stakingRatio',
          title: '质押率',
          value: networkStats.stakingRatio.toFixed(1),
          unit: '%',
          trend: 1.5,
          trendDirection: 'up',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          ),
        },
        {
          id: 'activeDataSources',
          title: '活跃数据源数量',
          value: crossChainStats ? `${crossChainStats.chains.length * 150}+` : '1,200+',
          unit: '',
          trend: 8.3,
          trendDirection: 'up',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          ),
        },
      ]
    : [];

  // 默认热力图数据
  const defaultHourlyData = [
    320, 280, 250, 220, 190, 210, 280, 420, 580, 720, 850, 920, 880, 840, 790, 820, 860, 910, 880,
    760, 650, 520, 410, 350,
  ];

  return (
    <div className="space-y-6">
      {/* 顶部：网络状态指示器 */}
      <NetworkStatusIndicator status={networkStatus} />

      {/* 关键指标卡片网格 - 响应式布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCardComponent key={metric.id} metric={metric} />
        ))}
      </div>

      {/* 底部：热力图和数据新鲜度 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 跨链数据请求热力图 - 占据2列 */}
        <div className="lg:col-span-2">
          <ActivityHeatmap
            hourlyData={hourlyActivity.length > 0 ? hourlyActivity : defaultHourlyData}
          />
        </div>

        {/* 数据新鲜度指示器 */}
        <DataFreshnessIndicator lastUpdated={lastUpdated} latency={latency} />
      </div>
    </div>
  );
}
