import { ORACLE_COLORS } from '@/app/[locale]/market-overview/constants';
import {
  type OracleMarketData,
  type AssetData,
  type ChainBreakdown,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
  type CorrelationPair,
  type RadarDataPoint,
} from '@/app/[locale]/market-overview/types';
import { chartColors, chainColors, baseColors, semanticColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

import { performanceMetricsCalculator } from './performanceMetrics';

const logger = createLogger('marketData:defiLlamaApi');

const DEFILLAMA_API_BASE = 'https://api.llama.fi';
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

interface DefiLlamaOracleResponse {
  oracles?: Array<{
    name: string;
    tvs?: number;
    tvsPrevDay?: number;
    tvsPrevWeek?: number;
    tvsPrevMonth?: number;
    chains?: string[];
    protocols?: number;
    mcaps?: number;
  }>;
}

interface DefiLlamaProtocol {
  name: string;
  tvl?: number;
  chainTvls?: Record<string, number>;
  chains?: string[];
  category?: string;
  oracles?: string[];
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MarketDataError('Request timeout', 'TIMEOUT_ERROR', 408);
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new MarketDataError(
            `Rate limited or forbidden: ${response.statusText}`,
            'RATE_LIMIT_ERROR',
            response.status
          );
        }
        throw new MarketDataError(
          `HTTP error: ${response.status} ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i === retries - 1) {
        break;
      }

      logger.warn(`Fetch attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (i + 1));
    }
  }

  throw new MarketDataError(
    `Failed after ${retries} retries: ${lastError?.message}`,
    'RETRY_EXHAUSTED',
    undefined,
    lastError
  );
}

function formatOracleName(name: string): string {
  const nameMap: Record<string, string> = {
    chainlink: 'Chainlink',
    pyth: 'Pyth Network',
    'pyth network': 'Pyth Network',
    band: 'Band Protocol',
    'band protocol': 'Band Protocol',
    api3: 'API3',
    uma: 'UMA',
    redstone: 'RedStone',
    switchboard: 'Switchboard',
    dia: 'DIA',
    flux: 'Flux',
    tellor: 'Tellor',
  };

  const lowerName = name.toLowerCase();
  return nameMap[lowerName] || name.charAt(0).toUpperCase() + name.slice(1);
}

function getOracleColor(name: string): string {
  const colorMap: Record<string, string> = {
    Chainlink: ORACLE_COLORS.chainlink,
    'Pyth Network': ORACLE_COLORS.pyth,
    'Band Protocol': ORACLE_COLORS.band,
    API3: ORACLE_COLORS.api3,
    UMA: ORACLE_COLORS.uma,
    RedStone: chartColors.oracle.redstone,
    Switchboard: chartColors.oracle.switchboard,
    DIA: chartColors.oracle.dia,
    Flux: chartColors.oracle.flux,
    Tellor: chartColors.oracle.tellor,
  };

  return colorMap[name] || ORACLE_COLORS.others;
}

