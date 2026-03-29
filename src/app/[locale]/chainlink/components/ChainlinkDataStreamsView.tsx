'use client';

import { useState, useEffect } from 'react';

import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

import { useTranslations } from '@/i18n';

interface DataStreamStats {
  activeStreams: number;
  updateFrequency: number;
  avgLatency: number;
  bandwidth: number;
  throughput: number;
  packetLoss: number;
  reconnectCount: number;
}

interface DataFeed {
  pair: string;
  latency: number;
  threshold: number;
  subscribers: number;
  status: 'active' | 'paused';
  price: number;
  change24h: number;
}

interface PushEvent {
  id: string;
  feed: string;
  price: number;
  change: number;
  trigger: string;
  timestamp: Date;
}

interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  trend: number[];
}

const mockStreamStats: DataStreamStats = {
  activeStreams: 847,
  updateFrequency: 2450,
  avgLatency: 127,
  bandwidth: 1.8,
  throughput: 9847,
  packetLoss: 0.002,
  reconnectCount: 3,
};

const mockDataFeeds: DataFeed[] = [
  {
    pair: 'BTC/USD',
    latency: 89,
    threshold: 0.5,
    subscribers: 1247,
    status: 'active',
    price: 67842.35,
    change24h: 2.34,
  },
  {
    pair: 'ETH/USD',
    latency: 92,
    threshold: 0.5,
    subscribers: 1089,
    status: 'active',
    price: 3456.78,
    change24h: 1.56,
  },
  {
    pair: 'LINK/USD',
    latency: 78,
    threshold: 1.0,
    subscribers: 856,
    status: 'active',
    price: 14.52,
    change24h: -0.89,
  },
  {
    pair: 'SOL/USD',
    latency: 95,
    threshold: 0.5,
    subscribers: 723,
    status: 'active',
    price: 178.45,
    change24h: 3.21,
  },
  {
    pair: 'AVAX/USD',
    latency: 88,
    threshold: 1.0,
    subscribers: 512,
    status: 'active',
    price: 42.67,
    change24h: -1.23,
  },
  {
    pair: 'MATIC/USD',
    latency: 82,
    threshold: 1.0,
    subscribers: 678,
    status: 'active',
    price: 0.89,
    change24h: 0.45,
  },
  {
    pair: 'DOT/USD',
    latency: 91,
    threshold: 1.0,
    subscribers: 445,
    status: 'active',
    price: 7.82,
    change24h: -2.15,
  },
  {
    pair: 'ARB/USD',
    latency: 86,
    threshold: 1.0,
    subscribers: 389,
    status: 'paused',
    price: 1.23,
    change24h: 0.78,
  },
];

const mockPushEvents: PushEvent[] = [
  {
    id: 'evt-001',
    feed: 'BTC/USD',
    price: 67842.35,
    change: 0.15,
    trigger: 'Deviation',
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: 'evt-002',
    feed: 'ETH/USD',
    price: 3456.78,
    change: -0.08,
    trigger: 'Heartbeat',
    timestamp: new Date(Date.now() - 45000),
  },
  {
    id: 'evt-003',
    feed: 'LINK/USD',
    price: 14.52,
    change: 0.23,
    trigger: 'Deviation',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 'evt-004',
    feed: 'SOL/USD',
    price: 178.45,
    change: 0.42,
    trigger: 'Deviation',
    timestamp: new Date(Date.now() - 90000),
  },
  {
    id: 'evt-005',
    feed: 'AVAX/USD',
    price: 42.67,
    change: -0.12,
    trigger: 'Heartbeat',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: 'evt-006',
    feed: 'MATIC/USD',
    price: 0.89,
    change: 0.05,
    trigger: 'Heartbeat',
    timestamp: new Date(Date.now() - 150000),
  },
];

const mockLatencyMetrics: LatencyMetrics = {
  p50: 95,
  p95: 156,
  p99: 234,
  trend: [
    120, 115, 128, 110, 105, 118, 125, 108, 115, 122, 118, 112, 105, 98, 102, 108, 115, 120, 112,
    108,
  ],
};

const latencyDistributionData = [
  { range: '0-50ms', count: 125 },
  { range: '50-100ms', count: 342 },
  { range: '100-150ms', count: 287 },
  { range: '150-200ms', count: 156 },
  { range: '200-250ms', count: 89 },
  { range: '250ms+', count: 48 },
];

