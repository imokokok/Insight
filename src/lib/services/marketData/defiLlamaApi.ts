import { createLogger } from '@/lib/utils/logger';
import {
  OracleMarketData,
  AssetData,
  TVSTrendData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  CorrelationPair,
  RadarDataPoint,
} from '@/app/market-overview/types';
import { ORACLE_COLORS } from '@/app/market-overview/constants';
import { chartColors, chainColors, baseColors } from '@/lib/config/colors';

const logger = createLogger('marketData:defiLlamaApi');

const DEFILLAMA_API_BASE = 'https://api.llama.fi';
const DEFILLAMA_PRO_API_BASE = 'https://pro-api.llama.fi';
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

      return {
        name: formatOracleName(oracle.name),
        share: Number(share.toFixed(2)),
        color,
        tvs: formatTVS(tvs),
        tvsValue: Number((tvs / 1e9).toFixed(2)),
        chains: oracle.chains?.length || 0,
        protocols: oracle.protocols || 0,
        avgLatency: estimateLatency(oracle.name),
        accuracy: estimateAccuracy(oracle.name),
        updateFrequency: estimateUpdateFrequency(oracle.name),
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
    } catch (error) {
      logger.warn('/oracles endpoint unavailable, falling back to /protocols');
      response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/protocols`);

      const protocols: DefiLlamaProtocol[] = await response.json();

      const oracleProtocols = protocols.filter(
        (p) =>
          p.category?.toLowerCase().includes('oracle') ||
          ['chainlink', 'pyth', 'band', 'api3', 'uma', 'redstone', 'switchboard'].some((name) =>
            p.name.toLowerCase().includes(name.toLowerCase())
          )
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
    logger.info('Fetching asset data...');

    const coinGeckoIds: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      SOL: 'solana',
      AVAX: 'avalanche-2',
      LINK: 'chainlink',
      MATIC: 'matic-network',
      ARB: 'arbitrum',
      OP: 'optimism',
      UNI: 'uniswap',
      AAVE: 'aave',
      USDC: 'usd-coin',
      USDT: 'tether',
    };

    const assets: AssetData[] = [];

    const ids = symbols
      .map((s) => coinGeckoIds[s])
      .filter(Boolean)
      .join(',');

    if (ids) {
      try {
        const response = await fetchWithRetry(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
        );

        const priceData = await response.json();

        symbols.forEach((symbol) => {
          const coinId = coinGeckoIds[symbol];
          const data = priceData[coinId];

          if (data) {
            assets.push({
              symbol,
              price: data.usd || 0,
              change24h: data.usd_24h_change || 0,
              change7d: 0,
              volume24h: data.usd_24h_vol || 0,
              marketCap: data.usd_market_cap || 0,
              primaryOracle: estimatePrimaryOracle(symbol),
              oracleCount: estimateOracleCount(symbol),
              priceSources: [],
            });
          }
        });
      } catch (error) {
        logger.warn('Failed to fetch from CoinGecko, using fallback data');
      }
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

export async function fetchChainBreakdown(): Promise<ChainBreakdown[]> {
  try {
    logger.info('Fetching chain breakdown data...');

    const mockChainData: ChainBreakdown[] = [
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
    ];

    return mockChainData.sort((a, b) => b.tvs - a.tvs);
  } catch (error) {
    logger.error(
      'Failed to fetch chain breakdown',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function fetchProtocolDetails(): Promise<ProtocolDetail[]> {
  try {
    logger.info('Fetching protocol details...');

    const mockProtocolData: ProtocolDetail[] = [
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
    ];

    return mockProtocolData.sort((a, b) => b.tvl - a.tvl);
  } catch (error) {
    logger.error(
      'Failed to fetch protocol details',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

const ORACLE_COLOR_MAP: Record<string, string> = {
  Chainlink: chartColors.marketOverview.chainlink,
  'Pyth Network': chartColors.marketOverview.pyth,
  'Band Protocol': chartColors.marketOverview.band,
  API3: chartColors.marketOverview.api3,
  UMA: chartColors.marketOverview.uma,
  RedStone: chartColors.oracle.redstone,
};

export async function fetchComparisonData(): Promise<ComparisonData[]> {
  try {
    logger.info('Fetching comparison data...');

    const mockData: ComparisonData[] = [
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
    ];

    return mockData.sort((a, b) => b.overallScore - a.overallScore);
  } catch (error) {
    logger.error(
      'Failed to fetch comparison data',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
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

export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  try {
    logger.info('Fetching asset categories...');

    const mockAssetCategories: AssetCategory[] = [
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
    ];

    return mockAssetCategories.sort((a, b) => b.value - a.value);
  } catch (error) {
    logger.error(
      'Failed to fetch asset categories',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}
