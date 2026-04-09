'use client';

import { useMemo } from 'react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { useTranslations } from '@/i18n';
import { type PriceData, OracleProvider, Blockchain } from '@/types/oracle';

interface DataSourcePanelProps {
  priceData: PriceData[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
}

// Map oracle provider to credibility level
function getCredibilityLevel(provider: OracleProvider): 'high' | 'medium' | 'low' | 'unverified' {
  const highCredibility: OracleProvider[] = [OracleProvider.CHAINLINK, OracleProvider.PYTH];
  const mediumCredibility: OracleProvider[] = [
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
  ];

  if (highCredibility.includes(provider)) return 'high';
  if (mediumCredibility.includes(provider)) return 'medium';
  return 'low';
}

// Extract blockchain from price data source or default to ethereum
function getBlockchainFromPriceData(priceData: PriceData): Blockchain {
  if (priceData.chain) return priceData.chain;

  // Try to extract from source string
  if (priceData.source) {
    const sourceLower = priceData.source.toLowerCase();
    if (sourceLower.includes('ethereum')) return Blockchain.ETHEREUM;
    if (sourceLower.includes('arbitrum')) return Blockchain.ARBITRUM;
    if (sourceLower.includes('optimism')) return Blockchain.OPTIMISM;
    if (sourceLower.includes('polygon')) return Blockchain.POLYGON;
    if (sourceLower.includes('base')) return Blockchain.BASE;
    if (sourceLower.includes('avalanche')) return Blockchain.AVALANCHE;
    if (sourceLower.includes('solana')) return Blockchain.SOLANA;
  }

  return Blockchain.ETHEREUM;
}

// Calculate confidence based on price data
function calculateConfidence(priceData: PriceData): number {
  let confidence = 0.7;

  if (priceData.confidence !== undefined) {
    confidence = priceData.confidence;
  }

  // Adjust based on data freshness
  const age = Date.now() - priceData.timestamp;
  if (age < 60000) confidence += 0.1;
  else if (age > 300000) confidence -= 0.1;

  return Math.max(0, Math.min(1, confidence));
}

export function DataSourcePanel({
  priceData,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
}: DataSourcePanelProps) {
  const t = useTranslations();

  const dataSources: DataSourceGroup[] = useMemo(() => {
    return priceData.map((data) => ({
      provider: data.provider,
      chain: getBlockchainFromPriceData(data),
      confidence: calculateConfidence(data),
      source: data.source,
      credibilityLevel: getCredibilityLevel(data.provider),
      lastUpdated: data.timestamp,
    }));
  }, [priceData]);

  if (priceData.length === 0) {
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
        title={t('crossOracle.dataSources.title')}
        className="shadow-sm"
        showUpdateTime
        initiallyExpanded={false}
        maxVisible={6}
      />
    </div>
  );
}

export default DataSourcePanel;
