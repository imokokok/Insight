'use client';

import type { OracleClientFactory } from '@/lib/oracles';
import type { BaseOracleClient } from '@/lib/oracles/base';
import { type Blockchain, OracleProvider } from '@/types/oracle';

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

export function buildQueryTasks(
  selectedOracle: OracleProvider | null,
  selectedChain: Blockchain | null,
  selectedSymbol: string,
  isCompareMode: boolean,
  oracleClientFactory: OracleClientFactory
): {
  primaryTasks: QueryTask[];
  compareTasks: QueryTask[];
  totalQueries: number;
  needsChainSelection?: boolean;
} {
  const primaryTasks: QueryTask[] = [];
  const compareTasks: QueryTask[] = [];

  const allProviders = selectedOracle ? [selectedOracle] : Object.values(OracleProvider);

  if (selectedOracle && !selectedChain) {
    return { primaryTasks, compareTasks, totalQueries: 0, needsChainSelection: true as const };
  }

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
