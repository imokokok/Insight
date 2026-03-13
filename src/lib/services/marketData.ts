/**
 * Market Data Service
 *
 * 提供从 DeFiLlama、Dune Analytics 等数据源获取市场数据的功能。
 * 包含预言机 TVS 数据、资产价格数据等。
 */

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
  RiskMetrics,
  AnomalyData,
} from '@/app/market-overview/types';
import { ORACLE_COLORS } from '@/app/market-overview/constants';
import {
  calculateRiskMetrics,
  calculateHHIFromOracles,
  calculateDiversificationScore,
  calculateVolatilityIndex,
  calculateCorrelationRisk,
} from '@/lib/analytics/riskMetrics';
import {
  detectAllAnomalies,
  detectPriceAnomalies,
  detectTrendBreak,
  detectVolatilityAnomalies,
} from '@/lib/analytics/anomalyDetection';

const logger = createLogger('marketData');

// API 配置
const DEFILLAMA_API_BASE = 'https://api.llama.fi';
const DEFILLAMA_PRO_API_BASE = 'https://pro-api.llama.fi';

// 请求超时配置
const REQUEST_TIMEOUT = 10000; // 10秒

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

/**
 * API 错误类
 */
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

/**
 * DeFiLlama 预言机响应类型
 */
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

/**
 * DeFiLlama 协议响应类型
 */
interface DefiLlamaProtocol {
  name: string;
  tvl?: number;
  chainTvls?: Record<string, number>;
  chains?: string[];
  category?: string;
  oracles?: string[];
}

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 带超时的 fetch
 */
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

/**
 * 带重试的 fetch
 */
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
        // 如果是 403 或 429，可能是限流，需要重试
        if (response.status === 403 || response.status === 429) {
          throw new MarketDataError(
            `Rate limited or forbidden: ${response.statusText}`,
            'RATE_LIMIT_ERROR',
            response.status
          );
        }
        // 其他错误直接抛出
        throw new MarketDataError(
          `HTTP error: ${response.status} ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最后一次重试，抛出错误
      if (i === retries - 1) {
        break;
      }

      // 等待后重试
      logger.warn(`Fetch attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (i + 1)); // 指数退避
    }
  }

  throw new MarketDataError(
    `Failed after ${retries} retries: ${lastError?.message}`,
    'RETRY_EXHAUSTED',
    undefined,
    lastError
  );
}

/**
 * 获取预言机列表
 *
 * 注意：DeFiLlama 的 /oracles 端点需要付费订阅
 * 这里使用 /protocols 端点并筛选出预言机相关协议作为替代方案
 */
