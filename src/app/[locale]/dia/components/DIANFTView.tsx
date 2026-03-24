'use client';

import { useTranslations } from 'next-intl';
import { useDIANFTData } from '@/hooks/useDIAData';
import { Blockchain } from '@/types/oracle';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { LoadingState } from '@/components/oracle/common/LoadingState';
import { ErrorFallback } from '@/components/oracle/common/ErrorFallback';
import { Layers, TrendingUp, DollarSign, Link2 } from 'lucide-react';

export function DIANFTView() {
  const t = useTranslations('dia');
  const { nftData, isLoading, error, refetch } = useDIANFTData();

  if (isLoading) {
    return <LoadingState message={t('nft.loading')} />;
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={refetch} />;
  }

  if (!nftData) {
    return (
      <DashboardCard className="p-6">
        <div className="text-center text-gray-500 py-8">{t('nft.noData')}</div>
      </DashboardCard>
    );
  }

  const { collections, totalCollections, byChain, trending } = nftData;

  // Calculate statistics
  const chainDistribution = Object.entries(byChain || {}).filter(([_, count]) => count > 0);
  const avgFloorPrice = collections.length > 0
    ? collections.reduce((acc, c) => acc + c.floorPrice, 0) / collections.length
    : 0;

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
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriceChangeBg = (change: number) => {
    if (change > 0) return 'bg-emerald-50';
    if (change < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  const formatPriceChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const stats = [
    {
      label: t('nft.totalCollections'),
      value: totalCollections.toString(),
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: t('nft.trendingCount'),
      value: trending?.length?.toString() || '0',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: t('nft.avgFloorPrice'),
      value: `${avgFloorPrice.toFixed(2)} ETH`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: t('nft.chainsSupported'),
      value: chainDistribution.length.toString(),
      icon: Link2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <DashboardCard key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>

      {/* NFT Collections List */}
      <DashboardCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('nft.collections')}
        </h3>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-t-lg text-sm font-medium text-gray-600">
          <div className="col-span-4">{t('nft.name')}</div>
          <div className="col-span-2 text-right">{t('nft.floorPrice')}</div>
          <div className="col-span-2 text-right">{t('nft.change24h')}</div>
          <div className="col-span-2 text-right">{t('nft.volume24h')}</div>
          <div className="col-span-2 text-center">{t('nft.chain')}</div>
        </div>

        {/* Collection Items */}
        <div className="divide-y divide-gray-100">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="grid grid-cols-2 md:grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors"
            >
              {/* Name */}
              <div className="col-span-2 md:col-span-4">
                <p className="font-semibold text-gray-900 truncate">{collection.name}</p>
                <p className="text-sm text-gray-500">{collection.symbol}</p>
              </div>

              {/* Floor Price */}
              <div className="col-span-1 md:col-span-2 text-right">
                <p className="font-semibold text-gray-900">{collection.floorPrice} ETH</p>
              </div>

              {/* 24h Change */}
              <div className="col-span-1 md:col-span-2 text-right">
                <span
                  className={`inline-flex px-2 py-1 rounded text-sm font-medium ${getPriceChangeBg(
                    collection.floorPriceChange24h
                  )} ${getPriceChangeColor(collection.floorPriceChange24h)}`}
                >
                  {formatPriceChange(collection.floorPriceChange24h)}
                </span>
              </div>

              {/* Volume */}
              <div className="col-span-1 md:col-span-2 text-right">
                <p className="text-gray-900">{collection.volume24h.toLocaleString()} ETH</p>
              </div>

              {/* Chain */}
              <div className="col-span-1 md:col-span-2 text-center">
                <span
                  className={`inline-flex px-2 py-1 rounded text-xs border ${getChainBadgeColor(
                    collection.chain
                  )}`}
                >
                  {getChainLabel(collection.chain)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {collections.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('nft.noCollections')}</div>
        )}
      </DashboardCard>

      {/* Distribution by Chain */}
      <DashboardCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('nft.byChain')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {chainDistribution.map(([chain, count]) => (
            <div
              key={chain}
              className={`p-4 rounded-lg border ${getChainBadgeColor(chain as Blockchain)}`}
            >
              <p className="text-sm font-medium">{getChainLabel(chain as Blockchain)}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
              <p className="text-xs opacity-75 mt-1">{t('nft.collections')}</p>
            </div>
          ))}
        </div>

        {chainDistribution.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('nft.noChainData')}</div>
        )}
      </DashboardCard>
    </div>
  );
}
