'use client';

import type { OracleClientFactory } from '@/lib/oracles';
import type { BaseOracleClient } from '@/lib/oracles/base';
import { type Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import type { QueryResult } from '../constants';

export interface QueryTask {
  provider: OracleProvider;
  chain: Blockchain;
  client: BaseOracleClient;
  timeRange: number;
  isCompare: boolean;
}

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Request was aborted'));
      return;
    }

    const timer = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Request was aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    promise
      .then((result) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
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
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = { status: 'fulfilled', value: await handler(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

interface QueryTaskResult {
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
  oracleClientFactory: OracleClientFactory
): { primaryTasks: QueryTask[]; compareTasks: QueryTask[]; totalQueries: number } {
  const primaryTasks: QueryTask[] = [];
  const compareTasks: QueryTask[] = [];
  let totalQueries = 0;

  const allProviders = selectedOracle ? [selectedOracle] : Object.values(OracleProvider);

  for (const provider of allProviders) {
    let client: BaseOracleClient;
    try {
      client = oracleClientFactory.getClient(provider);
    } catch {
      continue;
    }

    if (!client.isSymbolSupported(selectedSymbol)) {
      continue;
    }

    const chains = selectedChain ? [selectedChain] : client.supportedChains;

    for (const chain of chains) {
      if (!client.supportedChains.includes(chain)) {
        continue;
      }

      totalQueries++;

      primaryTasks.push({
        provider,
        chain,
        client,
        timeRange: selectedTimeRange,
        isCompare: false,
      });

      if (isCompareMode) {
        compareTasks.push({
          provider,
          chain,
          client,
          timeRange: compareTimeRange,
          isCompare: true,
        });
      }
    }
  }

  return { primaryTasks, compareTasks, totalQueries };
}

interface ProcessedQueryResults {
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