export async function fetchOraclesData(): Promise<OracleMarketData[]> {
  try {
    logger.info('Fetching oracle data from DeFiLlama...');

    // 首先尝试获取预言机数据
    let response: Response;
    try {
      response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/oracles`);
    } catch (error) {
      // 如果 /oracles 端点不可用，使用 /protocols 作为备选
      logger.warn('/oracles endpoint unavailable, falling back to /protocols');
      response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/protocols`);

      const protocols: DefiLlamaProtocol[] = await response.json();

      // 筛选出预言机相关的协议
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

/**
 * 将 DeFiLlama 预言机数据转换为应用格式
 */
function transformOraclesToMarketData(
  oracles: DefiLlamaOracleResponse['oracles'] = []
): OracleMarketData[] {
  if (!oracles || oracles.length === 0) {
    return [];
  }

  // 计算总 TVS
  const totalTvs = oracles.reduce((sum, o) => sum + (o.tvs || 0), 0);

  return oracles
    .map((oracle, index) => {
      const tvs = oracle.tvs || 0;
      const tvsPrevDay = oracle.tvsPrevDay || tvs;
      const share = totalTvs > 0 ? (tvs / totalTvs) * 100 : 0;

      // 计算 24h 变化
      const change24h = tvsPrevDay > 0 ? ((tvs - tvsPrevDay) / tvsPrevDay) * 100 : 0;

      // 计算 7d 和 30d 变化
      const tvsPrevWeek = oracle.tvsPrevWeek || tvs;
      const tvsPrevMonth = oracle.tvsPrevMonth || tvs;
      const change7d = tvsPrevWeek > 0 ? ((tvs - tvsPrevWeek) / tvsPrevWeek) * 100 : 0;
      const change30d = tvsPrevMonth > 0 ? ((tvs - tvsPrevMonth) / tvsPrevMonth) * 100 : 0;

      // 获取颜色
      const color = getOracleColor(oracle.name);

      return {
        name: formatOracleName(oracle.name),
        share: Number(share.toFixed(2)),
        color,
        tvs: formatTVS(tvs),
        tvsValue: Number((tvs / 1e9).toFixed(2)), // 转换为十亿美元
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

/**
 * 将协议数据转换为预言机市场数据（备选方案）
 */
function transformProtocolsToOracleData(protocols: DefiLlamaProtocol[]): OracleMarketData[] {
  if (protocols.length === 0) {
    return [];
  }

  // 按名称分组并聚合 TVL
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
        change24h: 0, // 无法从当前数据计算
        change7d: 0,
        change30d: 0,
      };
    })
    .sort((a, b) => b.share - a.share);
}

/**
 * 识别预言机名称
 */
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

/**
 * 格式化预言机名称
 */
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

/**
 * 获取预言机颜色
 */
function getOracleColor(name: string): string {
  const colorMap: Record<string, string> = {
    Chainlink: ORACLE_COLORS.chainlink,
    'Pyth Network': ORACLE_COLORS.pyth,
    'Band Protocol': ORACLE_COLORS.band,
    API3: ORACLE_COLORS.api3,
    UMA: ORACLE_COLORS.uma,
    RedStone: '#FF6B6B',
    Switchboard: '#4ECDC4',
    DIA: '#95E1D3',
    Flux: '#F38181',
    Tellor: '#AA96DA',
  };

  return colorMap[name] || ORACLE_COLORS.others;
}

/**
 * 格式化 TVS 显示
 */
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

/**
 * 估算延迟（基于典型值）
 */
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

/**
 * 估算准确性（基于典型值）
 */
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

/**
 * 估算更新频率（秒）
 */
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

/**
 * 获取资产数据
 *
 * 从 DeFiLlama 获取代币价格数据
 */
export async function fetchAssetsData(
  symbols: string[] = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK']
): Promise<AssetData[]> {
  try {
    logger.info('Fetching asset data...');

    // 构建代币地址映射（使用 CoinGecko ID 映射）
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

    // 批量获取价格数据
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
              change7d: 0, // CoinGecko 免费版不提供
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

    // 如果获取失败，返回模拟数据
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

/**
 * 生成备选资产数据
 */
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

/**
 * 估算主要预言机
 */
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

/**
 * 估算预言机数量
 */
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

/**
 * 生成 TVS 趋势数据
 */
export function generateTVSTrendData(
  hours: number,
  oracleData: OracleMarketData[]
): TVSTrendData[] {
  const data: TVSTrendData[] = [];
  const now = Date.now();
  const interval = hours <= 24 ? 3600000 : 86400000; // 1小时或1天
  const points = hours === 0 ? 365 : Math.min(hours, 365);

  // 获取各预言机的基准 TVS
  const baseValues: Record<string, number> = {};
  oracleData.forEach((oracle) => {
    const key = oracle.name.toLowerCase().replace(' network', '').replace(' protocol', '');
    baseValues[key] = oracle.tvsValue;
  });

  // 默认基准值
  const defaults: Record<string, number> = {
    chainlink: 42.1,
    pyth: 15.2,
    band: 4.1,
    api3: 3.5,
    uma: 2.5,
  };

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval;
    const date = new Date(timestamp);
    const dateStr =
      hours <= 24
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 添加随机波动
    const volatility = 0.02;

    const chainlink =
      (baseValues.chainlink || defaults.chainlink) * (1 + (Math.random() - 0.48) * volatility);
    const pyth = (baseValues.pyth || defaults.pyth) * (1 + (Math.random() - 0.45) * volatility);
    const band = (baseValues.band || defaults.band) * (1 + (Math.random() - 0.5) * volatility);
    const api3 = (baseValues.api3 || defaults.api3) * (1 + (Math.random() - 0.5) * volatility);
    const uma = (baseValues.uma || defaults.uma) * (1 + (Math.random() - 0.5) * volatility);

    data.push({
      timestamp,
      date: dateStr,
      chainlink: Number(chainlink.toFixed(2)),
      pyth: Number(pyth.toFixed(2)),
      band: Number(band.toFixed(2)),
      api3: Number(api3.toFixed(2)),
      uma: Number(uma.toFixed(2)),
      total: Number((chainlink + pyth + band + api3 + uma).toFixed(2)),
    });
  }

  return data;
}

/**
 * 获取完整市场数据
 */
export interface MarketDataResponse {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  lastUpdated: Date;
  error?: string;
}

/**
 * 获取完整市场数据（带错误处理）
 */
export async function fetchMarketData(timeRangeHours: number = 720): Promise<MarketDataResponse> {
  const startTime = Date.now();

  try {
    logger.info('Fetching complete market data...');

    // 并行获取数据
    const [oracleData, assets] = await Promise.all([fetchOraclesData(), fetchAssetsData()]);

    // 生成趋势数据
    const trendData = generateTVSTrendData(timeRangeHours, oracleData);

    const duration = Date.now() - startTime;
    logger.info(`Market data fetched successfully in ${duration}ms`);

    return {
      oracleData,
      assets,
      trendData,
      lastUpdated: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Failed to fetch market data',
      error instanceof Error ? error : new Error(errorMessage)
    );

    // 返回空数据但标记错误
    return {
      oracleData: [],
      assets: [],
      trendData: [],
      lastUpdated: new Date(),
      error: errorMessage,
    };
  }
}

/**
 * 检查 API 健康状态
 */
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

// ==================== 链级别明细数据 ====================

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  bsc: '#F3BA2F',
  polygon: '#8247E5',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  avalanche: '#E84142',
  solana: '#14F195',
  base: '#0052FF',
  fantom: '#1969FF',
  gnosis: '#133629',
  linea: '#00D395',
  scroll: '#FFEEDA',
  zksync: '#8C8DFC',
  mantle: '#000000',
  celo: '#FCFF52',
  moonbeam: '#53CBC8',
  moonriver: '#F2B705',
  cronos: '#002D72',
  kava: '#FF564F',
  metis: '#00D2FF',
  aurora: '#70D44B',
};

/**
 * 获取链级别 TVS 分布数据
 */
export async function fetchChainBreakdown(): Promise<ChainBreakdown[]> {
  try {
    logger.info('Fetching chain breakdown data...');

    // 模拟链级别数据（实际项目中应从API获取）
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
        color: '#9CA3AF',
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

// ==================== 协议级别数据 ====================

/**
 * 获取协议级别数据
 */
export async function fetchProtocolDetails(): Promise<ProtocolDetail[]> {
  try {
    logger.info('Fetching protocol details...');

    // 模拟协议级别数据（实际项目中应从API获取）
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

// ==================== 对比分析功能 ====================

const ORACLE_LIST = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA', 'RedStone'];

const ORACLE_COLOR_MAP: Record<string, string> = {
  Chainlink: '#375BD2',
  'Pyth Network': '#E6B800',
  'Band Protocol': '#516FF6',
  API3: '#7CE3CB',
  UMA: '#FF4A8D',
  RedStone: '#FF6B6B',
};

/**
 * 获取多预言机对比数据
 */
export async function fetchComparisonData(): Promise<ComparisonData[]> {
  try {
    logger.info('Fetching comparison data...');

    // 模拟对比数据（实际项目中应从API获取）
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

/**
 * 获取雷达图数据
 */
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

/**
 * 获取行业基准数据
 */
export async function fetchBenchmarkData(): Promise<BenchmarkData[]> {
  try {
    logger.info('Fetching benchmark data...');

    const comparisonData = await fetchComparisonData();

    // 计算行业基准
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

          // 计算百分位数（简化版）
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

/**
 * 计算相关性矩阵
 */
export async function calculateCorrelation(timeRange: string = '30D'): Promise<CorrelationData> {
  try {
    logger.info('Calculating correlation matrix...');

    const oracles = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA'];
    const n = oracles.length;

    // 生成模拟的相关系数矩阵（实际项目中应基于历史价格数据计算）
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // 对角线为1（自相关）
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }

    // 填充上三角矩阵
    const correlations = [
      [0.85, 0.72, 0.68, 0.45, 0.52], // Chainlink vs others
      [0.72, 0.91, 0.75, 0.38, 0.48], // Pyth vs others
      [0.68, 0.75, 0.88, 0.42, 0.55], // Band vs others
      [0.45, 0.38, 0.42, 0.82, 0.35], // API3 vs others
      [0.52, 0.48, 0.55, 0.35, 0.79], // UMA vs others
    ];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = correlations[i][j - i - 1] || 0.5;
        matrix[i][j] = correlation;
        matrix[j][i] = correlation;
      }
    }

    // 生成配对数据
    const pairs: CorrelationPair[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          oracleA: oracles[i],
          oracleB: oracles[j],
          correlation: matrix[i][j],
          sampleSize: 720, // 30 days * 24 hours
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

// ==================== 资产类别分析 ====================

/**
 * 获取资产类别分布数据
 */
export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  try {
    logger.info('Fetching asset categories...');

    // 模拟资产类别数据（实际项目中应从API获取）
    const mockAssetCategories: AssetCategory[] = [
      {
        category: 'l1-tokens',
        label: 'L1 Tokens',
        value: 28500000000,
        share: 42.5,
        color: '#3B82F6',
        assets: ['ETH', 'SOL', 'AVAX', 'BNB', 'MATIC'],
        avgVolatility: 3.2,
        avgLiquidity: 95.8,
      },
      {
        category: 'stablecoins',
        label: 'Stablecoins',
        value: 18200000000,
        share: 27.1,
        color: '#10B981',
        assets: ['USDC', 'USDT', 'DAI', 'USDe', 'sUSDe'],
        avgVolatility: 0.15,
        avgLiquidity: 99.2,
      },
      {
        category: 'l2-tokens',
        label: 'L2 Tokens',
        value: 6800000000,
        share: 10.1,
        color: '#8B5CF6',
        assets: ['ARB', 'OP', 'STRK', 'MANTLE', 'BASE'],
        avgVolatility: 4.8,
        avgLiquidity: 88.5,
      },
      {
        category: 'defi-governance',
        label: 'DeFi Governance',
        value: 5200000000,
        share: 7.7,
        color: '#F59E0B',
        assets: ['UNI', 'AAVE', 'MKR', 'CRV', 'SNX'],
        avgVolatility: 5.2,
        avgLiquidity: 82.3,
      },
      {
        category: 'liquid-staking',
        label: 'Liquid Staking',
        value: 4800000000,
        share: 7.1,
        color: '#EC4899',
        assets: ['stETH', 'rETH', 'cbETH', 'wstETH', 'sfrxETH'],
        avgVolatility: 2.8,
        avgLiquidity: 91.5,
      },
      {
        category: 'rwa',
        label: 'RWA',
        value: 3500000000,
        share: 5.5,
        color: '#6366F1',
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

// ==================== 风险指标和异常检测 ====================

/**
 * 获取风险指标数据
 *
 * @param oracleData 预言机市场数据
 * @returns 综合风险指标
 */
export async function fetchRiskMetrics(oracleData: OracleMarketData[]): Promise<RiskMetrics> {
  try {
    logger.info('Fetching risk metrics...');

    // 生成模拟价格历史数据用于波动率计算
    const priceHistory: number[] = [];
    let basePrice = 100;
    for (let i = 0; i < 100; i++) {
      basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);
      priceHistory.push(basePrice);
    }

    // 生成模拟相关性矩阵
    const n = oracleData.length;
    const correlationMatrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // 对角线为1
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1;
    }

    // 填充上三角矩阵
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = 0.5 + Math.random() * 0.4; // 0.5-0.9 之间的相关性
        correlationMatrix[i][j] = correlation;
        correlationMatrix[j][i] = correlation;
      }
    }

    // 计算风险指标
    const riskMetrics = calculateRiskMetrics(oracleData, priceHistory, correlationMatrix);

    logger.info('Risk metrics calculated successfully');
    return riskMetrics;
  } catch (error) {
    logger.error(
      'Failed to fetch risk metrics',
      error instanceof Error ? error : new Error(String(error))
    );

    // 返回默认风险指标
    return {
      hhi: {
        value: 2500,
        level: 'medium',
        description: 'market_concentration_medium',
        concentrationRatio: 65,
      },
      diversification: {
        score: 60,
        level: 'medium',
        description: 'diversification_moderate',
        factors: {
          chainDiversity: 55,
          protocolDiversity: 65,
          assetDiversity: 60,
        },
      },
      volatility: {
        index: 35,
        level: 'medium',
        description: 'volatility_moderate',
        annualizedVolatility: 0.35,
        dailyVolatility: 0.018,
      },
      correlationRisk: {
        score: 50,
        level: 'medium',
        description: 'correlation_risk_moderate',
        avgCorrelation: 0.65,
        highCorrelationPairs: [],
      },
      overallRisk: {
        score: 45,
        level: 'medium',
        timestamp: Date.now(),
      },
    };
  }
}

/**
 * 检测市场异常
 *
 * @param oracleData 预言机数据
 * @param assetData 资产数据
 * @returns 检测到的异常列表
 */
export async function detectAnomalies(
  oracleData: OracleMarketData[],
  assetData: AssetData[]
): Promise<AnomalyData[]> {
  try {
    logger.info('Detecting market anomalies...');

    const allAnomalies: AnomalyData[] = [];

    // 为每个资产检测异常
    assetData.forEach((asset, index) => {
      // 生成模拟价格历史
      const prices: number[] = [];
      const timestamps: number[] = [];
      let basePrice = asset.price;
      const now = Date.now();

      for (let i = 100; i >= 0; i--) {
        const timestamp = now - i * 3600000; // 每小时一个数据点
        basePrice = basePrice * (1 + (Math.random() - 0.48 + asset.change24h / 2400) * 0.02);
        prices.push(basePrice);
        timestamps.push(timestamp);
      }

      // 检测价格异常
      const priceAnomalies = detectPriceAnomalies(prices, timestamps, asset.symbol);
      allAnomalies.push(...priceAnomalies);

      // 检测趋势突变
      const { anomalies: trendAnomalies } = detectTrendBreak(prices, timestamps);
      allAnomalies.push(...trendAnomalies);

      // 检测波动率异常
      const volatilityAnomalies = detectVolatilityAnomalies(prices, timestamps);
      allAnomalies.push(...volatilityAnomalies);
    });

    // 按时间戳排序（最新的在前）
    allAnomalies.sort((a, b) => b.timestamp - a.timestamp);

    // 限制返回数量
    const limitedAnomalies = allAnomalies.slice(0, 20);

    logger.info(`Detected ${limitedAnomalies.length} anomalies`);
    return limitedAnomalies;
  } catch (error) {
    logger.error(
      'Failed to detect anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * 获取 HHI 指数
 *
 * @param oracleData 预言机市场数据
 * @returns HHI 计算结果
 */
export async function fetchHHI(oracleData: OracleMarketData[]) {
  try {
    logger.info('Calculating HHI...');
    return calculateHHIFromOracles(oracleData);
  } catch (error) {
    logger.error(
      'Failed to calculate HHI',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      value: 0,
      level: 'low' as const,
      description: 'calculation_error',
      concentrationRatio: 0,
    };
  }
}

/**
 * 获取多元化评分
 *
 * @param oracleData 预言机市场数据
 * @returns 多元化评分结果
 */
export async function fetchDiversificationScore(oracleData: OracleMarketData[]) {
  try {
    logger.info('Calculating diversification score...');

    const totalChains = Math.max(...oracleData.map((o) => o.chains));
    const totalProtocols = oracleData.reduce((sum, o) => sum + o.protocols, 0);

    return calculateDiversificationScore({
      chainCount: oracleData.reduce((sum, o) => sum + o.chains, 0),
      totalChains: totalChains * oracleData.length,
      protocolCount: totalProtocols,
      totalProtocols: totalProtocols * 2,
      assetCount: oracleData.length * 10,
      totalAssets: 100,
    });
  } catch (error) {
    logger.error(
      'Failed to calculate diversification score',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical' as const,
      description: 'calculation_error',
      factors: {
        chainDiversity: 0,
        protocolDiversity: 0,
        assetDiversity: 0,
      },
    };
  }
}

// ==================== 导出功能 ====================

import {
  ExportConfig,
  ExportFormat,
  ExportDataType,
  FieldGroup,
  generateExportFileName,
  getTimeRangeHours,
} from '@/lib/export/exportConfig';

/**
 * 导出数据选项
 */
export interface ExportDataOptions {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  chainBreakdown?: ChainBreakdown[];
  protocolDetails?: ProtocolDetail[];
  assetCategories?: AssetCategory[];
  comparisonData?: ComparisonData[];
  benchmarkData?: BenchmarkData[];
  correlationData?: CorrelationData;
  riskMetrics?: RiskMetrics;
  anomalies?: AnomalyData[];
}

/**
 * 根据配置导出数据
 */
export function exportWithConfig(
  config: ExportConfig,
  data: ExportDataOptions
): { content: string | Blob; fileName: string; mimeType: string } {
  logger.info(`Exporting data with config: ${config.name}, format: ${config.format}`);

  const fileName = config.fileName || generateExportFileName(config);

  switch (config.format) {
    case 'csv':
      return {
        content: exportToCSV(config, data),
        fileName,
        mimeType: 'text/csv;charset=utf-8;',
      };
    case 'json':
      return {
        content: exportToJSON(config, data),
        fileName,
        mimeType: 'application/json',
      };
    case 'excel':
      return {
        content: exportToExcel(config, data),
        fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
}

/**
 * 导出为 CSV 格式
 */
function exportToCSV(config: ExportConfig, data: ExportDataOptions): string {
  const lines: string[] = [];

  // Add metadata if enabled
  if (config.includeMetadata) {
    lines.push('# Oracle Market Data Export');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Time Range: ${config.timeRange}`);
    lines.push(`# Data Types: ${config.dataTypes.join(', ')}`);
    lines.push('');
  }

  // Export each data type
  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    // Add section header
    lines.push(`# ${group.label}`);

    // Add headers
    lines.push(selectedFields.map((f) => f.key).join(','));

    // Add data rows
    const rows = getDataRows(dataType, data, selectedFields);
    rows.forEach((row) => {
      lines.push(
        selectedFields
          .map((field) => {
            const value = row[field.key];
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Escape values containing commas or quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      );
    });

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 导出为 JSON 格式
 */
function exportToJSON(config: ExportConfig, data: ExportDataOptions): string {
  const exportData: Record<string, unknown> = {};

  // Add metadata if enabled
  if (config.includeMetadata) {
    exportData.metadata = {
      exportTimestamp: new Date().toISOString(),
      timeRange: config.timeRange,
      dataTypes: config.dataTypes,
      config: {
        name: config.name,
        format: config.format,
      },
    };
  }

  // Export each data type
  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    const rows = getDataRows(dataType, data, selectedFields);
    exportData[dataType] = rows.map((row) => {
      const filteredRow: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        filteredRow[field.key] = row[field.key];
      });
      return filteredRow;
    });
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * 导出为 Excel 格式（使用简单的 XML 格式）
 */
function exportToExcel(config: ExportConfig, data: ExportDataOptions): Blob {
  const workbook: string[] = [];

  // XML header
  workbook.push('<?xml version="1.0" encoding="UTF-8"?>');
  workbook.push('<?mso-application progid="Excel.Sheet"?>');
  workbook.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
  workbook.push('          xmlns:o="urn:schemas-microsoft-com:office:office"');
  workbook.push('          xmlns:x="urn:schemas-microsoft-com:office:excel"');
  workbook.push('          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
  workbook.push('  <Styles>');
  workbook.push('    <Style ss:ID="header">');
  workbook.push('      <Font ss:Bold="1"/>');
  workbook.push('      <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/>');
  workbook.push('    </Style>');
  workbook.push('  </Styles>');

  // Add metadata sheet if enabled
  if (config.includeMetadata) {
    workbook.push('  <Worksheet ss:Name="Metadata">');
    workbook.push('    <Table>');
    workbook.push(
      '      <Row><Cell><Data ss:Type="String">Oracle Market Data Export</Data></Cell></Row>'
    );
    workbook.push(
      `      <Row><Cell><Data ss:Type="String">Generated: ${new Date().toISOString()}</Data></Cell></Row>`
    );
    workbook.push(
      `      <Row><Cell><Data ss:Type="String">Time Range: ${config.timeRange}</Data></Cell></Row>`
    );
    workbook.push('    </Table>');
    workbook.push('  </Worksheet>');
  }

  // Export each data type as a worksheet
  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    const sheetName = group.label.substring(0, 31); // Excel sheet name max length
    workbook.push(`  <Worksheet ss:Name="${escapeXml(sheetName)}">`);
    workbook.push('    <Table>');

    // Header row
    workbook.push('      <Row>');
    selectedFields.forEach((field) => {
      workbook.push(
        `        <Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
      );
    });
    workbook.push('      </Row>');

    // Data rows
    const rows = getDataRows(dataType, data, selectedFields);
    rows.forEach((row) => {
      workbook.push('      <Row>');
      selectedFields.forEach((field) => {
        const value = row[field.key];
        const type = field.dataType === 'number' ? 'Number' : 'String';
        const cellValue = value === null || value === undefined ? '' : escapeXml(String(value));
        workbook.push(`        <Cell><Data ss:Type="${type}">${cellValue}</Data></Cell>`);
      });
      workbook.push('      </Row>');
    });

    workbook.push('    </Table>');
    workbook.push('  </Worksheet>');
  });

  workbook.push('</Workbook>');

  return new Blob([workbook.join('\n')], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 获取数据行
 */
function getDataRows(
  dataType: ExportDataType,
  data: ExportDataOptions,
  fields: { key: string }[]
): Record<string, unknown>[] {
  switch (dataType) {
    case 'oracleMarket':
      return data.oracleData.map((item) => ({
        name: item.name,
        share: item.share,
        tvs: item.tvs,
        tvsValue: item.tvsValue,
        chains: item.chains,
        protocols: item.protocols,
        avgLatency: item.avgLatency,
        accuracy: item.accuracy,
        updateFrequency: item.updateFrequency,
        change24h: item.change24h,
        change7d: item.change7d,
        change30d: item.change30d,
      }));

    case 'assets':
      return data.assets.map((item) => ({
        symbol: item.symbol,
        price: item.price,
        change24h: item.change24h,
        change7d: item.change7d,
        volume24h: item.volume24h,
        marketCap: item.marketCap,
        primaryOracle: item.primaryOracle,
        oracleCount: item.oracleCount,
      }));

    case 'trendData':
      return data.trendData.map((item) => ({
        timestamp: item.timestamp,
        date: item.date,
        chainlink: item.chainlink,
        pyth: item.pyth,
        band: item.band,
        api3: item.api3,
        uma: item.uma,
        total: item.total,
      }));

    case 'chainBreakdown':
      return (data.chainBreakdown || []).map((item) => ({
        chainId: item.chainId,
        chainName: item.chainName,
        tvs: item.tvs,
        tvsFormatted: item.tvsFormatted,
        share: item.share,
        protocols: item.protocols,
        change24h: item.change24h,
        change7d: item.change7d,
        topOracle: item.topOracle,
        topOracleShare: item.topOracleShare,
      }));

    case 'protocolDetails':
      return (data.protocolDetails || []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        tvl: item.tvl,
        tvlFormatted: item.tvlFormatted,
        chains: item.chains.join(', '),
        primaryOracle: item.primaryOracle,
        oracleCount: item.oracleCount,
        change24h: item.change24h,
        change7d: item.change7d,
      }));

    case 'riskMetrics':
      if (!data.riskMetrics) return [];
      return [
        {
          'hhi.value': data.riskMetrics.hhi.value,
          'hhi.level': data.riskMetrics.hhi.level,
          'hhi.concentrationRatio': data.riskMetrics.hhi.concentrationRatio,
          'diversification.score': data.riskMetrics.diversification.score,
          'diversification.level': data.riskMetrics.diversification.level,
          'diversification.factors.chainDiversity':
            data.riskMetrics.diversification.factors.chainDiversity,
          'diversification.factors.protocolDiversity':
            data.riskMetrics.diversification.factors.protocolDiversity,
          'diversification.factors.assetDiversity':
            data.riskMetrics.diversification.factors.assetDiversity,
          'volatility.index': data.riskMetrics.volatility.index,
          'volatility.level': data.riskMetrics.volatility.level,
          'volatility.annualizedVolatility': data.riskMetrics.volatility.annualizedVolatility,
          'correlationRisk.score': data.riskMetrics.correlationRisk.score,
          'correlationRisk.level': data.riskMetrics.correlationRisk.level,
          'correlationRisk.avgCorrelation': data.riskMetrics.correlationRisk.avgCorrelation,
          'overallRisk.score': data.riskMetrics.overallRisk.score,
          'overallRisk.level': data.riskMetrics.overallRisk.level,
        },
      ];

    case 'anomalies':
      return (data.anomalies || []).map((item) => ({
        id: item.id,
        type: item.type,
        level: item.level,
        title: item.title,
        description: item.description,
        timestamp: item.timestamp,
        asset: item.asset,
        oracle: item.oracle,
        value: item.value,
        expectedValue: item.expectedValue,
        deviation: item.deviation,
        duration: item.duration,
        acknowledged: item.acknowledged,
      }));

    default:
      return [];
  }
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 触发文件下载
 */
export function downloadExport(content: string | Blob, fileName: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  logger.info(`Downloaded file: ${fileName}`);
}
