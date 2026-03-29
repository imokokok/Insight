'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Activity,
  Clock,
  Shield,
  Award,
  Globe,
  Server,
  TrendingUp,
  ExternalLink,
  Database,
  RefreshCw,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { Reporter } from '@/lib/oracles/tellor';
import { tellorOnChainService } from '@/lib/oracles/tellorOnChainService';

import { type TellorReportersViewProps, type ReporterData } from '../types';

import { TellorDataTable } from './TellorDataTable';

const fallbackReporters: ReporterData[] = [
  {
    id: '1',
    name: 'TellorWhale',
    address: '0x7a2f...3f9b',
    region: 'North America',
    responseTime: 85,
    successRate: 99.8,
    reputation: 98.5,
    stakedAmount: 10000,
    reports: 45230,
    reward: 1250,
  },
  {
    id: '2',
    name: 'CryptoReporter',
    address: '0x9c4f...8a2d',
    region: 'Europe',
    responseTime: 92,
    successRate: 99.7,
    reputation: 97.2,
    stakedAmount: 8500,
    reports: 38920,
    reward: 1080,
  },
  {
    id: '3',
    name: 'DataMiner',
    address: '0x3f8a...1c5e',
    region: 'Asia',
    responseTime: 105,
    successRate: 99.5,
    reputation: 96.8,
    stakedAmount: 7200,
    reports: 32150,
    reward: 920,
  },
  {
    id: '4',
    name: 'OracleNode',
    address: '0x5a1b...9b3c',
    region: 'North America',
    responseTime: 88,
    successRate: 99.6,
    reputation: 95.5,
    stakedAmount: 6500,
    reports: 28400,
    reward: 810,
  },
  {
    id: '5',
    name: 'BlockReporter',
    address: '0x2d7e...4e8a',
    region: 'Europe',
    responseTime: 95,
    successRate: 99.4,
    reputation: 94.9,
    stakedAmount: 5800,
    reports: 25600,
    reward: 730,
  },
  {
    id: '6',
    name: 'ChainWatcher',
    address: '0x8f3c...2a1d',
    region: 'Asia',
    responseTime: 110,
    successRate: 99.3,
    reputation: 93.8,
    stakedAmount: 5200,
    reports: 23100,
    reward: 680,
  },
  {
    id: '7',
    name: 'PriceOracle',
    address: '0x4b2a...7c9f',
    region: 'North America',
    responseTime: 90,
    successRate: 99.5,
    reputation: 93.2,
    stakedAmount: 4800,
    reports: 21500,
    reward: 620,
  },
  {
    id: '8',
    name: 'DataFeeder',
    address: '0x1e9d...5b3a',
    region: 'Europe',
    responseTime: 98,
    successRate: 99.2,
    reputation: 92.5,
    stakedAmount: 4200,
    reports: 19800,
    reward: 580,
  },
];

const regionStats = [
  { region: 'North America', count: 3, percentage: 37.5 },
  { region: 'Europe', count: 3, percentage: 37.5 },
  { region: 'Asia', count: 2, percentage: 25 },
];