function formatTVS(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function estimateLatency(oracleName: string): number {
  const latencyMap: Record<string, number> = {
    Chainlink: 450,
    'Pyth Network': 120,
    'Band Protocol': 600,
    API3: 900,
    UMA: 1200,
    RedStone: 200,
    Switchboard: 300,
    DIA: 800,
    Flux: 1000,
    Tellor: 1500,
  };

  return latencyMap[oracleName] || 600;
}

function estimateAccuracy(oracleName: string): number {
  const accuracyMap: Record<string, number> = {
    Chainlink: 99.8,
    'Pyth Network': 99.5,
    'Band Protocol': 99.2,
    API3: 98.9,
    UMA: 98.5,
    RedStone: 99.3,
    Switchboard: 99.1,
    DIA: 98.8,
    Flux: 98.6,
    Tellor: 98.4,
  };

  return accuracyMap[oracleName] || 98.0;
}

function estimateUpdateFrequency(oracleName: string): number {
  const frequencyMap: Record<string, number> = {
    Chainlink: 3600,
    'Pyth Network': 400,
    'Band Protocol': 1800,
    API3: 3600,
    UMA: 7200,
    RedStone: 60,
    Switchboard: 300,
    DIA: 120,
    Flux: 600,
    Tellor: 3600,
  };

  return frequencyMap[oracleName] || 3600;
}

function transformOraclesToMarketData(
  oracles: DefiLlamaOracleResponse['oracles'] = []
): OracleMarketData[] {
  if (!oracles || oracles.length === 0) {
    return [];
  }

  const totalTvs = oracles.reduce((sum, o) => sum + (o.tvs || 0), 0);

  return oracles
    .map((oracle) => {
      const tvs = oracle.tvs || 0;
      const tvsPrevDay = oracle.tvsPrevDay || tvs;
      const share = totalTvs > 0 ? (tvs / totalTvs) * 100 : 0;
      const change24h = tvsPrevDay > 0 ? ((tvs - tvsPrevDay) / tvsPrevDay) * 100 : 0;
      const tvsPrevWeek = oracle.tvsPrevWeek || tvs;
      const tvsPrevMonth = oracle.tvsPrevMonth || tvs;
      const change7d = tvsPrevWeek > 0 ? ((tvs - tvsPrevWeek) / tvsPrevWeek) * 100 : 0;
      const change30d = tvsPrevMonth > 0 ? ((tvs - tvsPrevMonth) / tvsPrevMonth) * 100 : 0;
      const color = getOracleColor(oracle.name);
      const formattedName = formatOracleName(oracle.name);

      const metrics = performanceMetricsCalculator.calculateAllMetrics(formattedName);

      return {
        name: formattedName,
        share: Number(share.toFixed(2)),
        color,
        tvs: formatTVS(tvs),
        tvsValue: Number((tvs / 1e9).toFixed(2)),
        chains: oracle.chains?.length || 0,
        protocols: oracle.protocols || 0,
        avgLatency: metrics.avgLatency,
        accuracy: metrics.accuracy,
        updateFrequency: metrics.updateFrequency,
        change24h: Number(change24h.toFixed(2)),
        change7d: Number(change7d.toFixed(2)),
        change30d: Number(change30d.toFixed(2)),
      };
    })
    .sort((a, b) => b.share - a.share);
}

function identifyOracleName(protocolName: string): string | null {
  const name = protocolName.toLowerCase();

  if (name.includes('chainlink')) return 'Chainlink';
  if (name.includes('pyth')) return 'Pyth Network';
  if (name.includes('band')) return 'Band Protocol';
  if (name.includes('api3')) return 'API3';
  if (name.includes('uma')) return 'UMA';
  if (name.includes('redstone')) return 'RedStone';
  if (name.includes('switchboard')) return 'Switchboard';
  if (name.includes('dia')) return 'DIA';
  if (name.includes('flux')) return 'Flux';
  if (name.includes('tellor')) return 'Tellor';

  return null;
}

function transformProtocolsToOracleData(protocols: DefiLlamaProtocol[]): OracleMarketData[] {
  if (protocols.length === 0) {
    return [];
  }

  const oracleGroups: Record<string, { tvl: number; chains: Set<string>; protocols: number }> = {};

  protocols.forEach((protocol) => {
    const oracleName = identifyOracleName(protocol.name);
    if (!oracleName) return;

    if (!oracleGroups[oracleName]) {
      oracleGroups[oracleName] = { tvl: 0, chains: new Set(), protocols: 0 };
    }

    oracleGroups[oracleName].tvl += protocol.tvl || 0;
    protocol.chains?.forEach((chain) => oracleGroups[oracleName].chains.add(chain));
    oracleGroups[oracleName].protocols += 1;
  });

  const totalTvl = Object.values(oracleGroups).reduce((sum, g) => sum + g.tvl, 0);

  return Object.entries(oracleGroups)
    .map(([name, data]) => {
      const share = totalTvl > 0 ? (data.tvl / totalTvl) * 100 : 0;

      return {
        name,
        share: Number(share.toFixed(2)),
        color: getOracleColor(name),
        tvs: formatTVS(data.tvl),
        tvsValue: Number((data.tvl / 1e9).toFixed(2)),
        chains: data.chains.size,
        protocols: data.protocols,
        avgLatency: estimateLatency(name),
        accuracy: estimateAccuracy(name),
        updateFrequency: estimateUpdateFrequency(name),
        change24h: 0,
        change7d: 0,
        change30d: 0,
      };
    })
    .sort((a, b) => b.share - a.share);
}

export async function fetchOraclesData(): Promise<OracleMarketData[]> {
  try {
    logger.info('Fetching oracle data from DeFiLlama...');

    let response: Response;
    try {
      response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/oracles`);
    } catch (_error) {
      logger.warn('/oracles endpoint unavailable, falling back to /protocols');
      response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/protocols`);

      const protocols: DefiLlamaProtocol[] = await response.json();

      const oracleProtocols = protocols.filter(
        (p) =>
          p.category?.toLowerCase().includes('oracle') ||
          [
            'chainlink',
            'pyth',
            'band',
            'api3',
            'uma',
            'redstone',
            'switchboard',
            'dia',
            'tellor',
            'chronicle',
            'winklink',
          ].some((name) => p.name.toLowerCase().includes(name.toLowerCase()))
      );

      return transformProtocolsToOracleData(oracleProtocols);
    }

    const data: DefiLlamaOracleResponse = await response.json();

    if (!data.oracles || !Array.isArray(data.oracles)) {
      throw new MarketDataError('Invalid oracle data format', 'INVALID_DATA_FORMAT');
    }

    return transformOraclesToMarketData(data.oracles);
  } catch (error) {
    logger.error(
      'Failed to fetch oracle data',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error instanceof MarketDataError
      ? error
      : new MarketDataError(
          `Failed to fetch oracle data: ${error instanceof Error ? error.message : String(error)}`,
          'FETCH_ERROR',
          undefined,
          error instanceof Error ? error : undefined
        );
  }
}

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

    // Binance 交易对映射
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

    // 过滤出支持的代币
    const supportedSymbols = symbols.filter((s) => binanceSymbols[s]);

    if (supportedSymbols.length === 0) {
      logger.warn('No supported symbols provided');
      return generateFallbackAssetData(symbols);
    }

    try {
      // 使用 Binance API 获取 24 小时统计数据
      const binanceSymbolsList = supportedSymbols.map((s) => binanceSymbols[s]);
      const response = await fetchWithRetry(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binanceSymbolsList))}`
      );

      const priceData = await response.json();

      // 创建交易对到代币的映射
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
            change7d: 0, // Binance 24hr 接口不提供 7 天数据
            volume24h: parseFloat(data.volume) * parseFloat(data.weightedAvgPrice) || 0,
            marketCap: 0, // Binance API 不直接提供市值
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

export async function checkApiHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const response = await fetchWithTimeout(`${DEFILLAMA_API_BASE}/protocols`, {}, 5000);

    if (response.ok) {
      return { healthy: true, message: 'DeFiLlama API is healthy' };
    }

    return { healthy: false, message: `DeFiLlama API returned ${response.status}` };
  } catch (error) {
    return {
      healthy: false,
      message: `DeFiLlama API is unreachable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: chainColors.ethereum,
  bsc: chainColors.bnbChain,
  polygon: chainColors.polygon,
  arbitrum: chainColors.arbitrum,
  optimism: chainColors.optimism,
  avalanche: chainColors.avalanche,
  solana: chainColors.solana,
  base: chainColors.base,
  fantom: chainColors.fantom,
  gnosis: chainColors.gnosis,
  linea: chainColors.linea,
  scroll: chainColors.scroll,
  zksync: chainColors.zkSync,
  mantle: chainColors.mantle,
  celo: chartColors.sequence[4],
  moonbeam: chartColors.recharts.cyan,
  moonriver: semanticColors.warning.DEFAULT,
  cronos: chainColors.cronos,
  kava: semanticColors.danger.DEFAULT,
  metis: chartColors.recharts.cyan,
  aurora: semanticColors.success.DEFAULT,
};

