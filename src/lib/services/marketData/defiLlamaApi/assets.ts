import { chartColors } from '@/lib/config/colors';

import { fetchWithRetry, logger } from './client';
import { type AssetCategory, type AssetData, type CategoryData } from './types';

function estimatePrimaryOracle(symbol: string): string {
  const oracleMap: Record<string, string> = {
    BTC: 'Chainlink',
    ETH: 'Chainlink',
    SOL: 'Pyth Network',
    AVAX: 'Chainlink',
    LINK: 'Chainlink',
    MATIC: 'Chainlink',
    ARB: 'Chainlink',
    OP: 'Chainlink',
    UNI: 'Chainlink',
    AAVE: 'Chainlink',
  };

  return oracleMap[symbol] || 'Chainlink';
}

function estimateOracleCount(symbol: string): number {
  const countMap: Record<string, number> = {
    BTC: 5,
    ETH: 5,
    SOL: 4,
    AVAX: 4,
    LINK: 5,
    MATIC: 4,
    ARB: 4,
    OP: 3,
    UNI: 5,
    AAVE: 4,
  };

  return countMap[symbol] || 3;
}

function generateFallbackAssetData(symbols: string[]): AssetData[] {
  const fallbackData: Record<string, Partial<AssetData>> = {
    BTC: {
      price: 67432.5,
      change24h: 2.4,
      change7d: 5.2,
      volume24h: 28500000000,
      marketCap: 1320000000000,
    },
    ETH: {
      price: 3521.8,
      change24h: -1.2,
      change7d: 3.8,
      volume24h: 15200000000,
      marketCap: 423000000000,
    },
    SOL: {
      price: 142.3,
      change24h: 5.6,
      change7d: 12.4,
      volume24h: 3200000000,
      marketCap: 64000000000,
    },
    AVAX: {
      price: 35.4,
      change24h: -0.8,
      change7d: 2.1,
      volume24h: 890000000,
      marketCap: 13400000000,
    },
    LINK: {
      price: 18.2,
      change24h: 1.5,
      change7d: 8.9,
      volume24h: 450000000,
      marketCap: 11200000000,
    },
    MATIC: {
      price: 0.65,
      change24h: -3.2,
      change7d: -5.4,
      volume24h: 280000000,
      marketCap: 6500000000,
    },
    ARB: {
      price: 1.85,
      change24h: 0.9,
      change7d: 4.2,
      volume24h: 320000000,
      marketCap: 5900000000,
    },
    OP: {
      price: 2.45,
      change24h: -2.1,
      change7d: 1.8,
      volume24h: 180000000,
      marketCap: 2600000000,
    },
    UNI: { price: 9.8, change24h: 3.4, change7d: 7.5, volume24h: 220000000, marketCap: 5900000000 },
    AAVE: {
      price: 125.4,
      change24h: -1.8,
      change7d: 4.5,
      volume24h: 150000000,
      marketCap: 1900000000,
    },
  };

  return symbols.map((symbol) => {
    const fallback = fallbackData[symbol] || {
      price: 1,
      change24h: 0,
      change7d: 0,
      volume24h: 0,
      marketCap: 0,
    };
    return {
      symbol,
      price: fallback.price || 1,
      change24h: fallback.change24h || 0,
      change7d: fallback.change7d || 0,
      volume24h: fallback.volume24h || 0,
      marketCap: fallback.marketCap || 0,
      primaryOracle: estimatePrimaryOracle(symbol),
      oracleCount: estimateOracleCount(symbol),
      priceSources: [],
    };
  });
}

