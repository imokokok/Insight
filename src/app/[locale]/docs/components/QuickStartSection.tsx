'use client';

import Link from 'next/link';

import { Rocket, Search, TrendingUp, Bell, ArrowRight, CheckCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function QuickStartSection() {
  const t = useTranslations();

  const steps = [
    {
      icon: <Search className="w-6 h-6" />,
      title: t('docs.quickstart.steps.search.title') || '选择查询条件',
      description:
        t('docs.quickstart.steps.search.description') ||
        '选择预言机、区块链网络和交易对，设置时间范围进行查询',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: t('docs.quickstart.steps.analyze.title') || '查看价格数据',
      description:
        t('docs.quickstart.steps.analyze.description') ||
        '获取实时价格、历史数据、统计数据和可视化图表分析',
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: t('docs.quickstart.steps.alert.title') || '设置价格预警',
      description:
        t('docs.quickstart.steps.alert.description') ||
        '注册账号后可设置价格预警，当价格达到阈值时接收通知',
    },
  ];

  return (
    <section id="quickstart" className="py-16 scroll-mt-20">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Rocket className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('docs.quickstart.title') || '快速入门'}
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {t('docs.quickstart.description') ||
            '开始使用 Insight 平台，探索主流预言机协议的实时价格数据。'}
        </p>
      </div>

      {/* Platform Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('docs.quickstart.overview.title') || '平台概览'}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('docs.quickstart.overview.description') ||
            'Insight 是一个专业的区块链预言机价格数据分析平台，支持多预言机、多链的价格查询与对比分析。'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {t('docs.quickstart.overview.point1') ||
                '支持 Chainlink、Pyth、API3、DIA、RedStone、WINkLink 等 6 个主流预言机'}
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {t('docs.quickstart.overview.point2') || '覆盖 Ethereum、BSC、Arbitrum 等多条链'}
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {t('docs.quickstart.overview.point3') || '实时数据更新与历史价格分析'}
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('docs.quickstart.steps.title') || '快速开始步骤'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                {step.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <h4 className="font-semibold text-gray-900">{step.title}</h4>
              </div>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/price-query"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('docs.quickstart.cta.primary') || '开始价格查询'}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/cross-oracle"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('docs.quickstart.cta.secondary') || '多预言机对比'}
        </Link>
      </div>
    </section>
  );
}