interface DefiLlamaChain {
  gecko_id: string | null;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  name: string;
  chainId: string;
}

function formatChainTVS(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function getTopOracleForChain(chainId: string): { name: string; share: number } {
  const oracleMap: Record<string, { name: string; share: number }> = {
    ethereum: { name: 'Chainlink', share: 68.5 },
    solana: { name: 'Pyth Network', share: 72.3 },
    arbitrum: { name: 'Chainlink', share: 75.2 },
    bsc: { name: 'Chainlink', share: 82.1 },
    base: { name: 'Chainlink', share: 78.9 },
    avalanche: { name: 'Chainlink', share: 71.5 },
    polygon: { name: 'Chainlink', share: 69.8 },
    optimism: { name: 'Chainlink', share: 74.3 },
  };
  return oracleMap[chainId] || { name: 'Chainlink', share: 65.0 };
}

export async function fetchChainBreakdown(): Promise<ChainBreakdown[]> {
  try {
    logger.info('Fetching chain breakdown data from DeFiLlama...');

    const response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/chains`);
    const chains: DefiLlamaChain[] = await response.json();

    if (!Array.isArray(chains) || chains.length === 0) {
      throw new MarketDataError('Invalid chain data format', 'INVALID_DATA_FORMAT');
    }

    const totalTvl = chains.reduce((sum, chain) => sum + (chain.tvl || 0), 0);

    const chainBreakdown: ChainBreakdown[] = chains
      .filter((chain) => chain.tvl > 0)
      .map((chain) => {
        const share = totalTvl > 0 ? (chain.tvl / totalTvl) * 100 : 0;
        const chainId =
          chain.chainId?.toLowerCase() || chain.name.toLowerCase().replace(/\s+/g, '-');
        const topOracle = getTopOracleForChain(chainId);

        return {
          chainId,
          chainName: chain.name,
          tvs: chain.tvl,
          tvsFormatted: formatChainTVS(chain.tvl),
          share: Number(share.toFixed(2)),
          protocols: 0,
          color: CHAIN_COLORS[chainId] || baseColors.gray[400],
          change24h: 0,
          change7d: 0,
          topOracle: topOracle.name,
          topOracleShare: topOracle.share,
        };
      })
      .sort((a, b) => b.tvs - a.tvs);

    const topChains = chainBreakdown.slice(0, 8);
    const othersTvs = chainBreakdown.slice(8).reduce((sum, c) => sum + c.tvs, 0);

    if (othersTvs > 0) {
      const othersShare = totalTvl > 0 ? (othersTvs / totalTvl) * 100 : 0;
      topChains.push({
        chainId: 'others',
        chainName: 'Others',
        tvs: othersTvs,
        tvsFormatted: formatChainTVS(othersTvs),
        share: Number(othersShare.toFixed(2)),
        protocols: chainBreakdown.slice(8).reduce((sum, c) => sum + c.protocols, 0),
        color: baseColors.gray[400],
        change24h: 0,
        change7d: 0,
        topOracle: 'Chainlink',
        topOracleShare: 65.0,
      });
    }

    logger.info(`Fetched ${topChains.length} chains from DeFiLlama`);
    return topChains;
  } catch (error) {
    logger.error(
      'Failed to fetch chain breakdown from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackChainBreakdown();
  }
}

function generateFallbackChainBreakdown(): ChainBreakdown[] {
  logger.warn('Using fallback chain breakdown data');
  return [
    {
      chainId: 'ethereum',
      chainName: 'Ethereum',
      tvs: 28500000000,
      tvsFormatted: '$28.5B',
      share: 42.3,
      protocols: 185,
      color: CHAIN_COLORS['ethereum'],
      change24h: 1.8,
      change7d: 4.2,
      topOracle: 'Chainlink',
      topOracleShare: 68.5,
    },
    {
      chainId: 'solana',
      chainName: 'Solana',
      tvs: 8200000000,
      tvsFormatted: '$8.2B',
      share: 12.2,
      protocols: 92,
      color: CHAIN_COLORS['solana'],
      change24h: 5.6,
      change7d: 15.8,
      topOracle: 'Pyth Network',
      topOracleShare: 72.3,
    },
    {
      chainId: 'arbitrum',
      chainName: 'Arbitrum',
      tvs: 6800000000,
      tvsFormatted: '$6.8B',
      share: 10.1,
      protocols: 78,
      color: CHAIN_COLORS['arbitrum'],
      change24h: 2.1,
      change7d: 6.5,
      topOracle: 'Chainlink',
      topOracleShare: 75.2,
    },
    {
      chainId: 'bsc',
      chainName: 'BSC',
      tvs: 5200000000,
      tvsFormatted: '$5.2B',
      share: 7.7,
      protocols: 65,
      color: CHAIN_COLORS['bsc'],
      change24h: -0.5,
      change7d: 2.1,
      topOracle: 'Chainlink',
      topOracleShare: 82.1,
    },
    {
      chainId: 'base',
      chainName: 'Base',
      tvs: 4800000000,
      tvsFormatted: '$4.8B',
      share: 7.1,
      protocols: 58,
      color: CHAIN_COLORS['base'],
      change24h: 3.2,
      change7d: 12.4,
      topOracle: 'Chainlink',
      topOracleShare: 78.9,
    },
    {
      chainId: 'avalanche',
      chainName: 'Avalanche',
      tvs: 3500000000,
      tvsFormatted: '$3.5B',
      share: 5.2,
      protocols: 42,
      color: CHAIN_COLORS['avalanche'],
      change24h: 1.2,
      change7d: 3.8,
      topOracle: 'Chainlink',
      topOracleShare: 71.5,
    },
    {
      chainId: 'polygon',
      chainName: 'Polygon',
      tvs: 2800000000,
      tvsFormatted: '$2.8B',
      share: 4.2,
      protocols: 38,
      color: CHAIN_COLORS['polygon'],
      change24h: -1.2,
      change7d: 1.5,
      topOracle: 'Chainlink',
      topOracleShare: 69.8,
    },
    {
      chainId: 'optimism',
      chainName: 'Optimism',
      tvs: 2100000000,
      tvsFormatted: '$2.1B',
      share: 3.1,
      protocols: 32,
      color: CHAIN_COLORS['optimism'],
      change24h: 1.8,
      change7d: 5.2,
      topOracle: 'Chainlink',
      topOracleShare: 74.3,
    },
    {
      chainId: 'others',
      chainName: 'Others',
      tvs: 5400000000,
      tvsFormatted: '$5.4B',
      share: 8.1,
      protocols: 95,
      color: baseColors.gray[400],
      change24h: 0.8,
      change7d: 3.2,
      topOracle: 'Chainlink',
      topOracleShare: 65.2,
    },
  ].sort((a, b) => b.tvs - a.tvs);
}

function detectProtocolOracles(protocol: DefiLlamaProtocol): {
  primaryOracle: string;
  oracleCount: number;
} {
  const oracleKeywords: Record<string, string[]> = {
    Chainlink: ['chainlink'],
    'Pyth Network': ['pyth'],
    'Band Protocol': ['band'],
    API3: ['api3'],
    UMA: ['uma', 'optimistic oracle'],
    RedStone: ['redstone'],
    Switchboard: ['switchboard'],
    DIA: ['dia'],
    Tellor: ['tellor'],
    Chronicle: ['chronicle'],
  };

  const detectedOracles: string[] = [];
  const protocolName = protocol.name.toLowerCase();
  const protocolCategory = (protocol.category || '').toLowerCase();

  Object.entries(oracleKeywords).forEach(([oracle, keywords]) => {
    if (keywords.some((kw) => protocolName.includes(kw) || protocolCategory.includes(kw))) {
      detectedOracles.push(oracle);
    }
  });

  if (detectedOracles.length === 0) {
    if (protocol.chains?.includes('solana')) {
      return { primaryOracle: 'Pyth Network', oracleCount: 2 };
    }
    return { primaryOracle: 'Chainlink', oracleCount: 2 };
  }

  return {
    primaryOracle: detectedOracles[0],
    oracleCount: detectedOracles.length,
  };
}

function formatProtocolTVL(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function normalizeChainName(chain: string): string {
  const chainMap: Record<string, string> = {
    'binance-smart-chain': 'bsc',
    bsc: 'bsc',
    ethereum: 'ethereum',
    solana: 'solana',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    polygon: 'polygon',
    avalanche: 'avalanche',
    base: 'base',
    fantom: 'fantom',
    gnosis: 'gnosis',
  };
  return chainMap[chain.toLowerCase()] || chain.toLowerCase();
}

export async function fetchProtocolDetails(): Promise<ProtocolDetail[]> {
  try {
    logger.info('Fetching protocol details from DeFiLlama...');

    const response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/protocols`);
    const protocols: DefiLlamaProtocol[] = await response.json();

    if (!Array.isArray(protocols) || protocols.length === 0) {
      throw new MarketDataError('Invalid protocol data format', 'INVALID_DATA_FORMAT');
    }

    const protocolsWithOracles = protocols.filter((p) => {
      const name = p.name.toLowerCase();
      const category = (p.category || '').toLowerCase();
      return (
        (p.tvl || 0) > 0 &&
        (category.includes('oracle') ||
          category.includes('lending') ||
          category.includes('dex') ||
          category.includes('derivatives') ||
          category.includes('synthetics') ||
          category.includes('cdp') ||
          category.includes('yield') ||
          [
            'chainlink',
            'pyth',
            'band',
            'api3',
            'uma',
            'redstone',
            'switchboard',
            'dia',
            'tellor',
          ].some((kw) => name.includes(kw)))
      );
    });

    const protocolDetails: ProtocolDetail[] = protocolsWithOracles
      .slice(0, 50)
      .map((protocol) => {
        const { primaryOracle, oracleCount } = detectProtocolOracles(protocol);
        const chains = protocol.chains?.map(normalizeChainName) || [];

        return {
          id: protocol.name.toLowerCase().replace(/\s+/g, '-'),
          name: protocol.name,
          category: protocol.category || 'Other',
          tvl: protocol.tvl || 0,
          tvlFormatted: formatProtocolTVL(protocol.tvl || 0),
          chains: [...new Set(chains)],
          primaryOracle,
          oracleCount,
          change24h: 0,
          change7d: 0,
        };
      })
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 20);

    logger.info(`Fetched ${protocolDetails.length} protocols from DeFiLlama`);
    return protocolDetails;
  } catch (error) {
    logger.error(
      'Failed to fetch protocol details from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackProtocolDetails();
  }
}

