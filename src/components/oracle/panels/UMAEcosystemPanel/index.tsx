'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '../../common/DashboardCard';
import { Blockchain } from '@/types/oracle';

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
  const { t } = useI18n();

  // 使用UMA的协议列表
  const protocols: Protocol[] = [
    {
      name: 'Across Protocol',
      category: t('uma.ecosystem.category.bridge') || '跨链桥',
      tvl: '$150M+',
      description: t('uma.ecosystem.protocols.across') || '使用UMA进行快速、低成本的跨链转账',
    },
    {
      name: 'Polymarket',
      category: t('uma.ecosystem.category.prediction') || '预测市场',
      tvl: '$50M+',
      description: t('uma.ecosystem.protocols.polymarket') || '使用UMA OO解决预测市场结果',
    },
    {
      name: 'Sherlock',
      category: t('uma.ecosystem.category.insurance') || '保险',
      tvl: '$100M+',
      description: t('uma.ecosystem.protocols.sherlock') || '使用UMA进行智能合约审计争议解决',
    },
    {
      name: 'Outcome Finance',
      category: t('uma.ecosystem.category.treasury') || '财库管理',
      tvl: '$200M+',
      description: t('uma.ecosystem.protocols.outcome') || '使用UMA进行结构化产品',
    },
  ];

  // Optimistic Oracle用例
  const useCases: UseCase[] = [
    {
      title: t('uma.ecosystem.useCases.insurance.title') || '保险与风险管理',
      description:
        t('uma.ecosystem.useCases.insurance.desc') ||
        '为智能合约保险、参数保险等提供去中心化理赔验证',
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
      examples: ['智能合约保险', '参数保险', '作物保险'],
    },
    {
      title: t('uma.ecosystem.useCases.prediction.title') || '预测市场',
      description:
        t('uma.ecosystem.useCases.prediction.desc') || '为预测市场提供公正、及时的结果验证机制',
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
      examples: ['政治事件', '体育赛事', '加密市场预测'],
    },
    {
      title: t('uma.ecosystem.useCases.bridge.title') || '跨链桥',
      description: t('uma.ecosystem.useCases.bridge.desc') || '为跨链桥提供快速、安全的转账验证',
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
      examples: ['快速跨链转账', '流动性桥接', '消息传递'],
    },
    {
      title: t('uma.ecosystem.useCases.treasury.title') || '财库与结构化产品',
      description:
        t('uma.ecosystem.useCases.treasury.desc') || '为DAO财库管理和结构化金融产品提供支持',
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
      examples: ['KPI期权', '结构化产品', '财库多元化'],
    },
  ];

  // 价格请求类型分布数据
  const requestTypes = [
    {
      type: t('uma.ecosystem.requestTypes.price') || '价格请求',
      percentage: 45,
      color: 'bg-blue-500',
    },
    {
      type: t('uma.ecosystem.requestTypes.state') || '状态验证',
      percentage: 25,
      color: 'bg-green-500',
    },
    {
      type: t('uma.ecosystem.requestTypes.custom') || '自定义数据',
      percentage: 20,
      color: 'bg-purple-500',
    },
    { type: t('uma.ecosystem.requestTypes.other') || '其他', percentage: 10, color: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Optimistic Oracle介绍 */}
      <DashboardCard title={t('uma.ecosystem.ooTitle') || 'Optimistic Oracle'}>
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('uma.ecosystem.ooDescription') ||
              'UMA的Optimistic Oracle (OO) 是一种去中心化的事实验证机制，允许任何人为任何数据提供答案，并通过经济激励确保答案的正确性。'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">2,500+</p>
              <p className="text-sm text-gray-600">
                {t('uma.ecosystem.stats.requests') || '累计请求数'}
              </p>
            </div>
            <div className="bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">50+</p>
              <p className="text-sm text-gray-600">
                {t('uma.ecosystem.stats.protocols') || '集成协议'}
              </p>
            </div>
            <div className="bg-purple-50 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">$500M+</p>
              <p className="text-sm text-gray-600">
                {t('uma.ecosystem.stats.secured') || '保障价值'}
              </p>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* 价格请求类型分布 */}
      <DashboardCard title={t('uma.ecosystem.requestDistribution') || '价格请求类型分布'}>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
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
      <DashboardCard title={t('uma.ecosystem.useCases') || 'Optimistic Oracle 用例'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="border border-gray-200 p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-blue-600">{useCase.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{useCase.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{useCase.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {useCase.examples.map((example, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-xs text-gray-600">
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
      <DashboardCard title={t('uma.ecosystem.protocolsTitle') || '使用UMA的协议'}>
        <div className="space-y-3">
          {protocols.map((protocol, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {protocol.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{protocol.name}</h4>
                  <p className="text-xs text-gray-500">{protocol.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs">
                  {protocol.category}
                </span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{protocol.tvl}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 支持的链 */}
      <DashboardCard title={t('uma.ecosystem.supportedChains') || '支持的区块链'}>
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('uma.ecosystem.chainsDescription') ||
              'UMA已部署到以下区块链网络，提供跨链预言机服务：'}
          </p>
          <div className="flex flex-wrap gap-2">
            {supportedChains.map((chain, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200"
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
