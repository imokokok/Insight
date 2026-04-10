/**
 * Oracle API Client
 * 通过 API 路由获取预言机数据，避免浏览器端 CORS 问题
 */

import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('OracleApiClient');

export interface FetchPriceParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

export interface FetchHistoricalParams extends FetchPriceParams {
  period: number;
}

/**
 * 从 API 路由获取价格数据
 */
export async function fetchPriceFromApi({
  provider,
  symbol,
  chain,
}: FetchPriceParams): Promise<PriceData> {
  const url = new URL(`/api/oracles/${provider}`, window.location.origin);
  url.searchParams.set('symbol', symbol);
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching price from API: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorData = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON, use text as is
    }
    console.error('[oracleApiClient] API error:', {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
      errorData,
      errorText,
    });
    throw new Error(
      (errorData as { message?: string }).message ||
        `Failed to fetch price: ${response.status} ${response.statusText}`
    );
  }

  // API 路由直接返回 PriceData 对象，不是 { data: PriceData } 格式
  const data = await response.json();

  // 检查是否是错误响应格式
  if (data.error) {
    throw new Error(data.error.message || 'Unknown error from API');
  }

  // 直接返回数据，因为 API 路由返回的就是 PriceData 本身
  return data as PriceData;
}

/**
 * 从 API 路由获取历史价格数据
 */
export async function fetchHistoricalFromApi({
  provider,
  symbol,
  chain,
  period,
}: FetchHistoricalParams): Promise<PriceData[]> {
  const url = new URL(`/api/oracles/${provider}`, window.location.origin);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('period', period.toString());
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching historical prices from API: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorData = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON, use text as is
    }
    console.error('[oracleApiClient] Historical API error:', {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
      errorData,
      errorText,
    });
    throw new Error(
      (errorData as { message?: string }).message ||
        `Failed to fetch historical prices: ${response.status} ${response.statusText}`
    );
  }

  // API 路由直接返回 PriceData[] 数组，不是 { data: PriceData[] } 格式
  const data = await response.json();

  // 检查是否是错误响应格式
  if (data.error) {
    throw new Error(data.error.message || 'Unknown error from API');
  }

  // 直接返回数据，因为 API 路由返回的就是 PriceData[] 本身
  return data as PriceData[];
}

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
};
