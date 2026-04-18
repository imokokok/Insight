'use client';

import { useMemo } from 'react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { OracleProvider, Blockchain } from '@/types/oracle';

interface CrossChainDataPoint {
  chain: Blockchain;
  price: number;
  timestamp: number;
  source?: string;
  confidence?: number;
  provider?: OracleProvider;
}

interface DataSourceSectionProps {
  dataPoints: CrossChainDataPoint[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
}

// Map oracle provider to credibility level
function getCredibilityLevel(
  provider: OracleProvider = OracleProvider.CHAINLINK
): 'high' | 'medium' | 'low' | 'unverified' {
  const highCredibility: OracleProvider[] = [OracleProvider.CHAINLINK, OracleProvider.PYTH];
  const mediumCredibility: OracleProvider[] = [
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
    OracleProvider.FLARE,
  ];

  if (highCredibility.includes(provider)) return 'high';
  if (mediumCredibility.includes(provider)) return 'medium';
  return 'low';
}

// Get provider based on chain
function getProviderForChain(chain: Blockchain): OracleProvider {
  const providerMap: Partial<Record<Blockchain, OracleProvider>> = {
    [Blockchain.ETHEREUM]: OracleProvider.CHAINLINK,
    [Blockchain.ARBITRUM]: OracleProvider.CHAINLINK,
    [Blockchain.OPTIMISM]: OracleProvider.CHAINLINK,
    [Blockchain.POLYGON]: OracleProvider.CHAINLINK,
    [Blockchain.SOLANA]: OracleProvider.PYTH,
    [Blockchain.AVALANCHE]: OracleProvider.CHAINLINK,
    [Blockchain.BASE]: OracleProvider.CHAINLINK,
    [Blockchain.BNB_CHAIN]: OracleProvider.CHAINLINK,
    [Blockchain.TRON]: OracleProvider.WINKLINK,
    [Blockchain.NEAR]: OracleProvider.CHAINLINK,
    [Blockchain.FLARE]: OracleProvider.FLARE,
    [Blockchain.STELLAR]: OracleProvider.REFLECTOR,
  };

  return providerMap[chain] || OracleProvider.CHAINLINK;
}

export function DataSourceSection({
  dataPoints,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
}: DataSourceSectionProps) {
  const dataSources: DataSourceGroup[] = useMemo(() => {
    return dataPoints.map((point) => {
      const provider = point.provider || getProviderForChain(point.chain);

      return {
        provider,
        chain: point.chain,
        confidence: point.confidence ?? 0.75,
        source: point.source,
        credibilityLevel: getCredibilityLevel(provider),
        lastUpdated: point.timestamp,
      };
    });
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <DataSourceList
        sources={dataSources}
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        isLoading={isLoading}
        error={error}
        title="Data Sources"
        className="shadow-sm"
        showUpdateTime
        initiallyExpanded={false}
        maxVisible={6}
      />
    </div>
  );
}

export default DataSourceSection;
