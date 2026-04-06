import { createLogger } from '@/lib/utils/logger';

import type { DataSource, OracleScript, OracleRequestInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandOracle');

interface OracleScriptResult {
  oracle_scripts: Array<{
    id: string;
    owner: string;
    name: string;
    description: string;
    filename: string;
    schema: string;
    codehash: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface OracleRequestsResult {
  requests: Array<{
    id: string;
    oracle_script_id: string;
    calldata: string;
    ask_count: string;
    min_count: string;
    request_height: string;
    request_time: string;
    resolve_height: string;
    resolve_time: string;
    result: string;
    status: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export async function getDataSources(
  makeRestCall: RestCallFunction,
  limit: number = 100
): Promise<DataSource[]> {
  try {
    const result = await makeRestCall<{
      price_feeds: Array<{
        symbol: string;
        price: string;
        timestamp: string;
      }>;
    }>(`/band/oracle/v1/price_feeds/BTC:USD`);

    if (!result.price_feeds || result.price_feeds.length === 0) {
      return [];
    }

    return result.price_feeds.slice(0, limit).map((feed, index) => ({
      id: index + 1,
      name: feed.symbol,
      symbol: feed.symbol.replace(/\//g, '_').toUpperCase(),
      description: `${feed.symbol} price feed`,
      owner: '',
      provider: 'Band Protocol',
      status: 'active',
      lastUpdated: parseInt(feed.timestamp, 10) || Date.now(),
      reliability: 0,
      category: 'crypto',
      updateFrequency: '30s',
      deviationThreshold: '0.5%',
      totalRequests: 0,
    }));
  } catch (error) {
    logger.warn(
      'Oracle data sources endpoint not available, returning empty array',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getDataSourceById(
  makeRestCall: RestCallFunction,
  id: number
): Promise<DataSource | null> {
  try {
    const result = await makeRestCall<{
      data_source: {
        id: string;
        name: string;
        description: string;
        owner: string;
      };
    }>(`/oracle/v1/data_sources/${id}`);

    if (!result.data_source) {
      return null;
    }

    return {
      id: parseInt(result.data_source.id, 10),
      name: result.data_source.name,
      symbol: result.data_source.name.replace(/\s+/g, '_').toUpperCase(),
      description: result.data_source.description || `${result.data_source.name} data source`,
      owner: result.data_source.owner,
      provider: 'Band Protocol',
      status: 'active',
      lastUpdated: Date.now(),
      reliability: 0,
      category: 'crypto',
      updateFrequency: '30s',
      deviationThreshold: '0.5%',
      totalRequests: 0,
    };
  } catch (error) {
    logger.warn(
      'Oracle data source by id endpoint not available, returning null',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getOracleScripts(
  makeRestCall: RestCallFunction,
  limit: number = 100
): Promise<OracleScript[]> {
  try {
    const result = await makeRestCall<OracleScriptResult>(
      `/oracle/v1/oracle_scripts?pagination.limit=${limit}`
    );

    return result.oracle_scripts.map((script) => ({
      id: parseInt(script.id, 10),
      name: script.name,
      description: script.description || `${script.name} oracle script`,
      owner: script.owner,
      schema: script.schema || '{"input": "string", "output": "string"}',
      code: `// Oracle Script: ${script.name}\n// Code hash: ${script.codehash}`,
      callCount: 0,
      successRate: 0,
      avgResponseTime: 0,
      category: 'price',
      lastUpdated: Date.now(),
    }));
  } catch (error) {
    logger.warn(
      'Oracle scripts endpoint not available, returning empty array',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getOracleRequests(
  makeRestCall: RestCallFunction,
  limit: number = 100,
  status?: string
): Promise<OracleRequestInfo[]> {
  try {
    let endpoint = `/oracle/v1/requests?pagination.limit=${limit}`;
    if (status) {
      endpoint += `&status=${status}`;
    }

    const result = await makeRestCall<OracleRequestsResult>(endpoint);

    return result.requests.map((req) => ({
      id: parseInt(req.id, 10),
      oracleScriptId: parseInt(req.oracle_script_id, 10),
      calldata: req.calldata,
      askCount: parseInt(req.ask_count, 10),
      minCount: parseInt(req.min_count, 10),
      requestHeight: parseInt(req.request_height, 10),
      requestTime: req.request_time,
      resolveHeight: parseInt(req.resolve_height, 10),
      resolveTime: req.resolve_time,
      result: req.result,
      status: req.status,
    }));
  } catch (error) {
    logger.error(
      'Failed to get oracle requests',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
