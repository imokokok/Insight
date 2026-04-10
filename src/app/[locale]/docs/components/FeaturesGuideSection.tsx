'use client';

import Link from 'next/link';

import {
  Layers,
  Search,
  GitCompare,
  Link2,
  Bell,
  ArrowRight,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function FeaturesGuideSection() {
  const t = useTranslations();

  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: t('docs.features.priceQuery.title') || '价格查询',
      description:
        t('docs.features.priceQuery.description') ||
        '查询单一预言机在单一链上的价格数据，支持历史数据分析和导出功能',
      href: '/price-query',
      highlights: [
        t('docs.features.priceQuery.highlight1') ||
          '支持 Chainlink、Pyth、API3、DIA、WINkLink、RedStone 等预言机',
        t('docs.features.priceQuery.highlight2') ||
          '提供实时价格、24小时变化、统计数据和交互式图表',
        t('docs.features.priceQuery.highlight3') || '支持 CSV、JSON、PDF 格式导出',
      ],
    },
    {
      icon: <GitCompare className="w-6 h-6" />,
      title: t('docs.features.crossOracle.title') || '多预言机对比',
      description:
        t('docs.features.crossOracle.description') ||
        '对比多个预言机的价格数据，检测价格偏差和数据质量',
      href: '/cross-oracle',
      highlights: [
        t('docs.features.crossOracle.highlight1') || '同时对比多个预言机的价格差异',
        t('docs.features.crossOracle.highlight2') || '异常检测和风险预警功能',
        t('docs.features.crossOracle.highlight3') || '数据质量评分和性能指标分析',
      ],
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      title: t('docs.features.crossChain.title') || '跨链分析',
      description:
        t('docs.features.crossChain.description') ||
        '分析同一交易对在不同区块链上的价格差异和套利机会',
      href: '/cross-chain',
      highlights: [
        t('docs.features.crossChain.highlight1') || '跨链价格热力图和价差分析',
        t('docs.features.crossChain.highlight2') || '相关性分析和协整检验',
        t('docs.features.crossChain.highlight3') || '波动率分析和价格分布统计',
      ],
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: t('docs.features.alerts.title') || '价格预警',
      description:
        t('docs.features.alerts.description') ||
        '设置价格阈值预警，当价格达到设定条件时接收实时通知',
      href: '/alerts',
      highlights: [
        t('docs.features.alerts.highlight1') || '支持价格上限、下限预警',
        t('docs.features.alerts.highlight2') || '预警历史记录和事件追踪',
        t('docs.features.alerts.highlight3') || '实时通知和邮件提醒',
      ],
    },
  ];

  return (
    <section id="features" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('docs.features.title') || '核心功能'}
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {t('docs.features.description') ||
            'Insight 平台提供以下核心功能，帮助您全面了解预言机数据。'}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-2 mb-4">
              {feature.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <BarChart3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <Link
              href={feature.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              {t('docs.features.learnMore') || '进入功能页面'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.realtime.title') || '实时数据'}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.realtime.description') || '数据实时更新，支持自动刷新配置'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.accurate.title') || '多源验证'}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.accurate.description') || '聚合多个预言机数据，提供可信度评分'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.comprehensive.title') || '专业分析'}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.comprehensive.description') || '丰富的统计指标和可视化图表'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
