'use client';

import type { OracleClientFactory } from '@/lib/oracles';
import type { BaseOracleClient } from '@/lib/oracles/base';
import { type Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import type { QueryResult } from '../constants';

interface QueryTask {
  provider: OracleProvider;
  chain: Blockchain;
  client: BaseOracleClient;
  isCompare: boolean;
}

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

interface QueryTaskResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
  isCompare: boolean;
}

export function buildQueryTasks(
  selectedOracle: OracleProvider | null,
  selectedChain: Blockchain | null,
  selectedSymbol: string,
  isCompareMode: boolean,
  oracleClientFactory: OracleClientFactory
): { primaryTasks: QueryTask[]; compareTasks: QueryTask[]; totalQueries: number } {
  const primaryTasks: QueryTask[] = [];
  const compareTasks: QueryTask[] = [];

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

      primaryTasks.push({
        provider,
        chain,
        client,
        isCompare: false,
      });
    }

    if (isCompareMode && selectedChain) {
      const otherChains = client.supportedChains.filter((c) => c !== selectedChain);
      for (const chain of otherChains) {
        if (client.isSymbolSupported(selectedSymbol, chain)) {
          compareTasks.push({
            provider,
            chain,
            client,
            isCompare: true,
          });
        }
      }
    }
  }

  const totalQueries = primaryTasks.length + compareTasks.length;

  return { primaryTasks, compareTasks, totalQueries };
}
