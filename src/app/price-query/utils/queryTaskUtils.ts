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
): { primaryTasks: QueryTask[]; compareTasks: QueryTask[]; totalQueries: number } {
  const primaryTasks: QueryTask[] = [];
  const compareTasks: QueryTask[] = [];

  const allProviders = Object.values(OracleProvider);

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

    if (selectedOracle && selectedChain) {
      if (provider === selectedOracle) {
        if (client.supportedChains.includes(selectedChain)) {
          primaryTasks.push({
            provider,
            chain: selectedChain,
            client,
            isCompare: false,
          });
        }
      } else if (isCompareMode) {
        if (client.supportedChains.includes(selectedChain)) {
          compareTasks.push({
            provider,
            chain: selectedChain,
            client,
            isCompare: true,
          });
        }
      }
    } else if (selectedOracle && !selectedChain) {
      // 当选择了预言机但未选择链时，不自动查询所有链
      // 引导用户选择具体的链
      // 不添加任何任务，返回空列表
    } else if (!selectedOracle && selectedChain) {
      if (client.supportedChains.includes(selectedChain)) {
        primaryTasks.push({
          provider,
          chain: selectedChain,
          client,
          isCompare: false,
        });
      }
      if (isCompareMode) {
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
    } else {
      for (const chain of client.supportedChains) {
        if (client.isSymbolSupported(selectedSymbol, chain)) {
          primaryTasks.push({
            provider,
            chain,
            client,
            isCompare: false,
          });
        }
      }
    }
  }

  const totalQueries = primaryTasks.length + compareTasks.length;

  return { primaryTasks, compareTasks, totalQueries };
}
