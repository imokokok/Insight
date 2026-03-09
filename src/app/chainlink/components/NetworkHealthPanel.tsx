'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 网络状态类型
type NetworkStatus = 'online' | 'warning' | 'offline';

// 模拟网络数据
const mockNetworkData = {
  // 基础指标
  activeNodes: 1847,
  nodeUptime: 99.9,
  avgResponseTime: 245,
  updateFrequency: 60,
  totalStaked: 45000000, // 45M LINK
  dataFeeds: 1243,

  // 24小时活动数据（每小时请求量）
  hourlyActivity: [
    3200, 2800, 2500, 2200, 1900, 2100, 2800, 4200, 5800, 7200, 8500, 9200, 8800, 8400, 7900, 8200,
    8600, 9100, 8800, 7600, 6500, 5200, 4100, 3500,
  ],

  // 网络状态
  status: 'online' as NetworkStatus,
  lastUpdated: new Date(),
  latency: 120,
};

// 网络状态配置
const statusConfig = {
  online: {
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-emerald-500/5',
    label: '在线',
    pulseColor: 'bg-emerald-400',
  },
  warning: {
    color: 'amber',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-amber-500/5',
    label: '警告',
    pulseColor: 'bg-amber-400',
  },
  offline: {
    color: 'rose',
    bgColor: 'bg-rose-500',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgGradient: 'from-rose-500/20 to-rose-500/5',
    label: '离线',
    pulseColor: 'bg-rose-400',
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
    <div className={`bg-slate-800/50 border ${config.borderColor} rounded-xl p-5 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">网络状态</p>
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
          <p className="text-slate-500 text-xs mt-2">实时监控中 • 最后检查: 刚刚</p>
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
      ? 'text-emerald-400'
      : metric.trendDirection === 'down'
        ? 'text-rose-400'
        : 'text-slate-400';

  const trendIcon =
    metric.trendDirection === 'up' ? '↑' : metric.trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm hover:bg-slate-800/70 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{metric.title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-xl font-bold">{metric.value}</span>
            {metric.unit && <span className="text-slate-500 text-sm">{metric.unit}</span>}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>
              {metric.trend > 0 ? '+' : ''}
              {metric.trend}%
            </span>
            <span className="text-slate-500 ml-1">vs 上周</span>
          </div>
        </div>
        <div className="p-2.5 bg-slate-700/50 rounded-lg text-slate-400">{metric.icon}</div>
      </div>
    </div>
  );
}

// 网络活动热力图组件
function ActivityHeatmap({ hourlyData }: { hourlyData: number[] }) {
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
    return 'bg-blue-900';
  };

  // 格式化小时标签
  const getHourLabel = (index: number) => {
    return `${index.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white text-sm font-semibold">网络活动热力图</p>
          <p className="text-slate-500 text-xs mt-0.5">24小时数据请求分布</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>低</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-blue-900 rounded"></div>
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
              className={`h-10 rounded-md ${getIntensity(value)} transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-white/30 cursor-pointer`}
              title={`${getHourLabel(index)}: ${value.toLocaleString()} 请求`}
            />
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(index)}: {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 时间标签 */}
      <div className="grid grid-cols-12 gap-1.5 mt-2">
        {[0, 4, 8, 12, 16, 20].map((hour) => (
          <div key={hour} className="text-center">
            <span className="text-xs text-slate-500">{getHourLabel(hour)}</span>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
        <div className="text-center">
          <p className="text-xs text-slate-500">总请求量</p>
          <p className="text-sm font-semibold text-white">
            {hourlyData.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">峰值时段</p>
          <p className="text-sm font-semibold text-white">
            {getHourLabel(hourlyData.indexOf(maxValue))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">平均/小时</p>
          <p className="text-sm font-semibold text-white">
            {Math.round(hourlyData.reduce((a, b) => a + b, 0) / 24).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">峰值请求</p>
          <p className="text-sm font-semibold text-white">{maxValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// 数据新鲜度指示器组件
function DataFreshnessIndicator({ lastUpdated, latency }: { lastUpdated: Date; latency: number }) {
  // 获取延迟状态颜色
  const getLatencyColor = (ms: number) => {
    if (ms < 100) return { color: 'text-emerald-400', bgColor: 'bg-emerald-500', label: '优秀' };
    if (ms < 500) return { color: 'text-amber-400', bgColor: 'bg-amber-500', label: '良好' };
    return { color: 'text-rose-400', bgColor: 'bg-rose-500', label: '缓慢' };
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
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white text-sm font-semibold">数据新鲜度</p>
          <p className="text-slate-500 text-xs mt-0.5">实时数据同步状态</p>
        </div>
        <div className="p-2 bg-slate-700/50 rounded-lg">
          <svg
            className="w-5 h-5 text-slate-400"
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
        <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-500"
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
            <span className="text-sm text-slate-400">最后更新</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {lastUpdated.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs text-slate-500">{getTimeAgo()}</p>
          </div>
        </div>

        {/* 数据延迟 */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-500"
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
            <span className="text-sm text-slate-400">数据延迟</span>
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
            <span
              className={`text-xs px-2 py-0.5 rounded-full bg-slate-700 ${latencyStatus.color}`}
            >
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
        Math.max(1000, Math.round(value * (1 + fluctuation())))
      );

      return {
        ...prev,
        activeNodes: Math.max(1800, prev.activeNodes + Math.round((Math.random() - 0.5) * 10)),
        nodeUptime: Math.min(100, Math.max(99, prev.nodeUptime + fluctuation() * 0.1)),
        avgResponseTime: Math.max(
          200,
          Math.min(300, prev.avgResponseTime + Math.round((Math.random() - 0.5) * 20))
        ),
        hourlyActivity: newHourlyActivity,
        latency: Math.max(50, Math.min(800, prev.latency + Math.round((Math.random() - 0.5) * 30))),
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
      id: 'activeNodes',
      title: '活跃节点数',
      value: `${networkData.activeNodes.toLocaleString()}+`,
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
      title: '节点在线率',
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
      title: '平均响应时间',
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
      title: '数据更新频率',
      value: `每 ${networkData.updateFrequency}`,
      unit: '秒',
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
      title: '网络质押总量',
      value: (networkData.totalStaked / 1000000).toFixed(0),
      unit: 'M LINK',
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
      title: '数据源数量',
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
