/** Pyth Core feeds currently sponsored on HyperEVM mainnet. */
export const PYTH_HYPEREVM_CHAIN_ID = 999;
export const PYTH_HYPEREVM_CORE_ADDRESS = '0xe9d69CdD6Fe41e7B621B4A688C5D1a68cB5c8ADc' as const;

export interface PythHyperEvmFeed {
  alias: 'KHYPE/HYPE.RR' | 'KHYPE/USD' | 'USDT0/USD';
  timeDifferenceSeconds: 3600;
  priceDeviationPercent: 2;
  quoteType: 'price' | 'reference-rate';
}

export const PYTH_HYPEREVM_SPONSORED_FEEDS: readonly PythHyperEvmFeed[] = [
  {
    alias: 'KHYPE/HYPE.RR',
    timeDifferenceSeconds: 3600,
    priceDeviationPercent: 2,
    quoteType: 'reference-rate',
  },
  {
    alias: 'KHYPE/USD',
    timeDifferenceSeconds: 3600,
    priceDeviationPercent: 2,
    quoteType: 'price',
  },
  {
    alias: 'USDT0/USD',
    timeDifferenceSeconds: 3600,
    priceDeviationPercent: 2,
    quoteType: 'price',
  },
] as const;

export function resolvePythHyperEvmFeed(symbol: string): PythHyperEvmFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return (
    PYTH_HYPEREVM_SPONSORED_FEEDS.find((feed) => feed.alias === normalized) ??
    PYTH_HYPEREVM_SPONSORED_FEEDS.find((feed) => feed.alias === `${normalized}/USD`) ??
    null
  );
}