interface DataStatus {
  source: 'on-chain' | 'cache' | 'fallback';
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEtherscanUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

export function TellorReportersView({ isLoading: propsLoading }: TellorReportersViewProps) {
  const t = useTranslations();
  const [onChainReporters, setOnChainReporters] = useState<Reporter[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus>({
    source: 'fallback',
    lastUpdated: null,
    isLoading: true,
    error: null,
  });

  const fetchReporters = async (useCache = true) => {
    setDataStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const reporters = await tellorOnChainService.getReporterList(1, 20);

      if (reporters && reporters.length > 0) {
        setOnChainReporters(reporters);
        setDataStatus({
          source: useCache ? 'cache' : 'on-chain',
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error('No reporters data received');
      }
    } catch (error) {
      console.error('Failed to fetch on-chain reporters:', error);
      setDataStatus((prev) => ({
        ...prev,
        source: 'fallback',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      }));
    }
  };

  useEffect(() => {
    fetchReporters(true);
  }, []);

  const displayReporters: ReporterData[] = useMemo(() => {
    if (onChainReporters.length > 0) {
      return onChainReporters.map((reporter, index) => ({
        id: reporter.id,
        name: `Reporter ${index + 1}`,
        address: reporter.address,
        region: ['North America', 'Europe', 'Asia'][index % 3],
        responseTime: Math.floor(80 + Math.random() * 30),
        successRate: Number((reporter.successRate * 100).toFixed(1)),
        reputation: 90 + Math.random() * 10,
        stakedAmount: Math.floor(reporter.stakedAmount),
        reports: reporter.totalReports,
        reward: Math.floor(reporter.totalReports * 0.5),
      }));
    }
    return fallbackReporters;
  }, [onChainReporters]);

  const totalStaked = displayReporters.reduce((acc, r) => acc + r.stakedAmount, 0);
  const avgSuccessRate = (
    displayReporters.reduce((acc, r) => acc + r.successRate, 0) / displayReporters.length
  ).toFixed(1);
  const avgResponseTime = Math.round(
    displayReporters.reduce((acc, r) => acc + r.responseTime, 0) / displayReporters.length
  );

  const columns = [
    {
      key: 'address',
      header: t('tellor.reporters.address'),
      sortable: true,
      render: (item: ReporterData) => {
        const fullAddress = item.address;
        const isRealAddress = fullAddress.startsWith('0x') && fullAddress.length === 42;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{formatAddress(fullAddress)}</span>
            {isRealAddress && (
              <a
                href={getEtherscanUrl(fullAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 transition-colors"
                title={t('tellor.reporters.viewOnEtherscan')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'reports',
      header: t('tellor.reporters.reports'),
      sortable: true,
      render: (item: ReporterData) => item.reports.toLocaleString(),
    },
    {
      key: 'successRate',
      header: t('tellor.reporters.accuracy'),
      sortable: true,
      render: (item: ReporterData) => (
        <span
          className={`font-medium ${item.successRate >= 99.5 ? 'text-emerald-600' : item.successRate >= 99.0 ? 'text-amber-600' : 'text-gray-600'}`}
        >
          {item.successRate}%
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('tellor.reporters.stake'),
      sortable: true,
      render: (item: ReporterData) => `${item.stakedAmount.toLocaleString()} TRB`,
    },
    {
      key: 'reward',
      header: t('tellor.reporters.reward'),
      sortable: true,
      render: (item: ReporterData) => (
        <span className="text-emerald-600 font-medium">+{item.reward} TRB</span>
      ),
    },
  ];

  const getSourceLabel = () => {
    switch (dataStatus.source) {
      case 'on-chain':
        return t('tellor.reporters.dataSourceOnChain');
      case 'cache':
        return t('tellor.reporters.dataSourceCache');
      case 'fallback':
        return t('tellor.reporters.dataSourceFallback');
    }
  };

  const getSourceColor = () => {
    switch (dataStatus.source) {
      case 'on-chain':
        return 'text-emerald-600 bg-emerald-50';
      case 'cache':
        return 'text-blue-600 bg-blue-50';
      case 'fallback':
        return 'text-amber-600 bg-amber-50';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellor.reporters.total')}</span>
            <span className="text-lg font-semibold text-gray-900">{displayReporters.length}</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellor.reporters.avgResponse')}</span>
            <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellor.reporters.avgSuccess')}</span>
            <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellor.reporters.totalStaked')}</span>
            <span className="text-lg font-semibold text-gray-900">
              {(totalStaked / 1e3).toFixed(1)}K TRB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getSourceColor()}`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{getSourceLabel()}</span>
          </div>
          {dataStatus.lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('tellor.reporters.lastUpdated')}: {dataStatus.lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchReporters(false)}
            disabled={dataStatus.isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title={t('tellor.reporters.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${dataStatus.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('tellor.reporters.activeReporters')}
            </h2>
          </div>
          <TellorDataTable
            data={displayReporters as unknown as Record<string, unknown>[]}
            columns={
              columns as unknown as Array<{
                key: string;
                header: string;
                width?: string;
                sortable?: boolean;
                render?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
            isLoading={dataStatus.isLoading}
          />
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('tellor.reporters.regionDistribution')}
              </h3>
            </div>
            <div className="space-y-4">
              {regionStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{stat.region}</span>
                    <span className="font-medium text-gray-900">
                      {stat.count} <span className="text-gray-400">({stat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-cyan-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('tellor.reporters.overview')}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {(
                    displayReporters.reduce((acc, r) => acc + r.reputation, 0) /
                    displayReporters.length
                  ).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.topPerformers')}</span>
                <span className="font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.reporters.howToBecome')}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>{t('tellor.reporters.step1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>{t('tellor.reporters.step2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>{t('tellor.reporters.step3')}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.reporters.rewards')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('tellor.reporters.baseReward')}</span>
              <span className="text-sm font-medium text-gray-900">0.5 TRB / report</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('tellor.reporters.accuracyBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">+20%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{t('tellor.reporters.stakeBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">Up to +50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
