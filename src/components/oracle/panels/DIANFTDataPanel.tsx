'use client';

import { NFTData } from '@/lib/oracles/dia';
import { useTranslations } from 'next-intl';
import { Blockchain } from '@/types/oracle';
import { DashboardCard } from '@/components/oracle';

interface DIANFTDataPanelProps {
  nftData: NFTData | undefined;
}

export function DIANFTDataPanel({ nftData }: DIANFTDataPanelProps) {
  const t = useTranslations();

  const getChainBadgeColor = (chain: Blockchain) => {
    switch (chain) {
      case Blockchain.ETHEREUM:
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case Blockchain.POLYGON:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case Blockchain.ARBITRUM:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case Blockchain.BASE:
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case Blockchain.OPTIMISM:
        return 'bg-red-100 text-red-700 border-red-200';
      case Blockchain.AVALANCHE:
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case Blockchain.BNB_CHAIN:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case Blockchain.SOLANA:
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getChainLabel = (chain: Blockchain) => {
    switch (chain) {
      case Blockchain.ETHEREUM:
        return 'Ethereum';
      case Blockchain.POLYGON:
        return 'Polygon';
      case Blockchain.ARBITRUM:
        return 'Arbitrum';
      case Blockchain.BASE:
        return 'Base';
      case Blockchain.OPTIMISM:
        return 'Optimism';
      case Blockchain.AVALANCHE:
        return 'Avalanche';
      case Blockchain.BNB_CHAIN:
        return 'BNB Chain';
      case Blockchain.SOLANA:
        return 'Solana';
      default:
        return chain;
    }
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriceChangeBg = (change: number) => {
    if (change > 0) return 'bg-green-50';
    if (change < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  const formatPriceChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return 'text-green-600';
    if (confidence >= 0.9) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.95) return 'bg-green-100';
    if (confidence >= 0.9) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  if (!nftData) {
    return (
      <DashboardCard className="p-6">
        <div className="text-center text-gray-500 py-8">{t('dia.nftData.noData')}</div>
      </DashboardCard>
    );
  }

  const { collections, totalCollections, byChain, trending } = nftData;

  // Calculate chain distribution
  const chainDistribution = Object.entries(byChain || {}).filter(([_, count]) => count > 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <DashboardCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dia.nftData.title')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard className="p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.nftData.totalCollections')}</p>
            <p className="text-2xl font-bold text-indigo-600">{totalCollections}</p>
          </DashboardCard>
          <DashboardCard className="p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.nftData.trendingCount')}</p>
            <p className="text-2xl font-bold text-green-600">{trending?.length || 0}</p>
          </DashboardCard>
          <DashboardCard className="p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.nftData.chainsSupported')}</p>
            <p className="text-2xl font-bold text-purple-600">{chainDistribution.length}</p>
          </DashboardCard>
          <DashboardCard className="p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.nftData.avgConfidence')}</p>
            <p className="text-2xl font-bold text-indigo-600">
              {collections.length > 0
                ? `${((collections.reduce((acc, c) => acc + c.confidence, 0) / collections.length) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </DashboardCard>
        </div>

        {/* Chain Distribution */}
        {chainDistribution.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('dia.nftData.byChain')}</h4>
            <div className="flex flex-wrap gap-2">
              {chainDistribution.map(([chain, count]) => (
                <span
                  key={chain}
                  className={`px-3 py-1 rounded-full text-sm border ${getChainBadgeColor(chain as Blockchain)}`}
                >
                  {getChainLabel(chain as Blockchain)}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </DashboardCard>

      {/* Trending Collections */}
      {trending && trending.length > 0 && (
        <DashboardCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dia.nftData.trendingTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trending.map((collection) => (
              <DashboardCard key={collection.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{collection.name}</h4>
                    <p className="text-sm text-gray-500">{collection.symbol}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs border ${getChainBadgeColor(collection.chain)}`}
                  >
                    {getChainLabel(collection.chain)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('dia.nftData.floorPrice')}</span>
                    <span className="font-semibold text-gray-900">{collection.floorPrice} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('dia.nftData.change24h')}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-medium ${getPriceChangeBg(collection.floorPriceChange24h)} ${getPriceChangeColor(collection.floorPriceChange24h)}`}
                    >
                      {formatPriceChange(collection.floorPriceChange24h)}
                    </span>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* All Collections */}
      <DashboardCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dia.nftData.allCollections')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <DashboardCard key={collection.id} className="p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-900 truncate">{collection.name}</h4>
                  <p className="text-sm text-gray-500">{collection.symbol}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs border flex-shrink-0 ml-2 ${getChainBadgeColor(collection.chain)}`}
                >
                  {getChainLabel(collection.chain)}
                </span>
              </div>

              {/* Floor Price */}
              <div className="mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{collection.floorPrice}</span>
                  <span className="text-sm text-gray-500">ETH</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-sm font-medium ${getPriceChangeColor(collection.floorPriceChange24h)}`}
                  >
                    {formatPriceChange(collection.floorPriceChange24h)}
                  </span>
                  <span className="text-xs text-gray-400">{t('dia.nftData.24h')}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500 mb-1">{t('dia.nftData.volume24h')}</p>
                  <p className="font-semibold text-gray-900">
                    {collection.volume24h.toLocaleString()} ETH
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500 mb-1">{t('dia.nftData.totalSupply')}</p>
                  <p className="font-semibold text-gray-900">
                    {collection.totalSupply.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{t('dia.nftData.confidence')}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBg(collection.confidence)} ${getConfidenceColor(collection.confidence)}`}
                >
                  {(collection.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Update Frequency */}
              <div className="mt-2 text-xs text-gray-400">
                {t('dia.nftData.updateFrequency')}: {collection.updateFrequency}s
              </div>
            </DashboardCard>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
