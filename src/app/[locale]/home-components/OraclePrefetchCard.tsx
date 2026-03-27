'use client';

import { memo, useCallback, useMemo } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { useHoverPrefetch } from '@/hooks';
import { createLogger } from '@/lib/utils/logger';
import { STALE_TIME_CONFIG, GC_TIME_CONFIG } from '@/providers/ReactQueryProvider';

const logger = createLogger('OraclePrefetchCard');

interface OraclePrefetchCardProps {
  name: string;
  value: number;
  color: string;
  tvs: string;
  chains: number;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (name: string) => void;
  onHover: (name: string | null) => void;
}

const oracleRouteMap: Record<string, string> = {
  Chainlink: '/chainlink',
  'Pyth Network': '/pyth-network',
  'Band Protocol': '/band-protocol',
  API3: '/api3',
  UMA: '/uma',
  RedStone: '/redstone',
  DIA: '/dia',
  Tellor: '/tellor',
  Chronicle: '/chronicle',
  WINkLink: '/winklink',
};

const oracleProviderMap: Record<string, string> = {
  Chainlink: 'chainlink',
  'Pyth Network': 'pyth',
  'Band Protocol': 'band-protocol',
  API3: 'api3',
  UMA: 'uma',
  RedStone: 'redstone',
  DIA: 'dia',
  Tellor: 'tellor',
  Chronicle: 'chronicle',
  WINkLink: 'winklink',
};

const oracleSymbolMap: Record<string, string> = {
  Chainlink: 'LINK',
  'Pyth Network': 'PYTH',
  'Band Protocol': 'BAND',
  API3: 'API3',
  UMA: 'UMA',
  RedStone: 'REDSTONE',
  DIA: 'DIA',
  Tellor: 'TRB',
  Chronicle: 'CHRONICLE',
  WINkLink: 'WINKLINK',
};

function OraclePrefetchCardBase({
  name,
  value,
  color,
  tvs,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: OraclePrefetchCardProps) {
  const provider = oracleProviderMap[name];
  const route = oracleRouteMap[name];

  const prefetchConfig = useMemo(() => {
    if (!provider) return null;
    return {
      queryKey: ['oracles', 'detail', provider],
      queryFn: async () => {
        const symbol = oracleSymbolMap[name];
        if (!symbol) {
          throw new Error(`No symbol mapping found for ${name}`);
        }
        const response = await fetch(`/api/oracles/${provider}?symbol=${symbol}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to fetch ${provider} data: ${response.status}`
          );
        }
        return response.json();
      },
      staleTime: STALE_TIME_CONFIG.network,
      gcTime: GC_TIME_CONFIG.network,
    };
  }, [provider, name]);

  const { prefetch, cancelPrefetch } = useHoverPrefetch({
    delay: 200,
    enabled: !!prefetchConfig,
    onSuccess: () => {
      logger.debug(`Prefetched data for ${name}`);
    },
    onError: (error) => {
      logger.error(`Failed to prefetch ${name}`, error);
    },
  });

  const handleMouseEnter = useCallback(() => {
    onHover(name);
    if (prefetchConfig) {
      prefetch(prefetchConfig);
    }
  }, [onHover, name, prefetch, prefetchConfig]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
    cancelPrefetch();
  }, [onHover, cancelPrefetch]);

  const handleClick = useCallback(() => {
    onSelect(name);
  }, [onSelect, name]);

  const handleNavClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`px-4 py-2.5 border-b transition-colors cursor-pointer flex items-center justify-between ${
        isSelected ? '' : 'hover:bg-gray-50'
      } ${isHovered && !isHovered ? 'opacity-50' : 'opacity-100'}`}
      style={{
        borderColor: 'var(--gray-100, #f3f4f6)',
        backgroundColor: isSelected ? 'var(--gray-50, #f9fafb)' : 'transparent',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          className="text-xs font-medium w-5 text-center"
          style={{ color: 'var(--gray-400, #9ca3af)' }}
        >
          {index + 1}
        </span>
        <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: color }} />
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--gray-900, #111827)' }}
        >
          {name}
        </span>
      </div>
      <div className="flex items-center gap-3 text-right">
        <span className="text-xs" style={{ color: 'var(--gray-500, #6b7280)' }}>
          {tvs}
        </span>
        <span className="text-sm font-semibold w-12" style={{ color }}>
          {value}%
        </span>
        {route && (
          <Link
            href={route}
            onClick={handleNavClick}
            className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
            title={`查看 ${name} 详情`}
          >
            <ChevronRight
              className={`w-4 h-4 transition-colors ${
                isHovered ? 'text-gray-600' : 'text-gray-400'
              }`}
            />
          </Link>
        )}
      </div>
    </div>
  );
}

const OraclePrefetchCard = memo(OraclePrefetchCardBase);

export default OraclePrefetchCard;
export { oracleRouteMap, oracleProviderMap, oracleSymbolMap };
