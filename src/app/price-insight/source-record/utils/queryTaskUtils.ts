import {
  getOracleChains,
  isOracleSymbolSupported,
  type OracleMetadata,
} from '@/lib/oracles/metadata';
import { type Blockchain, OracleProvider } from '@/types/oracle';

interface QueryTask {
  provider: OracleProvider;
  chain: Blockchain;
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
  metadata: OracleMetadata
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
    if (!isOracleSymbolSupported(metadata, provider, selectedSymbol)) {
      continue;
    }

    const supportedChains = getOracleChains(metadata, provider);
    const chains = selectedChain ? [selectedChain] : supportedChains;

    for (const chain of chains) {
      if (!isOracleSymbolSupported(metadata, provider, selectedSymbol, chain)) {
        continue;
      }

      primaryTasks.push({
        provider,
        chain,
        isCompare: false,
      });
    }

    if (isCompareMode && selectedChain) {
      const otherChains = supportedChains.filter((c) => c !== selectedChain);
      for (const chain of otherChains) {
        if (isOracleSymbolSupported(metadata, provider, selectedSymbol, chain)) {
          compareTasks.push({
            provider,
            chain,
            isCompare: true,
          });
        }
      }
    }
  }

  const totalQueries = primaryTasks.length + compareTasks.length;

  return { primaryTasks, compareTasks, totalQueries };
}