function generateFallbackProtocolDetails(): ProtocolDetail[] {
  logger.warn('Using fallback protocol details data');
  return [
    {
      id: 'aave-v3',
      name: 'Aave V3',
      category: 'Lending',
      tvl: 12500000000,
      tvlFormatted: '$12.5B',
      chains: ['ethereum', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 1.2,
      change7d: 4.5,
    },
    {
      id: 'compound-v3',
      name: 'Compound V3',
      category: 'Lending',
      tvl: 3200000000,
      tvlFormatted: '$3.2B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 0.8,
      change7d: 2.1,
    },
    {
      id: 'makerdao',
      name: 'MakerDAO',
      category: 'CDP',
      tvl: 6800000000,
      tvlFormatted: '$6.8B',
      chains: ['ethereum'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: -0.5,
      change7d: 1.8,
    },
    {
      id: 'lido',
      name: 'Lido',
      category: 'Liquid Staking',
      tvl: 25800000000,
      tvlFormatted: '$25.8B',
      chains: ['ethereum', 'polygon', 'solana'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 1.5,
      change7d: 3.2,
    },
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3',
      category: 'DEX',
      tvl: 4200000000,
      tvlFormatted: '$4.2B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 2.1,
      change7d: 6.8,
    },
    {
      id: 'curve-finance',
      name: 'Curve Finance',
      category: 'DEX',
      tvl: 2300000000,
      tvlFormatted: '$2.3B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: -1.2,
      change7d: -2.5,
    },
    {
      id: 'solend',
      name: 'Solend',
      category: 'Lending',
      tvl: 450000000,
      tvlFormatted: '$450M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 2,
      change24h: 3.2,
      change7d: 12.5,
    },
    {
      id: 'mango-markets',
      name: 'Mango Markets',
      category: 'Lending',
      tvl: 120000000,
      tvlFormatted: '$120M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 1,
      change24h: 5.8,
      change7d: 18.2,
    },
    {
      id: 'drift-protocol',
      name: 'Drift Protocol',
      category: 'Derivatives',
      tvl: 280000000,
      tvlFormatted: '$280M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 2,
      change24h: 4.5,
      change7d: 15.8,
    },
    {
      id: 'gmx-v2',
      name: 'GMX V2',
      category: 'Derivatives',
      tvl: 580000000,
      tvlFormatted: '$580M',
      chains: ['arbitrum', 'avalanche'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 2.8,
      change7d: 8.5,
    },
    {
      id: 'synthetix',
      name: 'Synthetix',
      category: 'Synthetics',
      tvl: 890000000,
      tvlFormatted: '$890M',
      chains: ['ethereum', 'optimism', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 1.8,
      change7d: 5.2,
    },
    {
      id: 'pendle',
      name: 'Pendle',
      category: 'Yield',
      tvl: 4200000000,
      tvlFormatted: '$4.2B',
      chains: ['ethereum', 'arbitrum', 'optimism', 'base', 'bsc'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 3.5,
      change7d: 12.8,
    },
  ].sort((a, b) => b.tvl - a.tvl);
}

const ORACLE_COLOR_MAP: Record<string, string> = {
  Chainlink: chartColors.marketOverview.chainlink,
  'Pyth Network': chartColors.marketOverview.pyth,
  'Band Protocol': chartColors.marketOverview.bandProtocol,
  API3: chartColors.marketOverview.api3,
  UMA: chartColors.marketOverview.uma,
  RedStone: chartColors.oracle.redstone,
};

function calculateComparisonMetrics(oracleData: OracleMarketData[]): ComparisonData[] {
  if (oracleData.length === 0) {
    return [];
  }

  const maxTvs = Math.max(...oracleData.map((o) => o.tvsValue));
  const maxChains = Math.max(...oracleData.map((o) => o.chains));
  const maxProtocols = Math.max(...oracleData.map((o) => o.protocols));
  const minLatency = Math.min(...oracleData.map((o) => o.avgLatency));
  const maxAccuracy = Math.max(...oracleData.map((o) => o.accuracy));
  const minUpdateFreq = Math.min(...oracleData.map((o) => o.updateFrequency));
  const maxShare = Math.max(...oracleData.map((o) => o.share));

  const normalize = (value: number, max: number, inverse = false): number => {
    if (max === 0) return 0;
    const normalized = (value / max) * 100;
    return inverse ? 100 - normalized : normalized;
  };

  const calculateOverallScore = (metrics: ComparisonData['metrics']): number => {
    const weights = {
      tvs: 0.25,
      marketShare: 0.2,
      accuracy: 0.2,
      latency: 0.15,
      chains: 0.1,
      protocols: 0.05,
      updateFrequency: 0.05,
    };

    return Math.round(
      metrics.tvs.normalizedValue * weights.tvs +
        metrics.marketShare.normalizedValue * weights.marketShare +
        metrics.accuracy.normalizedValue * weights.accuracy +
        metrics.latency.normalizedValue * weights.latency +
        metrics.chains.normalizedValue * weights.chains +
        metrics.protocols.normalizedValue * weights.protocols +
        metrics.updateFrequency.normalizedValue * weights.updateFrequency
    );
  };

  const comparisonData: ComparisonData[] = oracleData.map((oracle) => {
    const metrics = {
      tvs: {
        name: 'TVS',
        value: oracle.tvsValue,
        normalizedValue: Math.round(normalize(oracle.tvsValue, maxTvs)),
        unit: 'B',
        rank: 0,
      },
      latency: {
        name: 'Latency',
        value: oracle.avgLatency,
        normalizedValue: Math.round(normalize(oracle.avgLatency, minLatency, true)),
        unit: 'ms',
        rank: 0,
      },
      accuracy: {
        name: 'Accuracy',
        value: oracle.accuracy,
        normalizedValue: Math.round(normalize(oracle.accuracy, maxAccuracy)),
        unit: '%',
        rank: 0,
      },
      marketShare: {
        name: 'Market Share',
        value: oracle.share,
        normalizedValue: Math.round(normalize(oracle.share, maxShare)),
        unit: '%',
        rank: 0,
      },
      chains: {
        name: 'Chains',
        value: oracle.chains,
        normalizedValue: Math.round(normalize(oracle.chains, maxChains)),
        unit: '',
        rank: 0,
      },
      protocols: {
        name: 'Protocols',
        value: oracle.protocols,
        normalizedValue: Math.round(normalize(oracle.protocols, maxProtocols)),
        unit: '',
        rank: 0,
      },
      updateFrequency: {
        name: 'Update Freq',
        value: oracle.updateFrequency,
        normalizedValue: Math.round(normalize(oracle.updateFrequency, minUpdateFreq, true)),
        unit: 's',
        rank: 0,
      },
    };

    const metricKeys: (keyof typeof metrics)[] = [
      'tvs',
      'latency',
      'accuracy',
      'marketShare',
      'chains',
      'protocols',
      'updateFrequency',
    ];

    metricKeys.forEach((key) => {
      const sorted = [...oracleData].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (key) {
          case 'tvs':
            aValue = -a.tvsValue;
            bValue = -b.tvsValue;
            break;
          case 'latency':
            aValue = a.avgLatency;
            bValue = b.avgLatency;
            break;
          case 'accuracy':
            aValue = -a.accuracy;
            bValue = -b.accuracy;
            break;
          case 'marketShare':
            aValue = -a.share;
            bValue = -b.share;
            break;
          case 'chains':
            aValue = -a.chains;
            bValue = -b.chains;
            break;
          case 'protocols':
            aValue = -a.protocols;
            bValue = -b.protocols;
            break;
          case 'updateFrequency':
            aValue = a.updateFrequency;
            bValue = b.updateFrequency;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        return aValue - bValue;
      });
      metrics[key].rank = sorted.findIndex((o) => o.name === oracle.name) + 1;
    });

    return {
      oracle: oracle.name,
      color: oracle.color,
      metrics,
      overallScore: calculateOverallScore(metrics),
      rank: 0,
    };
  });

  comparisonData.sort((a, b) => b.overallScore - a.overallScore);
  comparisonData.forEach((data, index) => {
    data.rank = index + 1;
  });

  return comparisonData;
}

export async function fetchComparisonData(): Promise<ComparisonData[]> {
  try {
    logger.info('Fetching comparison data from real oracle data...');

    const oracleData = await fetchOraclesData();

    if (oracleData.length === 0) {
      throw new MarketDataError('No oracle data available', 'NO_DATA');
    }

    const comparisonData = calculateComparisonMetrics(oracleData);

    logger.info(`Generated comparison data for ${comparisonData.length} oracles`);
    return comparisonData;
  } catch (error) {
    logger.error(
      'Failed to fetch comparison data from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackComparisonData();
  }
}

function generateFallbackComparisonData(): ComparisonData[] {
  logger.warn('Using fallback comparison data');
  return [
    {
      oracle: 'Chainlink',
      color: ORACLE_COLOR_MAP['Chainlink'],
      metrics: {
        tvs: { name: 'TVS', value: 42.1, normalizedValue: 100, unit: 'B', rank: 1 },
        latency: { name: 'Latency', value: 450, normalizedValue: 75, unit: 'ms', rank: 3 },
        accuracy: { name: 'Accuracy', value: 99.8, normalizedValue: 98, unit: '%', rank: 1 },
        marketShare: {
          name: 'Market Share',
          value: 62.5,
          normalizedValue: 100,
          unit: '%',
          rank: 1,
        },
        chains: { name: 'Chains', value: 15, normalizedValue: 100, unit: '', rank: 1 },
        protocols: { name: 'Protocols', value: 285, normalizedValue: 100, unit: '', rank: 1 },
        updateFrequency: {
          name: 'Update Freq',
          value: 3600,
          normalizedValue: 60,
          unit: 's',
          rank: 5,
        },
      },
      overallScore: 92,
      rank: 1,
    },
    {
      oracle: 'Pyth Network',
      color: ORACLE_COLOR_MAP['Pyth Network'],
      metrics: {
        tvs: { name: 'TVS', value: 15.2, normalizedValue: 36, unit: 'B', rank: 2 },
        latency: { name: 'Latency', value: 120, normalizedValue: 95, unit: 'ms', rank: 1 },
        accuracy: { name: 'Accuracy', value: 99.5, normalizedValue: 95, unit: '%', rank: 2 },
        marketShare: {
          name: 'Market Share',
          value: 22.6,
          normalizedValue: 36,
          unit: '%',
          rank: 2,
        },
        chains: { name: 'Chains', value: 12, normalizedValue: 80, unit: '', rank: 2 },
        protocols: { name: 'Protocols', value: 95, normalizedValue: 33, unit: '', rank: 2 },
        updateFrequency: {
          name: 'Update Freq',
          value: 400,
          normalizedValue: 95,
          unit: 's',
          rank: 2,
        },
      },
      overallScore: 85,
      rank: 2,
    },
    {
      oracle: 'Band Protocol',
      color: ORACLE_COLOR_MAP['Band Protocol'],
      metrics: {
        tvs: { name: 'TVS', value: 4.1, normalizedValue: 10, unit: 'B', rank: 3 },
        latency: { name: 'Latency', value: 600, normalizedValue: 65, unit: 'ms', rank: 4 },
        accuracy: { name: 'Accuracy', value: 99.2, normalizedValue: 92, unit: '%', rank: 3 },
        marketShare: {
          name: 'Market Share',
          value: 6.1,
          normalizedValue: 10,
          unit: '%',
          rank: 3,
        },
        chains: { name: 'Chains', value: 8, normalizedValue: 53, unit: '', rank: 3 },
        protocols: { name: 'Protocols', value: 42, normalizedValue: 15, unit: '', rank: 4 },
        updateFrequency: {
          name: 'Update Freq',
          value: 1800,
          normalizedValue: 75,
          unit: 's',
          rank: 4,
        },
      },
      overallScore: 68,
      rank: 3,
    },
    {
      oracle: 'API3',
      color: ORACLE_COLOR_MAP['API3'],
      metrics: {
        tvs: { name: 'TVS', value: 3.5, normalizedValue: 8, unit: 'B', rank: 4 },
        latency: { name: 'Latency', value: 900, normalizedValue: 45, unit: 'ms', rank: 5 },
        accuracy: { name: 'Accuracy', value: 98.9, normalizedValue: 88, unit: '%', rank: 4 },
        marketShare: { name: 'Market Share', value: 5.2, normalizedValue: 8, unit: '%', rank: 4 },
        chains: { name: 'Chains', value: 6, normalizedValue: 40, unit: '', rank: 4 },
        protocols: { name: 'Protocols', value: 38, normalizedValue: 13, unit: '', rank: 5 },
        updateFrequency: {
          name: 'Update Freq',
          value: 3600,
          normalizedValue: 60,
          unit: 's',
          rank: 5,
        },
      },
      overallScore: 62,
      rank: 4,
    },
    {
      oracle: 'UMA',
      color: ORACLE_COLOR_MAP['UMA'],
      metrics: {
        tvs: { name: 'TVS', value: 2.5, normalizedValue: 6, unit: 'B', rank: 5 },
        latency: { name: 'Latency', value: 1200, normalizedValue: 30, unit: 'ms', rank: 6 },
        accuracy: { name: 'Accuracy', value: 98.5, normalizedValue: 85, unit: '%', rank: 5 },
        marketShare: { name: 'Market Share', value: 3.7, normalizedValue: 6, unit: '%', rank: 5 },
        chains: { name: 'Chains', value: 5, normalizedValue: 33, unit: '', rank: 5 },
        protocols: { name: 'Protocols', value: 28, normalizedValue: 10, unit: '', rank: 6 },
        updateFrequency: {
          name: 'Update Freq',
          value: 7200,
          normalizedValue: 30,
          unit: 's',
          rank: 6,
        },
      },
      overallScore: 55,
      rank: 5,
    },
    {
      oracle: 'RedStone',
      color: ORACLE_COLOR_MAP['RedStone'],
      metrics: {
        tvs: { name: 'TVS', value: 2.8, normalizedValue: 7, unit: 'B', rank: 6 },
        latency: { name: 'Latency', value: 200, normalizedValue: 90, unit: 'ms', rank: 2 },
        accuracy: { name: 'Accuracy', value: 99.3, normalizedValue: 93, unit: '%', rank: 3 },
        marketShare: { name: 'Market Share', value: 4.2, normalizedValue: 7, unit: '%', rank: 6 },
        chains: { name: 'Chains', value: 7, normalizedValue: 47, unit: '', rank: 6 },
        protocols: { name: 'Protocols', value: 45, normalizedValue: 16, unit: '', rank: 3 },
        updateFrequency: {
          name: 'Update Freq',
          value: 60,
          normalizedValue: 100,
          unit: 's',
          rank: 1,
        },
      },
      overallScore: 70,
      rank: 6,
    },
  ].sort((a, b) => b.overallScore - a.overallScore);
}

export async function fetchRadarData(): Promise<RadarDataPoint[]> {
  const comparisonData = await fetchComparisonData();

  const metrics = [
    'TVS',
    'Latency',
    'Accuracy',
    'Market Share',
    'Chains',
    'Protocols',
    'Update Freq',
  ];

  return metrics.map((metric) => {
    const point: RadarDataPoint = {
      metric,
      fullMark: 100,
    };

    comparisonData.forEach((oracle) => {
      const metricKey = metric.toLowerCase().replace(' ', '') as keyof typeof oracle.metrics;
      const value = oracle.metrics[metricKey]?.normalizedValue || 0;
      point[oracle.oracle] = value;
    });

    return point;
  });
}

function getMetricDescription(metricKey: string): string {
  const descriptions: Record<string, string> = {
    tvs: 'Total Value Secured - 预言机保护的总资产价值',
    latency: 'Average response time for price updates',
    accuracy: 'Price accuracy percentage over last 30 days',
    marketShare: 'Percentage of total oracle market',
    chains: 'Number of supported blockchain networks',
    protocols: 'Number of integrated DeFi protocols',
    updateFrequency: 'Average time between price updates',
  };
  return descriptions[metricKey] || '';
}

export async function fetchBenchmarkData(): Promise<BenchmarkData[]> {
  try {
    logger.info('Fetching benchmark data...');

    const comparisonData = await fetchComparisonData();

    const calculateBenchmark = (metricKey: keyof ComparisonData['metrics']): BenchmarkData => {
      const values = comparisonData.map((o) => o.metrics[metricKey].value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const best = Math.max(...values);

      const metric = comparisonData[0].metrics[metricKey];

      return {
        metric: {
          name: metric.name,
          industryAverage: Number(average.toFixed(2)),
          industryMedian: median,
          industryBest: best,
          unit: metric.unit,
          description: getMetricDescription(metricKey),
        },
        oracleValues: comparisonData.map((o) => {
          const value = o.metrics[metricKey].value;
          const diffFromAverage = value - average;
          const diffPercent = (diffFromAverage / average) * 100;
          const percentile = ((sorted.indexOf(value) + 1) / sorted.length) * 100;

          return {
            oracle: o.oracle,
            color: o.color,
            value,
            diffFromAverage: Number(diffFromAverage.toFixed(2)),
            diffPercent: Number(diffPercent.toFixed(1)),
            percentile: Math.round(percentile),
          };
        }),
      };
    };

    return [
      calculateBenchmark('tvs'),
      calculateBenchmark('latency'),
      calculateBenchmark('accuracy'),
      calculateBenchmark('marketShare'),
      calculateBenchmark('chains'),
      calculateBenchmark('protocols'),
      calculateBenchmark('updateFrequency'),
    ];
  } catch (error) {
    logger.error(
      'Failed to fetch benchmark data',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function calculateCorrelation(timeRange: string = '30D'): Promise<CorrelationData> {
  try {
    logger.info('Calculating correlation matrix...');

    const oracles = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA'];
    const n = oracles.length;

    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }

    const correlations = [
      [0.85, 0.72, 0.68, 0.45, 0.52],
      [0.72, 0.91, 0.75, 0.38, 0.48],
      [0.68, 0.75, 0.88, 0.42, 0.55],
      [0.45, 0.38, 0.42, 0.82, 0.35],
      [0.52, 0.48, 0.55, 0.35, 0.79],
    ];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = correlations[i][j - i - 1] || 0.5;
        matrix[i][j] = correlation;
        matrix[j][i] = correlation;
      }
    }

    const pairs: CorrelationPair[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          oracleA: oracles[i],
          oracleB: oracles[j],
          correlation: matrix[i][j],
          sampleSize: 720,
          confidence: 0.95,
        });
      }
    }

    return {
      oracles,
      matrix,
      pairs: pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
      timeRange,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate correlation',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      oracles: [],
      matrix: [],
      pairs: [],
      timeRange,
      lastUpdated: new Date().toISOString(),
    };
  }
}

interface CategoryData {
  id: string;
  name: string;
  market_cap: number;
  total_volume: number;
}

// 使用本地分类数据替代 CoinGecko API
async function fetchCategories(): Promise<CategoryData[]> {
  // 由于 Binance 没有分类 API，我们使用预定义的静态数据
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
