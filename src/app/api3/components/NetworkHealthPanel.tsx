'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/lib/i18n/context';

// 网络状态类型
type NetworkStatus = 'online' | 'warning' | 'offline';

// 模拟网络数据
const mockNetworkData = {
  // 基础指标
  activeAirnodes: 156,
  nodeUptime: 99.7,
  avgResponseTime: 180,
  updateFrequency: 60,
  totalStaked: 25000000, // 25M API3
  dataFeeds: 168,

  // 24小时活动数据（每小时请求量）
  hourlyActivity: [
    1200, 1100, 950, 800, 750, 900, 1400, 2100, 2800, 3200, 3500, 3800, 3600, 3400, 3100, 3300,
    3500, 3700, 3400, 2900, 2400, 1900, 1500, 1300,
  ],

  // 网络状态
  status: 'online' as NetworkStatus,
  lastUpdated: new Date(),
  latency: 85,
};

// 网络状态配置
const statusConfig = {
  online: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: '在线',
    pulseColor: 'bg-green-400',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: '警告',
    pulseColor: 'bg-yellow-400',
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
  const { t } = useI18n();
  const config = statusConfig[status];

  return (
    <div className={`bg-white border ${config.borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            {t('api3.networkHealth.networkStatus')}
          </p>
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
            <span className={`text-2xl font-bold ${config.textColor}`}>
              {t(`api3.networkHealth.${status}`)}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {t('api3.networkHealth.monitoring')} • {t('api3.networkHealth.lastCheck')}:{' '}
            {t('api3.justNow')}
          </p>
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
  const { t } = useI18n();
  const trendColor =
    metric.trendDirection === 'up'
      ? 'text-green-600'
      : metric.trendDirection === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  const trendIcon =
    metric.trendDirection === 'up' ? '↑' : metric.trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
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
            <span className="text-gray-400 ml-1">vs {t('api3.networkHealth.vsLastWeek')}</span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">{metric.icon}</div>
      </div>
    </div>
  );
}

// 网络活动热力图组件
function ActivityHeatmap({ hourlyData }: { hourlyData: number[] }) {
  const { t } = useI18n();
  // 计算最大值用于归一化
  const maxValue = Math.max(...hourlyData);
  const minValue = Math.min(...hourlyData);

  // 获取颜色强度
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
          <p className="text-gray-900 text-sm font-semibold">
            {t('api3.networkHealth.activityHeatmap')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('api3.networkHealth.24hDistribution')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('api3.crossOracle.low')}</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <div className="w-3 h-3 bg-blue-700 rounded"></div>
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
          </div>
          <span>{t('api3.crossOracle.high')}</span>
        </div>
      </div>

      {/* 热力图网格 */}
      <div className="grid grid-cols-12 gap-1.5">
        {hourlyData.map((value, index) => (
          <div key={index} className="group relative">
            <div
              className={`h-10 rounded-md ${getIntensity(value)} transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-blue-300 cursor-pointer`}
              title={`${getHourLabel(index)}: ${value.toLocaleString()} {t('api3.requests')}`}
            />
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(index)}: {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 时间标签 */}
      <div className="grid grid-cols-12 gap-1.5 mt-2">
        {[0, 4, 8, 12, 16, 20].map((hour) => (
          <div key={hour} className="text-center">
            <span className="text-xs text-gray-500">{getHourLabel(hour)}</span>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('api3.networkHealth.totalRequests')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {hourlyData.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('api3.networkHealth.peakHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {getHourLabel(hourlyData.indexOf(maxValue))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('api3.networkHealth.avgPerHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {Math.round(hourlyData.reduce((a, b) => a + b, 0) / 24).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('api3.networkHealth.peakRequests')}</p>
          <p className="text-sm font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// 数据新鲜度指示器组件
function DataFreshnessIndicator({ lastUpdated, latency }: { lastUpdated: Date; latency: number }) {
  const { t } = useI18n();
  // 获取延迟状态颜色
  const getLatencyColor = (ms: number) => {
    if (ms < 100)
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: t('api3.networkHealth.excellent'),
      };
    if (ms < 500)
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        label: t('api3.networkHealth.good'),
      };
    return { color: 'text-red-600', bgColor: 'bg-red-500', label: t('api3.networkHealth.slow') };
  };

  const latencyStatus = getLatencyColor(latency);

  // 计算距离上次更新的时间
  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}{t('api3.secondsAgo')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}{t('api3.minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}{t('api3.hoursAgo')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('api3.networkHealth.dataFreshness')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('api3.networkHealth.realtimeSync')}</p>
        </div>
        <div className="p-2 bg-gray-100 rounded-lg">
          <svg
            className="w-5 h-5 text-gray-500"
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
            <span className="text-sm text-gray-500">{t('api3.networkHealth.lastUpdated')}</span>
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
            <span className="text-sm text-gray-500">{t('api3.networkHealth.dataLatency')}</span>
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
  const { t } = useI18n();
  const [networkData, setNetworkData] = useState(mockNetworkData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setNetworkData((prev) => {
      // 轻微波动数据
      const fluctuation = () => (Math.random() - 0.5) * 0.02; // ±1% 波动

      // 更新小时活动数据（轻微波动）
      const newHourlyActivity = prev.hourlyActivity.map((value) =>
        Math.max(500, Math.round(value * (1 + fluctuation())))
      );

      return {
        ...prev,
        activeAirnodes: Math.max(150, prev.activeAirnodes + Math.round((Math.random() - 0.5) * 5)),
        nodeUptime: Math.min(100, Math.max(99, prev.nodeUptime + fluctuation() * 0.1)),
        avgResponseTime: Math.max(
          150,
          Math.min(250, prev.avgResponseTime + Math.round((Math.random() - 0.5) * 15))
        ),
        hourlyActivity: newHourlyActivity,
        latency: Math.max(50, Math.min(800, prev.latency + Math.round((Math.random() - 0.5) * 20))),
        lastUpdated: new Date(),
      };
    });
    setLastUpdated(new Date());
  }, []);

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
  const metrics: MetricCard[] = [
    {
      id: 'activeAirnodes',
      title: t('api3.networkHealth.activeAirnodes'),
      value: `${networkData.activeAirnodes.toLocaleString()}+`,
      trend: 2.5,
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
    {
      id: 'nodeUptime',
      title: t('api3.networkHealth.nodeUptime'),
      value: networkData.nodeUptime.toFixed(1),
      unit: '%',
      trend: 0.1,
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
      id: 'avgResponseTime',
      title: t('api3.networkHealth.responseTime'),
      value: networkData.avgResponseTime.toString(),
      unit: 'ms',
      trend: -5.2,
      trendDirection: 'down',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      id: 'updateFrequency',
      title: t('api3.networkHealth.updateFrequency'),
      value: `${t('api3.networkHealth.every')} ${networkData.updateFrequency}`,
      unit: t('api3.networkHealth.seconds'),
      trend: 0,
      trendDirection: 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: 'totalStaked',
      title: t('api3.networkHealth.totalStaked'),
      value: (networkData.totalStaked / 1000000).toFixed(0),
      unit: 'M API3',
      trend: 3.8,
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
      id: 'dataFeeds',
      title: t('api3.stats.dapis'),
      value: `${networkData.dataFeeds.toLocaleString()}+`,
      trend: 1.2,
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
  ];

  return (
    <div className="space-y-6">
      {/* 顶部：网络状态指示器 */}
      <NetworkStatusIndicator status={networkData.status} />

      {/* 关键指标卡片网格 - 响应式布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCardComponent key={metric.id} metric={metric} />
        ))}
      </div>

      {/* 底部：热力图和数据新鲜度 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 网络活动热力图 - 占据2列 */}
        <div className="lg:col-span-2">
          <ActivityHeatmap hourlyData={networkData.hourlyActivity} />
        </div>

        {/* 数据新鲜度指示器 */}
        <DataFreshnessIndicator lastUpdated={lastUpdated} latency={networkData.latency} />
      </div>
    </div>
  );
}
