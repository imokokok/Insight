'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import { Database, Layers, ShieldCheck } from 'lucide-react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { DataUpdateTime } from '@/components/data-transparency/DataUpdateTime';
import { useReputations } from '@/hooks/data/useReputations';
import { providerNames, chainNames } from '@/lib/constants';
import {
  getCredibilityFromScore,
  getCredibilityFromVerification,
  type CredibilityLevel,
} from '@/lib/oracles/utils/reputationUtils';
import { formatRelativeTime } from '@/lib/utils/format';
import { OracleProvider, Blockchain, type OnChainVerification } from '@/types/oracle';

interface CrossChainDataPoint {
  chain: Blockchain;
  price: number;
  timestamp: number;
  source?: string;
  confidence?: number;
  confidenceSource?: 'original' | 'estimated' | 'calculated';
  provider?: OracleProvider;
  verification?: OnChainVerification;
  metadataFallback?: boolean;
}

interface DataSourceSectionProps {
  dataPoints: CrossChainDataPoint[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
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

function getCredibilityLevel(
  _provider: OracleProvider,
  reputationScore: number | undefined,
  hasOnChainVerification: boolean,
  confidence: number
): CredibilityLevel {
  if (reputationScore !== undefined && reputationScore > 0) {
    return getCredibilityFromScore(reputationScore).level;
  }
  return getCredibilityFromVerification(hasOnChainVerification, confidence).level;
}

export function DataSourceSection({
  dataPoints,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
}: DataSourceSectionProps) {
  const { data: reputationsData } = useReputations();

  const reputationMap = useMemo(() => {
    const map = new Map<OracleProvider, number>();
    reputationsData?.data.forEach((r) => {
      map.set(r.provider, r.overall_score);
    });
    return map;
  }, [reputationsData]);

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

      const reputationScore = reputationMap.get(provider);
      const hasOnChainVerification = point.verification?.type === 'on-chain';
      const confidence = point.confidence ?? 0;

      return {
        provider,
        chain: point.chain,
        confidence: point.confidence,
        confidenceSource: point.confidenceSource,
        source: point.source,
        credibilityLevel: getCredibilityLevel(
          provider,
          reputationScore,
          hasOnChainVerification,
          confidence
        ),
        lastUpdated: point.timestamp,
        verification: point.verification,
        metadataFallback: point.metadataFallback,
      };
    });

    const avgConf = validConfidenceCount > 0 ? totalConfidence / validConfidenceCount : undefined;

    return {
      uniqueProviders: providers,
      avgConfidence: avgConf,
      dataSources: sources,
    };
  }, [dataPoints, reputationMap]);

  if (dataPoints.length === 0) {
    return null;
  }

  if (uniqueProviders.size === 1) {
    const provider = Array.from(uniqueProviders)[0];
    const providerName = providerNames[provider];
    const logoPath = `/logos/oracles/${provider}.svg`;
    const reputationScore = reputationMap.get(provider);
    const hasOnChainVerification = dataPoints.some((p) => p.verification?.type === 'on-chain');
    const avgConf = avgConfidence ?? 0;
    const credibility = getCredibilityLevel(
      provider,
      reputationScore,
      hasOnChainVerification,
      avgConf
    );

    const credibilityConfig = {
      high: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'High' },
      medium: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Medium' },
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
                  {point.verification?.explorerUrl && (
                    <a
                      href={point.verification.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-green-600 hover:text-green-700 hover:underline mt-0.5"
                    >
                      <svg
                        className="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Verified
                    </a>
                  )}
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
