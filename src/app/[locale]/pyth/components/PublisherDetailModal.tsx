'use client';

import { useMemo } from 'react';

import {
  X,
  Shield,
  TrendingUp,
  Activity,
  Award,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

import { type PublisherData } from '../types';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors } from '@/lib/config/colors';

interface PublisherDetailModalProps {
  publisher: PublisherData;
  isOpen: boolean;
  onClose: () => void;
}

interface StakeHistoryPoint {
  date: string;
  stake: number;
}

interface AccuracyHistoryPoint {
  date: string;
  accuracy: number;
}

interface PriceSource {
  id: string;
  name: string;
  category: string;
  lastUpdate: string;
  status: 'active' | 'inactive';
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
}

function generateStakeHistory(): StakeHistoryPoint[] {
  const data: StakeHistoryPoint[] = [];
  const baseStake = Math.random() * 50 + 50;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 10;
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      stake: Math.max(0, baseStake + variation + (30 - i) * 0.5),
    });
  }
  return data;
}

function generateAccuracyHistory(): AccuracyHistoryPoint[] {
  const data: AccuracyHistoryPoint[] = [];
  const baseAccuracy = 97 + Math.random() * 2;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 2;
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      accuracy: Math.min(100, Math.max(95, baseAccuracy + variation)),
    });
  }
  return data;
}

function generatePriceSources(): PriceSource[] {
  const sources = [
    { name: 'BTC/USD', category: 'Crypto' },
    { name: 'ETH/USD', category: 'Crypto' },
    { name: 'SOL/USD', category: 'Crypto' },
    { name: 'BNB/USD', category: 'Crypto' },
    { name: 'XRP/USD', category: 'Crypto' },
    { name: 'ADA/USD', category: 'Crypto' },
    { name: 'DOGE/USD', category: 'Crypto' },
    { name: 'AVAX/USD', category: 'Crypto' },
  ];
  return sources.map((source, index) => ({
    id: `source-${index}`,
    name: source.name,
    category: source.category,
    lastUpdate: new Date(Date.now() - Math.random() * 60000).toLocaleTimeString('zh-CN'),
    status: Math.random() > 0.1 ? 'active' : 'inactive',
  }));
}

function generatePerformanceMetrics(): PerformanceMetric[] {
  return [
    { label: '数据提交次数', value: Math.floor(Math.random() * 10000 + 5000), change: Math.random() * 10 - 5 },
    { label: '平均响应时间', value: Math.floor(Math.random() * 100 + 50), change: -(Math.random() * 5) },
    { label: '成功率', value: 99 + Math.random() * 0.9, change: Math.random() * 0.5 },
    { label: '活跃天数', value: Math.floor(Math.random() * 300 + 100), change: 1 },
  ];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm">
            <span className="text-gray-500">{entry.name}:</span>
            <span className="ml-2 font-medium" style={{ color: entry.color }}>
              {entry.name.includes('质押') ? `${entry.value.toFixed(1)}M` : `${entry.value.toFixed(2)}%`}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PublisherDetailModal({ publisher, isOpen, onClose }: PublisherDetailModalProps) {
  const t = useTranslations();

  const stakeHistory = useMemo(() => generateStakeHistory(), []);
  const accuracyHistory = useMemo(() => generateAccuracyHistory(), []);
  const priceSources = useMemo(() => generatePriceSources(), []);
  const performanceMetrics = useMemo(() => generatePerformanceMetrics(), []);

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'active':
        return {
          label: t('pyth.publisher.statusActive') || '活跃',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'inactive':
        return {
          label: t('pyth.publisher.statusInactive') || '不活跃',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: <AlertCircle className="w-4 h-4" />,
        };
      default:
        return {
          label: t('pyth.publisher.statusActive') || '活跃',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
    }
  };

  const statusDisplay = getStatusDisplay(publisher.status);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{publisher.name}</h2>
                <p className="text-sm text-gray-500">
                  {t('pyth.publisher.id') || 'ID'}: {publisher.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.publisher.stake') || '质押量'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {((publisher.stake ?? 0) / 1e6).toFixed(1)}M
              </p>
              <p className="text-xs text-gray-400 mt-1">PYTH</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.publisher.accuracy') || '准确率'}
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{publisher.accuracy}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('pyth.publisher.last30Days') || '近30天'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.publisher.contribution') || '贡献度'}
                </span>
              </div>
              <p className="text-2xl font-bold text-violet-600">
                {(publisher.contribution ?? 0).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('pyth.publisher.networkShare') || '网络占比'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.publisher.status') || '状态'}
                </span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${statusDisplay.bgColor}`}>
                {statusDisplay.icon}
                <span className={`text-sm font-medium ${statusDisplay.color}`}>
                  {statusDisplay.label}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.publisher.stakeHistory') || '质押历史'}
            </h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stakeHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stakeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="date"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickFormatter={(value) => `${value.toFixed(0)}M`}
                    width={60}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="stake"
                    name={t('pyth.publisher.stake') || '质押量'}
                    stroke={chartColors.recharts.primary}
                    strokeWidth={2}
                    fill="url(#stakeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.publisher.accuracyTrend') || '准确率趋势'}
            </h3>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="date"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    domain={[95, 100]}
                    tickFormatter={(value) => `${value}%`}
                    width={60}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name={t('pyth.publisher.accuracy') || '准确率'}
                    stroke={chartColors.recharts.success}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: chartColors.recharts.success }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.publisher.priceSources') || '贡献的价格源'}
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.publisher.sourceName') || '名称'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.publisher.category') || '类别'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.publisher.lastUpdate') || '最后更新'}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.publisher.sourceStatus') || '状态'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priceSources.map((source) => (
                    <tr key={source.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{source.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{source.category}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{source.lastUpdate}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            source.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {source.status === 'active' ? '活跃' : '不活跃'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {t('pyth.publisher.totalSources') || '总计'} {priceSources.length} {t('pyth.publisher.sources') || '个价格源'}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.publisher.performanceMetrics') || '历史表现'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-gray-900">
                      {typeof metric.value === 'number' && metric.label.includes('率')
                        ? metric.value.toFixed(2) + '%'
                        : metric.value.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        metric.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {metric.change >= 0 ? '+' : ''}
                      {metric.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-violet-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-violet-900">
                    {t('pyth.publisher.info') || '发布者信息'}
                  </h4>
                  <p className="text-sm text-violet-700 mt-1">
                    {t('pyth.publisher.infoDesc') ||
                      '该发布者是 Pyth 网络的受信任数据提供者，持续为多个价格源提供高质量的市场数据。'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-md"
            >
              {t('pyth.publisher.close') || '关闭'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
