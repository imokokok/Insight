'use client';

import { Database, Clock, DollarSign, Users, Zap, Shield, TrendingUp } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RedStoneDataStreamsViewProps } from '../types';

export function RedStoneDataStreamsView({ metrics, isLoading }: RedStoneDataStreamsViewProps) {
  const t = useTranslations();

  const stats = [
    {
      title: t('redstone.dataStreams.streamCount'),
      value: '1,250+',
      change: '+120',
      icon: Database,
    },
    {
      title: t('redstone.dataStreams.freshnessScore'),
      value: metrics?.dataFreshnessScore ? metrics.dataFreshnessScore.toFixed(1) : '98.5',
      suffix: '/100',
      change: '+0.8',
      icon: Clock,
    },
    {
      title: t('redstone.dataStreams.modularFee'),
      value: metrics?.modularFee ? (metrics.modularFee * 100).toFixed(3) : '0.015',
      suffix: '%',
      change: '-0.002%',
      icon: DollarSign,
    },
    {
      title: t('redstone.dataStreams.providerCount'),
      value: metrics?.providerCount || 18,
      change: '+3',
      icon: Users,
    },
  ];

  const streamTypes = [
    { label: t('redstone.dataStreams.priceFeeds'), value: '1,000+', percentage: 80 },
    { label: t('redstone.dataStreams.customData'), value: '150+', percentage: 12 },
    { label: t('redstone.dataStreams.l2Data'), value: '100+', percentage: 8 },
  ];

  const updateFrequencies = [
    { label: t('redstone.dataStreams.highFrequency'), time: '~10s' },
    { label: t('redstone.dataStreams.standard'), time: '~60s' },
    { label: t('redstone.dataStreams.lowFrequency'), time: '~300s' },
  ];

  const pullModelAdvantages = [
    {
      icon: Zap,
      label: t('redstone.dataStreams.lowLatency'),
      desc: t('redstone.dataStreams.lowLatencyDesc'),
    },
    {
      icon: DollarSign,
      label: t('redstone.dataStreams.costEfficient'),
      desc: t('redstone.dataStreams.costEfficientDesc'),
    },
    {
      icon: Shield,
      label: t('redstone.dataStreams.secure'),
      desc: t('redstone.dataStreams.secureDesc'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* 顶部统计 - 简洁行内布局 */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-2">
            <stat.icon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">{stat.title}:</span>
            <span className="font-semibold text-gray-900">
              {isLoading ? '-' : `${stat.value}${stat.suffix || ''}`}
            </span>
            <span className="text-xs text-emerald-600">{stat.change}</span>
          </div>
        ))}
      </div>

      {/* 数据流类型分布 - 水平进度条 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.dataStreams.streamTypes')}
        </h3>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {streamTypes.map((type, index) => (
            <div
              key={index}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${type.percentage}%`,
                backgroundColor: index === 0 ? '#ef4444' : index === 1 ? '#f87171' : '#fca5a5',
              }}
              title={`${type.label}: ${type.value}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-6 mt-3 text-sm">
          {streamTypes.map((type, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: index === 0 ? '#ef4444' : index === 1 ? '#f87171' : '#fca5a5',
                }}
              />
              <span className="text-gray-600">{type.label}</span>
              <span className="font-medium text-gray-900">{type.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 更新频率 - 列表布局 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.dataStreams.updateFrequencyTitle')}
        </h3>
        <div className="flex items-center gap-8">
          {updateFrequencies.map((freq, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{freq.label}</span>
              <span className="text-sm font-semibold text-gray-900">{freq.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pull Model 优势 - 图标+文字 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.dataStreams.pullModelAdvantages')}
        </h3>
        <div className="flex flex-wrap items-start gap-8">
          {pullModelAdvantages.map((advantage, index) => (
            <div key={index} className="flex items-start gap-3">
              <advantage.icon className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-gray-900">{advantage.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{advantage.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
