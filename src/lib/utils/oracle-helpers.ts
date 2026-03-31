import { Blockchain } from '@/types/oracle';

export function formatTVL(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

export function getChainLabel(chain: Blockchain): string {
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
}

export function getChainBadgeColor(chain: Blockchain): string {
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
}

export function formatPriceChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function getPriceChangeColor(change: number): string {
  if (change > 0) return 'text-emerald-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
}
