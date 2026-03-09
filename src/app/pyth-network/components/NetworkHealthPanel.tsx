'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 网络状态类型
type NetworkStatus = 'online' | 'warning' | 'offline';

// 模拟 Pyth Network 数据
const mockNetworkData = {
  // 基础指标
  activePublishers: 89,
  avgResponseTime: 350,
  updateFrequency: 0.4, // 每秒多次 (400ms = 2.5次/秒)
  priceFeeds: 523,

  // 24小时活动数据（每小时价格更新次数）
  hourlyActivity: [
    45000, 42000, 38000, 35000, 32000, 34000, 42000, 58000, 75000, 92000, 108000, 115000, 112000,
    108000, 102000, 105000, 110000, 118000, 115000, 98000, 82000, 68000, 55000, 48000,
  ],

  // 网络状态
  status: 'online' as NetworkStatus,
  lastUpdated: new Date(),
  latency: 320,
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

// 指标卡片数据类型
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
            <span className="text-gray-400 ml-1">vs 上周</span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">{metric.icon}</div>
      </div>
    </div>
  );
}

// 网络活动热力图组件
function ActivityHeatmap({ hourlyData }: { hourlyData: number[] }) {
  const maxValue = Math.max(...hourlyData);
  const minValue = Math.min(...hourlyData);

  // 获取颜色强度
  const getColor = (value: number): string => {
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio > 0.8) return '#60a5fa'; // blue-400
    if (ratio > 0.6) return '#3b82f6'; // blue-500
    if (ratio > 0.4) return '#2563eb'; // blue-600
    if (ratio > 0.2) return '#1d4ed8'; // blue-700
    return '#bfdbfe'; // blue-200
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">网络活动热力图</p>
          <p className="text-gray-500 text-xs mt-0.5">24小时价格更新分布</p>
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

      {/* 自定义热力图网格 */}
      <div className="space-y-2">
        {/* 热力图行 */}
        <div className="grid grid-cols-12 gap-1">
          {hourlyData.map((value, index) => (
            <div key={index} className="group relative">
              <div
                className="h-10 rounded-md transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-blue-300 cursor-pointer"
                style={{ backgroundColor: getColor(value) }}
                title={`${index.toString().padStart(2, '0')}:00: ${value.toLocaleString()} 更新`}
              />
              {/* 悬停提示 */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                {index.toString().padStart(2, '0')}:00: {value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* 时间标签 */}
        <div className="grid grid-cols-6 gap-1 mt-2">
          {[0, 4, 8, 12, 16, 20].map((hour) => (
            <div key={hour} className="text-center">
              <span className="text-xs text-gray-500">{hour.toString().padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">总更新量</p>
          <p className="text-sm font-semibold text-gray-900">
            {(hourlyData.reduce((a, b) => a + b, 0) / 1000000).toFixed(2)}M
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">峰值时段</p>
          <p className="text-sm font-semibold text-gray-900">
            {hourlyData.indexOf(maxValue).toString().padStart(2, '0')}:00
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">平均/小时</p>
          <p className="text-sm font-semibold text-gray-900">
            {(hourlyData.reduce((a, b) => a + b, 0) / 24 / 1000).toFixed(1)}K
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">峰值更新</p>
          <p className="text-sm font-semibold text-gray-900">{(maxValue / 1000).toFixed(0)}K</p>
        </div>
      </div>
    </div>
  );
}

// 数据新鲜度指示器组件
function DataFreshnessIndicator({ lastUpdated, latency }: { lastUpdated: Date; latency: number }) {
  // 获取延迟状态颜色
  const getLatencyColor = (ms: number) => {
    if (ms < 200) return { color: 'text-green-600', bgColor: 'bg-green-500', label: '优秀' };
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

        {/* 更新频率 */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-sm text-gray-500">更新频率</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">~2.5 次/秒</p>
            <p className="text-xs text-gray-400">每 400ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function NetworkHealthPanel() {
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
        Math.max(10000, Math.round(value * (1 + fluctuation())))
      );

      return {
        ...prev,
        activePublishers: Math.max(
          85,
          prev.activePublishers + Math.round((Math.random() - 0.5) * 3)
        ),
        avgResponseTime: Math.max(
          300,
          Math.min(400, prev.avgResponseTime + Math.round((Math.random() - 0.5) * 20))
        ),
        hourlyActivity: newHourlyActivity,
        latency: Math.max(
          280,
          Math.min(420, prev.latency + Math.round((Math.random() - 0.5) * 30))
        ),
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
      id: 'activePublishers',
      title: '活跃发布者数',
      value: networkData.activePublishers.toString(),
      trend: 5.2,
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
      id: 'avgResponseTime',
      title: '平均响应时间',
      value: networkData.avgResponseTime.toString(),
      unit: 'ms',
      trend: -3.5,
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
      title: '数据更新频率',
      value: '~2.5',
      unit: '次/秒',
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
      id: 'priceFeeds',
      title: '价格馈送总数',
      value: `${networkData.priceFeeds.toLocaleString()}+`,
      trend: 8.3,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
