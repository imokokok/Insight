'use client';

import React, { useState } from 'react';

import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  Shield,
  Globe,
  Wallet,
  BarChart3,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorReportersViewProps } from '../types';

interface Reporter {
  address: string;
  stake: number;
  reports24h: number;
  totalReports: number;
  accuracy: number;
  rewards: number;
  status: 'active' | 'inactive';
  lastReport: string;
  region: string;
}

const mockReporters: Reporter[] = [
  {
    address: '0x7a8b...3c4d',
    stake: 5000,
    reports24h: 156,
    totalReports: 45230,
    accuracy: 99.8,
    rewards: 12500,
    status: 'active',
    lastReport: '2 min ago',
    region: 'North America',
  },
  {
    address: '0x9e2f...8a1b',
    stake: 3200,
    reports24h: 142,
    totalReports: 38450,
    accuracy: 99.5,
    rewards: 9800,
    status: 'active',
    lastReport: '5 min ago',
    region: 'Europe',
  },
  {
    address: '0x3d5c...9f2e',
    stake: 2800,
    reports24h: 128,
    totalReports: 32100,
    accuracy: 99.2,
    rewards: 8200,
    status: 'active',
    lastReport: '8 min ago',
    region: 'Asia',
  },
  {
    address: '0x1b4a...7d3c',
    stake: 1500,
    reports24h: 89,
    totalReports: 18500,
    accuracy: 98.9,
    rewards: 4500,
    status: 'active',
    lastReport: '12 min ago',
    region: 'South America',
  },
  {
    address: '0x6f8e...2a9b',
    stake: 1200,
    reports24h: 76,
    totalReports: 15200,
    accuracy: 98.5,
    rewards: 3800,
    status: 'active',
    lastReport: '15 min ago',
    region: 'Oceania',
  },
];

const regionDistribution = [
  { region: 'North America', count: 28, percentage: 38.9 },
  { region: 'Europe', count: 22, percentage: 30.6 },
  { region: 'Asia', count: 15, percentage: 20.8 },
  { region: 'South America', count: 5, percentage: 6.9 },
  { region: 'Oceania', count: 2, percentage: 2.8 },
];

export function TellorReportersView({ isLoading }: TellorReportersViewProps) {
  const t = useTranslations('tellor');
  const [expandedReporter, setExpandedReporter] = useState<string | null>(null);

  const stats = [
    {
      label: t('reporters.totalReporters'),
      value: '72',
      change: '+5',
      icon: Users,
      trend: 'up',
    },
    {
      label: t('reporters.active'),
      value: '68',
      change: '+3',
      icon: Target,
      trend: 'up',
    },
    {
      label: t('reporters.totalStaked'),
      value: '2.8M',
      change: '+12%',
      icon: Wallet,
      trend: 'up',
    },
    {
      label: t('reporters.avg'),
      value: '38,900',
      change: '+8%',
      icon: BarChart3,
      trend: 'up',
    },
  ];

  const avgMetrics = [
    { label: t('reporters.avgResponse'), value: '95ms', icon: Clock },
    { label: t('reporters.avgSuccess'), value: '99.2%', icon: Shield },
    { label: t('reporters.reports24h'), value: '12.5K', icon: Target },
    { label: t('reporters.avgRewards'), value: '850 TRB', icon: Award },
  ];

  return (
    <div className="space-y-8">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === 'up';
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-50">
                  <Icon className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 平均指标和地域分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 平均指标 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">{t('reporters.overview')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {avgMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="p-2 rounded-lg bg-white">
                    <Icon className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{metric.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 地域分布 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('reporters.regionDistribution')}
          </h3>
          <div className="space-y-3">
            {regionDistribution.map((region, index) => (
              <div key={index} className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 flex-1">{region.region}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {region.count} ({region.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 顶级报告者列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">{t('reporters.topReporters')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.rank')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.address')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.staked')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.reports')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.accuracy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.reward')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('reporters.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockReporters.map((reporter, index) => (
                <React.Fragment key={reporter.address}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedReporter(
                        expandedReporter === reporter.address ? null : reporter.address
                      )
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {reporter.address}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://etherscan.io/address/${reporter.address}`,
                              '_blank'
                            );
                          }}
                          className="text-gray-400 hover:text-cyan-600 transition-colors"
                          title={t('reporters.viewOnEtherscan')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reporter.stake.toLocaleString()} TRB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reporter.totalReports.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-emerald-600 font-medium">
                        {reporter.accuracy}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reporter.rewards.toLocaleString()} TRB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reporter.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {reporter.status === 'active'
                          ? t('reporters.active')
                          : t('reporters.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expandedReporter === reporter.address ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expandedReporter === reporter.address && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('reporters.region')}</p>
                            <p className="text-sm font-medium text-gray-900">{reporter.region}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {t('reporters.lastReport')}
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {reporter.lastReport}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {t('reporters.reports24h')}
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {reporter.reports24h}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {t('reporters.activityRate')}
                            </p>
                            <p className="text-sm font-medium text-emerald-600">
                              {((reporter.reports24h / 24) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
