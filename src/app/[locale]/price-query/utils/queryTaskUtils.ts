'use client';

import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

import type { QueryResult } from '../constants';

export interface QueryTask {
  provider: OracleProvider;
  chain: Blockchain;
  client: ReturnType<typeof import('@/lib/oracles').OracleClientFactory.getClient>;
  timeRange: number;
  isCompare: boolean;
}

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function limitConcurrency<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  maxConcurrent: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i;

    // 创建执行promise，但不立即启动
    const executePromise = async (): Promise<void> => {
      try {
        const result = await handler(item);
        results[index] = { status: 'fulfilled', value: result };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    };

    // 启动执行
    const promise = executePromise();

    const wrapped = promise.then(() => {
      const idx = executing.indexOf(wrapped);
      if (idx > -1) executing.splice(idx, 1);
    });
    executing.push(wrapped);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export interface QueryTaskResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
  history: PriceData[];
  isCompare: boolean;
}

export function buildQueryTasks(
  selectedOracle: OracleProvider | null,
  selectedChain: Blockchain | null,
  selectedSymbol: string,
  selectedTimeRange: number,
  isCompareMode: boolean,
  compareTimeRange: number,
  OracleClientFactory: typeof import('@/lib/oracles').OracleClientFactory
): { primaryTasks: QueryTask[]; compareTasks: QueryTask[]; totalQueries: number } {
  const primaryTasks: QueryTask[] = [];
  const compareTasks: QueryTask[] = [];
  let totalQueries = 0;

  if (selectedOracle && selectedChain) {
    const client = OracleClientFactory.getClient(selectedOracle);
    const supportedChains = client.supportedChains;

    if (supportedChains.includes(selectedChain)) {
      totalQueries = 1;

      primaryTasks.push({
        provider: selectedOracle,
        chain: selectedChain,
        client,
        timeRange: selectedTimeRange,
        isCompare: false,
      });

      if (isCompareMode) {
        compareTasks.push({
          provider: selectedOracle,
          chain: selectedChain,
          client,
          timeRange: compareTimeRange,
          isCompare: true,
        });
      }
    }
  }

  return { primaryTasks, compareTasks, totalQueries };
}

export interface ProcessedQueryResults {
  results: QueryResult[];
  histories: Partial<Record<string, PriceData[]>>;
  compareResults: QueryResult[];
  compareHistories: Partial<Record<string, PriceData[]>>;
  collectedErrors: QueryError[];
}

export function processQueryResults(
  taskResults: PromiseSettledResult<QueryTaskResult>[],
  allTasks: QueryTask[]
): ProcessedQueryResults {
  const results: QueryResult[] = [];
  const histories: Partial<Record<string, PriceData[]>> = {};
  const compareResults: QueryResult[] = [];
  const compareHistories: Partial<Record<string, PriceData[]>> = {};
  const collectedErrors: QueryError[] = [];

  for (let i = 0; i < taskResults.length; i++) {
    const settledResult = taskResults[i];
    if (settledResult.status === 'fulfilled') {
      const { provider, chain, priceData, history, isCompare } = settledResult.value;
      const key = `${provider}-${chain}`;

      if (isCompare) {
        compareResults.push({ provider, chain, priceData });
        compareHistories[key] = history;
      } else {
        results.push({ provider, chain, priceData });
        histories[key] = history;
      }
    } else {
      const task = allTasks[i];
      if (task) {
        const errorMessage =
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : String(settledResult.reason);
        collectedErrors.push({
          provider: task.provider,
          chain: task.chain,
          error: errorMessage,
        });
      }
    }
  }

  return { results, histories, compareResults, compareHistories, collectedErrors };
}
