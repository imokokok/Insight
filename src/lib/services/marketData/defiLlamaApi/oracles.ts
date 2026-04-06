import { ORACLE_COLORS } from '@/app/[locale]/market-overview/constants';
import { chartColors } from '@/lib/config/colors';
import { performanceMetricsCalculator } from '@/lib/services/marketData/performanceMetrics';

import { DEFILLAMA_API_BASE, fetchWithRetry, fetchWithTimeout, logger } from './client';
import {
  MarketDataError,
  type DefiLlamaOracleResponse,
  type DefiLlamaProtocol,
  type OracleMarketData,
} from './types';

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
