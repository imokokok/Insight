'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import { Database, Layers, ShieldCheck, RefreshCw } from 'lucide-react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { DataUpdateTime } from '@/components/data-transparency/DataUpdateTime';
import { providerNames, chainNames } from '@/lib/constants';
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

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DataSourceSection({
  dataPoints,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
}: DataSourceSectionProps) {
  const { uniqueProviders, avgConfidence, dataSources } = useMemo(() => {
    const providers = new Set<OracleProvider>();
    let totalConfidence = 0;
    let validConfidenceCount = 0;

    const sources: DataSourceGroup[] = dataPoints.map((point) => {
      const provider = point.provider || getProviderForChain(point.chain);
      providers.add(provider);

      if (point.confidence !== undefined && point.confidence !== null) {
        totalConfidence += point.confidence;
        validConfidenceCount++;
      }

      return {
        provider,
        chain: point.chain,
        confidence: point.confidence,
        source: point.source,
        credibilityLevel: getCredibilityLevel(provider),
        lastUpdated: point.timestamp,
      };
    });

    const avgConf = validConfidenceCount > 0 ? totalConfidence / validConfidenceCount : undefined;

    return {
      uniqueProviders: providers,
      avgConfidence: avgConf,
      dataSources: sources,
    };
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return null;
  }

  if (uniqueProviders.size === 1) {
    const provider = Array.from(uniqueProviders)[0];
    const providerName = providerNames[provider];
    const logoPath = `/logos/oracles/${provider}.svg`;
    const credibility = getCredibilityLevel(provider);

    const credibilityConfig = {
      high: { color: 'text-success-600', bgColor: 'bg-success-50', label: 'High' },
      medium: { color: 'text-primary-600', bgColor: 'bg-primary-50', label: 'Medium' },
      low: { color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Low' },
      unverified: { color: 'text-gray-500', bgColor: 'bg-gray-50', label: 'Unverified' },
    };

    const credConfig = credibilityConfig[credibility];

    const sortedDataPoints = [...dataPoints].sort((a, b) => {
      const chainNameA = chainNames[a.chain] || a.chain;
      const chainNameB = chainNames[b.chain] || b.chain;
      return chainNameA.localeCompare(chainNameB);
    });

    return (
      <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Database size={18} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Data Source</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Layers size={12} />
                  {dataPoints.length} Chains
                </span>
                {avgConfidence !== undefined && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} />
                      {(avgConfidence * 100).toFixed(1)}% Avg Confidence
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DataUpdateTime
            lastUpdated={lastUpdated || null}
            onRefresh={onRefresh}
            isLoading={isLoading}
            error={error}
            variant="compact"
            showCountdown={false}
          />
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src={logoPath}
              alt={providerName}
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-medium text-gray-900">{providerName}</span>
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${credConfig.bgColor} border border-current`}
            >
              <ShieldCheck size={12} className={credConfig.color} />
              <span className={`${credConfig.color} text-xs font-medium`}>{credConfig.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {sortedDataPoints.map((point, index) => {
              const chainName = chainNames[point.chain] || point.chain;
              const hasRealConfidence = point.confidence !== undefined && point.confidence !== null;

              return (
                <div
                  key={`${point.chain}-${index}`}
                  className="flex flex-col p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-xs font-medium text-gray-900 truncate">{chainName}</span>
                  <div className="flex items-center gap-1 mt-1">
                    {hasRealConfidence && (
                      <span className="text-xs text-gray-500">
                        {(point.confidence! * 100).toFixed(0)}%
                      </span>
                    )}
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(point.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
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
