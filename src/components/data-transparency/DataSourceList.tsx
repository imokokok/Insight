'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Database, Layers } from 'lucide-react';

import { type OracleProvider, type Blockchain } from '@/types/oracle';

import {
  DataSourceIndicator,
  type DataSourceInfo,
  type CredibilityLevel,
} from './DataSourceIndicator';
import { DataUpdateTime } from './DataUpdateTime';

export interface DataSourceGroup {
  provider: OracleProvider;
  chain: Blockchain;
  confidence?: number;
  source?: string;
  credibilityLevel?: CredibilityLevel;
  lastUpdated?: number;
  verificationProof?: string;
}

interface DataSourceListProps {
  sources: DataSourceGroup[];
  lastUpdated?: Date | null;
  refreshInterval?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  title?: string;
  className?: string;
  showUpdateTime?: boolean;
  initiallyExpanded?: boolean;
  maxVisible?: number;
}

export function DataSourceList({
  sources,
  lastUpdated,
  refreshInterval = 60000,
  onRefresh,
  isLoading = false,
  error = null,
  title,
  className = '',
  showUpdateTime = true,
  initiallyExpanded = true,
  maxVisible = 5,
}: DataSourceListProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [showAll, setShowAll] = useState(false);

  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex((s) => s.provider === source.provider && s.chain === source.chain)
  );

  const visibleSources = showAll ? uniqueSources : uniqueSources.slice(0, maxVisible);
  const hasMore = uniqueSources.length > maxVisible;

  const providerCount = new Set(sources.map((s) => s.provider)).size;
  const chainCount = new Set(sources.map((s) => s.chain)).size;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Database size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title || 'Data Sources'}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {providerCount} Providers
              </span>
              <span>•</span>
              <span>{chainCount} Chains</span>
              <span>•</span>
              <span>{sources.length} Data Points</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showUpdateTime && (
            <DataUpdateTime
              lastUpdated={lastUpdated || null}
              refreshInterval={refreshInterval}
              onRefresh={onRefresh}
              isLoading={isLoading}
              error={error}
              variant="compact"
              showCountdown={false}
            />
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            {visibleSources.map((source, index) => {
              const dataSourceInfo: DataSourceInfo = {
                provider: source.provider,
                chain: source.chain,
                confidence: source.confidence,
                source: source.source,
                credibilityLevel: source.credibilityLevel,
                lastUpdated: source.lastUpdated,
                verificationProof: source.verificationProof,
              };

              return (
                <DataSourceIndicator
                  key={`${source.provider}-${source.chain}-${index}`}
                  source={dataSourceInfo}
                  variant="compact"
                  size="sm"
                  showConfidence
                  showChain
                />
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
            >
              {showAll ? 'Show Less' : `Show ${uniqueSources.length - maxVisible} more`}
            </button>
          )}

          {sources.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Database size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No data sources available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataSourceList;
