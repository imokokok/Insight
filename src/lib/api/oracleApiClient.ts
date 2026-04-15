/**
 * Oracle API Client
 * 通过 API 路由获取预言机数据，避免浏览器端 CORS 问题
 */

import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import {
  validatePriceData,
  validatePriceDataArray,
  OracleDataValidationError,
} from './validation/oracleDataValidation';

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
const REQUEST_TIMEOUT_MS = 15_000;

function createAbortControllerWithTimeout(signal?: AbortSignal): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function fetchPriceFromApi({
  provider,
  symbol,
  chain,
  signal: externalSignal,
}: FetchPriceParams & { signal?: AbortSignal }): Promise<PriceData> {
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching price from API: ${url.toString()}`);

  const { controller, cleanup } = createAbortControllerWithTimeout(externalSignal);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use text as is
      }
      logger.error('[oracleApiClient] API error:', undefined, {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        errorData,
        errorText,
      });
      const errorMessage =
        errorData && typeof errorData === 'object' && 'message' in errorData
          ? String((errorData as { message: unknown }).message)
          : 'Unknown error';
      throw new Error(
        errorMessage || `Failed to fetch price: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      const errMsg =
        data.error && typeof data.error === 'object' && 'message' in data.error
          ? String((data.error as { message: unknown }).message)
          : 'Unknown error from API';
      throw new Error(errMsg);
    }

    try {
      return validatePriceData(data);
    } catch (validationError) {
      if (validationError instanceof OracleDataValidationError) {
        logger.error('[oracleApiClient] Price data validation failed:', undefined, {
          missingFields: validationError.missingFields,
          rawData: validationError.rawData,
        });
      }
      throw validationError;
    }
  } finally {
    cleanup();
  }
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
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('period', period.toString());
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching historical prices from API: ${url.toString()}`);

  const { controller, cleanup } = createAbortControllerWithTimeout();

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use text as is
      }
      logger.error('[oracleApiClient] Historical API error:', undefined, {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        errorData,
        errorText,
      });
      const errorMessage =
        errorData && typeof errorData === 'object' && 'message' in errorData
          ? String((errorData as { message: unknown }).message)
          : 'Unknown error';
      throw new Error(
        errorMessage ||
          `Failed to fetch historical prices: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      const errMsg =
        data.error && typeof data.error === 'object' && 'message' in data.error
          ? String((data.error as { message: unknown }).message)
          : 'Unknown error from API';
      throw new Error(errMsg);
    }

    try {
      return validatePriceDataArray(data);
    } catch (validationError) {
      if (validationError instanceof OracleDataValidationError) {
        logger.error('[oracleApiClient] Historical price data validation failed:', undefined, {
          missingFields: validationError.missingFields,
          rawData: validationError.rawData,
        });
      }
      throw validationError;
    }
  } finally {
    cleanup();
  }
}

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
};
