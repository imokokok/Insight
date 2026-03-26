'use client';

import React from 'react';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { type Blockchain } from '@/types/oracle';

interface Protocol {
  name: string;
  category: string;
  tvl: string;
  description: string;
  logo?: string;
}

interface UseCase {
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
}

interface UMAEcosystemPanelProps {
  supportedChains: Blockchain[];
}

export function UMAEcosystemPanel({ supportedChains }: UMAEcosystemPanelProps) {
  const t = useTranslations();

  // 使用UMA的协议列表
  const protocols: Protocol[] = [
    {
      name: 'Across Protocol',
      category: t('uma.ecosystem.category.bridge'),
      tvl: '$150M+',
      description: t('uma.ecosystem.protocols.across'),
    },
    {
      name: 'Polymarket',
      category: t('uma.ecosystem.category.prediction'),
      tvl: '$50M+',
      description: t('uma.ecosystem.protocols.polymarket'),
    },
    {
      name: 'Sherlock',
      category: t('uma.ecosystem.category.insurance'),
      tvl: '$100M+',
      description: t('uma.ecosystem.protocols.sherlock'),
    },
    {
      name: 'Outcome Finance',
      category: t('uma.ecosystem.category.treasury'),
      tvl: '$200M+',
      description: t('uma.ecosystem.protocols.outcome'),
    },
  ];

  // Optimistic Oracle用例
  const useCases: UseCase[] = [
    {
      title: t('uma.ecosystem.useCases.insurance.title'),
      description: t('uma.ecosystem.useCases.insurance.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      examples: t.raw('uma.ecosystem.examples.insurance') || [],
    },
    {
      title: t('uma.ecosystem.useCases.prediction.title'),
      description: t('uma.ecosystem.useCases.prediction.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
      examples: t.raw('uma.ecosystem.examples.prediction') || [],
    },
    {
      title: t('uma.ecosystem.useCases.bridge.title'),
      description: t('uma.ecosystem.useCases.bridge.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      examples: t.raw('uma.ecosystem.examples.bridge') || [],
    },
    {
      title: t('uma.ecosystem.useCases.treasury.title'),
      description: t('uma.ecosystem.useCases.treasury.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      examples: t.raw('uma.ecosystem.examples.treasury') || [],
    },
  ];

  // 价格请求类型分布数据
  const requestTypes = [
    {
      type: t('uma.ecosystem.requestTypes.price'),
      percentage: 45,
      color: 'bg-primary-500',
    },
    {
      type: t('uma.ecosystem.requestTypes.state'),
      percentage: 25,
      color: 'bg-emerald-500',
    },
    {
      type: t('uma.ecosystem.requestTypes.custom'),
      percentage: 20,
      color: 'bg-purple-500',
    },
    { type: t('uma.ecosystem.requestTypes.other'), percentage: 10, color: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Optimistic Oracle介绍 */}
      <DashboardCard title={t('uma.ecosystem.ooTitle')}>
        <div className="space-y-4">
          <p className="text-gray-600">{t('uma.ecosystem.ooDescription')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-5 text-center border-r border-gray-200">
              <p className="text-3xl font-bold text-gray-900">2,500+</p>
              <p className="text-sm text-gray-500 mt-1">{t('uma.ecosystem.stats.requests')}</p>
            </div>
            <div className="bg-gray-50 p-5 text-center border-r border-gray-200">
              <p className="text-3xl font-bold text-gray-900">50+</p>
              <p className="text-sm text-gray-500 mt-1">{t('uma.ecosystem.stats.protocols')}</p>
            </div>
            <div className="bg-gray-50 p-5 text-center">
              <p className="text-3xl font-bold text-gray-900">$500M+</p>
              <p className="text-sm text-gray-500 mt-1">{t('uma.ecosystem.stats.secured')}</p>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* 价格请求类型分布 */}
      <DashboardCard title={t('uma.ecosystem.requestDistribution')}>
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 overflow-hidden flex">
            {requestTypes.map((item, index) => (
              <div
                key={index}
                className={`${item.color} h-full`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.type}: ${item.percentage}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {requestTypes.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 ${item.color}`} />
                <span className="text-sm text-gray-600">{item.type}</span>
                <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      {/* 用例展示 */}
      <DashboardCard title={t('uma.ecosystem.useCasesTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all duration-200 rounded-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-gray-600 p-2 bg-gray-50 border border-gray-200 rounded">
                  {useCase.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{useCase.title}</h4>
                  <p className="text-sm text-gray-500 mt-1.5">{useCase.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {useCase.examples.map((example, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-xs text-gray-600 rounded"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 使用UMA的协议 */}
      <DashboardCard title={t('uma.ecosystem.protocolsTitle')}>
        <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
          {protocols.map((protocol, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors ${
                index < protocols.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold rounded">
                  {protocol.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{protocol.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{protocol.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded">
                  {protocol.category}
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1.5">{protocol.tvl}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 支持的链 */}
      <DashboardCard title={t('uma.ecosystem.supportedChains')}>
        <div className="space-y-4">
          <p className="text-gray-600">{t('uma.ecosystem.chainsDescription')}</p>
          <div className="flex flex-wrap gap-2">
            {supportedChains.map((chain, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 rounded"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

export default UMAEcosystemPanel;
