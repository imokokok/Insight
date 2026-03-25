'use client';

import { useTranslations } from '@/i18n';
import { useDIANFTData } from '@/hooks';
import { Blockchain } from '@/types/oracle';
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
      <div className="p-6">
        <div className="text-center text-gray-500 py-8">{t('nft.noData')}</div>
      </div>
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

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('nft.totalCollections')}</p>
            <p className="text-xl font-semibold text-gray-900">{totalCollections}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('nft.trendingCount')}</p>
            <p className="text-xl font-semibold text-emerald-600">{trending?.length || 0}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('nft.avgFloorPrice')}</p>
            <p className="text-xl font-semibold text-gray-900">{avgFloorPrice.toFixed(2)} ETH</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('nft.chainsSupported')}</p>
            <p className="text-xl font-semibold text-gray-900">{chainDistribution.length}</p>
          </div>
        </div>
      </div>

      {/* NFT Collections Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('nft.collections')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nft.name')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nft.floorPrice')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nft.change24h')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nft.volume24h')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nft.chain')}
                </th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr
                  key={collection.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{collection.name}</p>
                    <p className="text-sm text-gray-500">{collection.symbol}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {collection.floorPrice} ETH
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getPriceChangeBg(
                        collection.floorPriceChange24h
                      )} ${getPriceChangeColor(collection.floorPriceChange24h)}`}
                    >
                      {formatPriceChange(collection.floorPriceChange24h)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {collection.volume24h.toLocaleString()} ETH
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs border ${getChainBadgeColor(
                        collection.chain
                      )}`}
                    >
                      {getChainLabel(collection.chain)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {collections.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('nft.noCollections')}</div>
        )}
      </div>

      {/* Distribution by Chain */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('nft.byChain')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {chainDistribution.map(([chain, count]) => (
            <div key={chain} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{getChainLabel(chain as Blockchain)}</span>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
        {chainDistribution.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('nft.noChainData')}</div>
        )}
      </div>
    </div>
  );
}