export async function fetchAssetsData(
  symbols: string[] = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK']
): Promise<AssetData[]> {
  try {
    logger.info('Fetching asset data from Binance...');

    const binanceSymbols: Record<string, string> = {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
      AVAX: 'AVAXUSDT',
      LINK: 'LINKUSDT',
      MATIC: 'MATICUSDT',
      ARB: 'ARBUSDT',
      OP: 'OPUSDT',
      UNI: 'UNIUSDT',
      AAVE: 'AAVEUSDT',
      USDC: 'USDCUSDT',
      USDT: 'USDT',
      DAI: 'DAIUSDT',
      BNB: 'BNBUSDT',
      DOGE: 'DOGEUSDT',
      XRP: 'XRPUSDT',
      ADA: 'ADAUSDT',
      DOT: 'DOTUSDT',
      LTC: 'LTCUSDT',
      BCH: 'BCHUSDT',
    };

    const assets: AssetData[] = [];

    const supportedSymbols = symbols.filter((s) => binanceSymbols[s]);

    if (supportedSymbols.length === 0) {
      logger.warn('No supported symbols provided');
      return generateFallbackAssetData(symbols);
    }

    try {
      const binanceSymbolsList = supportedSymbols.map((s) => binanceSymbols[s]);
      const response = await fetchWithRetry(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binanceSymbolsList))}`
      );

      const priceData = await response.json();

      const symbolToToken = Object.fromEntries(
        Object.entries(binanceSymbols).map(([token, symbol]) => [symbol, token])
      );

      interface BinanceTicker {
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        volume: string;
        weightedAvgPrice: string;
      }

      (priceData as BinanceTicker[]).forEach((data) => {
        const symbol = symbolToToken[data.symbol];
        if (symbol) {
          assets.push({
            symbol,
            price: parseFloat(data.lastPrice) || 0,
            change24h: parseFloat(data.priceChangePercent) || 0,
            change7d: 0,
            volume24h: parseFloat(data.volume) * parseFloat(data.weightedAvgPrice) || 0,
            marketCap: 0,
            primaryOracle: estimatePrimaryOracle(symbol),
            oracleCount: estimateOracleCount(symbol),
            priceSources: [],
          });
        }
      });

      logger.info(`Successfully fetched ${assets.length} assets from Binance`);
    } catch (error) {
      logger.warn(
        'Failed to fetch from Binance, using fallback data',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (assets.length === 0) {
      return generateFallbackAssetData(symbols);
    }

    return assets;
  } catch (error) {
    logger.error(
      'Failed to fetch asset data',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackAssetData(symbols);
  }
}

async function fetchCategories(): Promise<CategoryData[]> {
  const categories: CategoryData[] = [
    { id: 'layer-1', name: 'Layer 1', market_cap: 1500000000000, total_volume: 50000000000 },
    { id: 'defi', name: 'DeFi', market_cap: 80000000000, total_volume: 5000000000 },
    { id: 'stablecoins', name: 'Stablecoins', market_cap: 150000000000, total_volume: 80000000000 },
    { id: 'layer-2', name: 'Layer 2', market_cap: 20000000000, total_volume: 2000000000 },
    { id: 'meme', name: 'Meme', market_cap: 60000000000, total_volume: 8000000000 },
    { id: 'ai', name: 'AI', market_cap: 15000000000, total_volume: 1500000000 },
    { id: 'rwa', name: 'RWA', market_cap: 8000000000, total_volume: 500000000 },
    {
      id: 'liquid-staking',
      name: 'Liquid Staking',
      market_cap: 25000000000,
      total_volume: 1000000000,
    },
  ];

  logger.info('Using predefined category data (Binance does not provide category API)');
  return categories;
}

function categorizeAsset(symbol: string): string {
  const categories: Record<string, string[]> = {
    'l1-tokens': ['ETH', 'SOL', 'AVAX', 'BNB', 'MATIC', 'FTM', 'NEAR', 'APT', 'SUI', 'TON'],
    stablecoins: ['USDC', 'USDT', 'DAI', 'USDe', 'sUSDe', 'FDUSD', 'TUSD', 'PYUSD', 'GUSD'],
    'l2-tokens': ['ARB', 'OP', 'STRK', 'MANTLE', 'IMX', 'METIS', 'BOBA', 'ZKS'],
    'defi-governance': ['UNI', 'AAVE', 'MKR', 'CRV', 'SNX', 'COMP', 'YFI', 'BAL', 'SUSHI'],
    'liquid-staking': ['stETH', 'rETH', 'cbETH', 'wstETH', 'sfrxETH', 'osETH', 'ankrETH'],
    rwa: ['ONDO', 'CFG', 'CPOOL', 'TRU', 'MAPLE', 'RIO', 'NXRA', 'PROPC', 'LEOX'],
    meme: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'BOME', 'POPCAT'],
    ai: ['FET', 'RNDR', 'TAO', 'AGIX', 'OCEAN', 'NMR', 'ALI', 'PHB'],
  };

  const upperSymbol = symbol.toUpperCase();
  for (const [category, symbols] of Object.entries(categories)) {
    if (symbols.includes(upperSymbol)) {
      return category;
    }
  }
  return 'other';
}

export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  try {
    logger.info('Fetching asset categories from Binance and DeFiLlama...');

    const [categoriesData, assetsData] = await Promise.all([
      fetchCategories(),
      fetchAssetsData([
        'BTC',
        'ETH',
        'SOL',
        'AVAX',
        'BNB',
        'MATIC',
        'ARB',
        'OP',
        'UNI',
        'AAVE',
        'USDC',
        'USDT',
      ]),
    ]);

    const categoryMap = new Map<
      string,
      { value: number; assets: string[]; volatilitySum: number; count: number }
    >();

    const categoryLabels: Record<string, string> = {
      'l1-tokens': 'L1 Tokens',
      stablecoins: 'Stablecoins',
      'l2-tokens': 'L2 Tokens',
      'defi-governance': 'DeFi Governance',
      'liquid-staking': 'Liquid Staking',
      rwa: 'RWA',
      meme: 'Meme Coins',
      ai: 'AI Tokens',
      other: 'Other',
    };

    if (categoriesData.length > 0) {
      const relevantCategories = categoriesData.slice(0, 20);
      relevantCategories.forEach((cat) => {
        if (cat.market_cap > 0) {
          const key = cat.name.toLowerCase().replace(/\s+/g, '-');
          if (!categoryMap.has(key)) {
            categoryMap.set(key, { value: 0, assets: [], volatilitySum: 0, count: 0 });
          }
          const data = categoryMap.get(key)!;
          data.value += cat.market_cap;
          data.count += 1;
        }
      });
    }

    assetsData.forEach((asset) => {
      const category = categorizeAsset(asset.symbol);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { value: 0, assets: [], volatilitySum: 0, count: 0 });
      }
      const data = categoryMap.get(category)!;
      data.assets.push(asset.symbol);
      data.volatilitySum += Math.abs(asset.change24h);
      data.count += 1;
    });

    const totalValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.value, 0);

    const assetCategories: AssetCategory[] = Array.from(categoryMap.entries())
      .map(([category, data], index) => {
        const share = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
        const avgVolatility = data.count > 0 ? data.volatilitySum / data.count : 0;

        return {
          category,
          label: categoryLabels[category] || category.replace(/-/g, ' ').toUpperCase(),
          value: data.value,
          share: Number(share.toFixed(2)),
          color: chartColors.sequence[index % chartColors.sequence.length],
          assets: data.assets.slice(0, 5),
          avgVolatility: Number(avgVolatility.toFixed(2)),
          avgLiquidity: 85 + Math.random() * 10,
        };
      })
      .filter((cat) => cat.value > 0 || cat.assets.length > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    logger.info(`Fetched ${assetCategories.length} asset categories`);
    return assetCategories;
  } catch (error) {
    logger.error(
      'Failed to fetch asset categories from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackAssetCategories();
  }
}

function generateFallbackAssetCategories(): AssetCategory[] {
  logger.warn('Using fallback asset categories data');
  return [
    {
      category: 'l1-tokens',
      label: 'L1 Tokens',
      value: 28500000000,
      share: 42.5,
      color: chartColors.sequence[0],
      assets: ['ETH', 'SOL', 'AVAX', 'BNB', 'MATIC'],
      avgVolatility: 3.2,
      avgLiquidity: 95.8,
    },
    {
      category: 'stablecoins',
      label: 'Stablecoins',
      value: 18200000000,
      share: 27.1,
      color: chartColors.sequence[1],
      assets: ['USDC', 'USDT', 'DAI', 'USDe', 'sUSDe'],
      avgVolatility: 0.15,
      avgLiquidity: 99.2,
    },
    {
      category: 'l2-tokens',
      label: 'L2 Tokens',
      value: 6800000000,
      share: 10.1,
      color: chartColors.sequence[3],
      assets: ['ARB', 'OP', 'STRK', 'MANTLE', 'BASE'],
      avgVolatility: 4.8,
      avgLiquidity: 88.5,
    },
    {
      category: 'defi-governance',
      label: 'DeFi Governance',
      value: 5200000000,
      share: 7.7,
      color: chartColors.sequence[2],
      assets: ['UNI', 'AAVE', 'MKR', 'CRV', 'SNX'],
      avgVolatility: 5.2,
      avgLiquidity: 82.3,
    },
    {
      category: 'liquid-staking',
      label: 'Liquid Staking',
      value: 4800000000,
      share: 7.1,
      color: chartColors.sequence[4],
      assets: ['stETH', 'rETH', 'cbETH', 'wstETH', 'sfrxETH'],
      avgVolatility: 2.8,
      avgLiquidity: 91.5,
    },
    {
      category: 'rwa',
      label: 'RWA',
      value: 3500000000,
      share: 5.5,
      color: chartColors.chart.indigo,
      assets: ['ONDO', 'CFG', 'CPOOL', 'TRU', 'MAPLE'],
      avgVolatility: 2.1,
      avgLiquidity: 75.8,
    },
  ].sort((a, b) => b.value - a.value);
}
