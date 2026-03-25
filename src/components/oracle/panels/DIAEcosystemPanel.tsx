'use client';

import { useState, useMemo } from 'react';
import { EcosystemIntegration } from '@/lib/oracles/dia';
import { useTranslations } from '@/i18n';
import { Blockchain } from '@/types/oracle';
import { DashboardCard } from '@/components/oracle';

type Category = 'all' | 'dex' | 'lending' | 'derivatives' | 'yield' | 'insurance';

interface DIAEcosystemPanelProps {
  integrations: EcosystemIntegration[];
}

function formatTVL(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'dex':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'lending':
      return 'bg-primary-100 text-primary-800 border-primary-200';
    case 'derivatives':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'yield':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'insurance':
      return 'bg-danger-100 text-danger-800 border-danger-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getIntegrationDepthBadge(depth: string): { color: string; label: string } {
  switch (depth) {
    case 'full':
      return { color: 'bg-success-500 text-white', label: 'dia.ecosystem.depth.full' };
    case 'partial':
      return { color: 'bg-warning-500 text-white', label: 'dia.ecosystem.depth.partial' };
    case 'experimental':
      return { color: 'bg-warning-500 text-white', label: 'dia.ecosystem.depth.experimental' };
    default:
      return { color: 'bg-gray-500 text-white', label: 'dia.ecosystem.depth.unknown' };
  }
}

function getBlockchainName(chain: Blockchain): string {
  switch (chain) {
    case Blockchain.ETHEREUM:
      return 'Ethereum';
    case Blockchain.ARBITRUM:
      return 'Arbitrum';
    case Blockchain.POLYGON:
      return 'Polygon';
    case Blockchain.AVALANCHE:
      return 'Avalanche';
    case Blockchain.BNB_CHAIN:
      return 'BNB Chain';
    case Blockchain.BASE:
      return 'Base';
    case Blockchain.OPTIMISM:
      return 'Optimism';
    case Blockchain.SOLANA:
      return 'Solana';
    default:
      return chain;
  }
}

export function DIAEcosystemPanel({ integrations }: DIAEcosystemPanelProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'dia.ecosystem.category.all' },
    { key: 'dex', label: 'dia.ecosystem.category.dex' },
    { key: 'lending', label: 'dia.ecosystem.category.lending' },
    { key: 'derivatives', label: 'dia.ecosystem.category.derivatives' },
    { key: 'yield', label: 'dia.ecosystem.category.yield' },
    { key: 'insurance', label: 'dia.ecosystem.category.insurance' },
  ];

  const stats = useMemo(() => {
    const totalProtocols = integrations.length;
    const totalTVL = integrations.reduce((sum, item) => sum + item.tvl, 0);
    const byCategory = {
      dex: integrations.filter((i) => i.category === 'dex').length,
      lending: integrations.filter((i) => i.category === 'lending').length,
      derivatives: integrations.filter((i) => i.category === 'derivatives').length,
      yield: integrations.filter((i) => i.category === 'yield').length,
      insurance: integrations.filter((i) => i.category === 'insurance').length,
    };

    return { totalProtocols, totalTVL, byCategory };
  }, [integrations]);

  const filteredIntegrations = useMemo(() => {
    if (selectedCategory === 'all') {
      return integrations;
    }
    return integrations.filter((item) => item.category === selectedCategory);
  }, [integrations, selectedCategory]);

  return (
    <div className="space-y-6">
      <DashboardCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dia.ecosystem.title')}</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.totalProtocols}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.totalProtocols')}
            </p>
          </DashboardCard>
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.byCategory.dex}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.category.dex')}
            </p>
          </DashboardCard>
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.byCategory.lending}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.category.lending')}
            </p>
          </DashboardCard>
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.byCategory.derivatives}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.category.derivatives')}
            </p>
          </DashboardCard>
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.byCategory.yield}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.category.yield')}
            </p>
          </DashboardCard>
          <DashboardCard className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatTVL(stats.totalTVL)}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
              {t('dia.ecosystem.totalTVL')}
            </p>
          </DashboardCard>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                selectedCategory === category.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(category.label)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIntegrations.map((integration) => {
            const depthBadge = getIntegrationDepthBadge(integration.integrationDepth);
            return (
              <DashboardCard
                key={integration.protocolId}
                className="p-4 hover:border-indigo-300 transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-gray-900 truncate">
                      {integration.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getBlockchainName(integration.chain)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded border ${getCategoryBadgeColor(
                      integration.category
                    )}`}
                  >
                    {t(`dia.ecosystem.category.${integration.category}`)}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-900">
                    {formatTVL(integration.tvl)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${depthBadge.color}`}>
                    {t(depthBadge.label)}
                  </span>
                </div>

                <div className="text-xs text-gray-600 mb-3">
                  <span className="font-medium">{t('dia.ecosystem.dataFeeds')}:</span>{' '}
                  {integration.dataFeedsUsed.length}
                </div>

                <a
                  href={integration.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                >
                  {t('dia.ecosystem.visitWebsite')}
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </DashboardCard>
            );
          })}
        </div>

        {filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('dia.ecosystem.noProtocols')}</p>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