export function ChainlinkDataStreamsView() {
  const t = useTranslations('chainlink');
  const [stats, setStats] = useState<DataStreamStats>(mockStreamStats);
  const [feeds, setFeeds] = useState<DataFeed[]>(mockDataFeeds);
  const [events, setEvents] = useState<PushEvent[]>(mockPushEvents);
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>(mockLatencyMetrics);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        updateFrequency: prev.updateFrequency + Math.floor(Math.random() * 20 - 10),
        avgLatency: Math.max(
          80,
          Math.min(180, prev.avgLatency + Math.floor(Math.random() * 10 - 5))
        ),
        throughput: prev.throughput + Math.floor(Math.random() * 100 - 50),
      }));

      setLatencyMetrics((prev) => ({
        ...prev,
        trend: [...prev.trend.slice(1), Math.floor(Math.random() * 30) + 95],
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const latencyTrendData = latencyMetrics.trend.map((value, index) => ({
    time: `${index + 1}`,
    latency: value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('dataStreams.title') || 'Data Streams'}
        </h2>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isLive ? (
            <>
              <Wifi className="w-4 h-4" />
              {t('dataStreams.live') || 'Live'}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              {t('dataStreams.paused') || 'Paused'}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('dataStreams.activeStreams') || 'Active Streams'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.activeStreams.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dataStreams.totalFeeds') || 'Total feeds'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('dataStreams.updateFrequency') || 'Update Freq'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.updateFrequency.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dataStreams.updatesPerMin') || 'updates/min'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('dataStreams.avgLatency') || 'Avg Latency'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgLatency}ms</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            -12% {t('dataStreams.fromLastHour') || 'from last hour'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('dataStreams.throughput') || 'Throughput'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.throughput.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dataStreams.msgsPerSec') || 'msgs/sec'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dataStreams.dataFeeds') || 'Data Feeds'}
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">{t('dataStreams.pair') || 'Pair'}</div>
              <div className="col-span-2 text-right">{t('dataStreams.price') || 'Price'}</div>
              <div className="col-span-2 text-right">{t('dataStreams.latency') || 'Latency'}</div>
              <div className="col-span-2 text-right">
                {t('dataStreams.threshold') || 'Threshold'}
              </div>
              <div className="col-span-2 text-right">
                {t('dataStreams.subscribers') || 'Subscribers'}
              </div>
              <div className="col-span-1 text-center">{t('dataStreams.status') || 'Status'}</div>
            </div>
            {feeds.map((feed, index) => (
              <div
                key={feed.pair}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                  index !== feeds.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="col-span-3">
                  <span className="text-sm font-medium text-gray-900">{feed.pair}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    ${feed.price.toLocaleString()}
                  </span>
                  <span
                    className={`ml-1 text-xs ${
                      feed.change24h >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {feed.change24h >= 0 ? '+' : ''}
                    {feed.change24h}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-600">{feed.latency}ms</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-600">{feed.threshold}%</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-600">{feed.subscribers.toLocaleString()}</span>
                </div>
                <div className="col-span-1 text-center">
                  {feed.status === 'active' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dataStreams.performanceMetrics') || 'Performance Metrics'}
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {t('dataStreams.bandwidth') || 'Bandwidth'}
                </span>
                <span className="text-sm font-semibold text-gray-900">{stats.bandwidth} GB/s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {t('dataStreams.packetLoss') || 'Packet Loss'}
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  {(stats.packetLoss * 100).toFixed(3)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '2%' }} />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {t('dataStreams.reconnects') || 'Reconnects (24h)'}
                </span>
                <span className="text-sm font-semibold text-gray-900">{stats.reconnectCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 mb-3">
                {t('dataStreams.latencyPercentiles') || 'Latency Percentiles'}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{latencyMetrics.p50}ms</div>
                  <div className="text-xs text-gray-500">P50</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-lg font-bold text-purple-600">{latencyMetrics.p95}ms</div>
                  <div className="text-xs text-gray-500">P95</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded">
                  <div className="text-lg font-bold text-amber-600">{latencyMetrics.p99}ms</div>
                  <div className="text-xs text-gray-500">P99</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dataStreams.latencyTrend') || 'Latency Trend'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyTrendData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  domain={[80, 160]}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value}ms`, 'Latency']}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dataStreams.latencyDistribution') || 'Latency Distribution'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [value, 'Feeds']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataStreams.pushEvents') || 'Push Events Log'}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw className="w-3.5 h-3.5" />
            {t('dataStreams.realtime') || 'Real-time updates'}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">{t('dataStreams.eventId') || 'Event ID'}</div>
            <div className="col-span-2">{t('dataStreams.feed') || 'Feed'}</div>
            <div className="col-span-2 text-right">{t('dataStreams.price') || 'Price'}</div>
            <div className="col-span-2 text-right">{t('dataStreams.change') || 'Change'}</div>
            <div className="col-span-2">{t('dataStreams.trigger') || 'Trigger'}</div>
            <div className="col-span-2 text-right">{t('dataStreams.time') || 'Time'}</div>
          </div>
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== events.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-2">
                <span className="text-xs font-mono text-gray-600">{event.id}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm font-medium text-gray-900">{event.feed}</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold text-gray-900">
                  ${event.price.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span
                  className={`text-sm font-medium flex items-center justify-end gap-1 ${
                    event.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {event.change >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {event.change >= 0 ? '+' : ''}
                  {event.change}%
                </span>
              </div>
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    event.trigger === 'Deviation'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {event.trigger}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('dataStreams.about') || 'About Data Streams'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.realTimeDelivery') || 'Real-time Delivery'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.realTimeDeliveryDesc') ||
                  'Push-based price updates delivered directly to your smart contracts with sub-second latency.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.lowLatency') || 'Low Latency'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.lowLatencyDesc') ||
                  'Optimized for high-frequency trading and DeFi applications requiring instant price updates.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.reliable') || 'Reliable Delivery'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.reliableDesc') ||
                  'Guaranteed message delivery with automatic retry and failover mechanisms.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.customThresholds') || 'Custom Thresholds'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.customThresholdsDesc') ||
                  'Configure deviation thresholds and heartbeat intervals based on your requirements.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.heartbeat') || 'Heartbeat Updates'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.heartbeatDesc') ||
                  'Regular updates even when prices are stable, ensuring data freshness and contract health.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('dataStreams.autoFailover') || 'Auto Failover'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('dataStreams.autoFailoverDesc') ||
                  'Automatic failover to backup nodes ensures continuous service availability.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
