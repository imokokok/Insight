'use client';

import { useMemo } from 'react';

import { oracleConfigs } from '@/lib/config/oracles';
import { chainNames, chainColors, getChainCategory, providerNames } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  type Blockchain,
  type OracleProvider,
  BLOCKCHAIN_VALUES,
  ORACLE_PROVIDER_VALUES,
} from '@/types/oracle';

interface ChainCoverageHeatmapProps {
  className?: string;
  showLabels?: boolean;
  onCellClick?: (provider: OracleProvider, chain: Blockchain) => void;
}

export function ChainCoverageHeatmap({
  className,
  showLabels = true,
  onCellClick,
}: ChainCoverageHeatmapProps) {
  // 获取所有预言机和链
  const providers = useMemo(() => [...ORACLE_PROVIDER_VALUES], []);

  // 按类别排序链
  const chains = useMemo(() => {
    const allChains = [...BLOCKCHAIN_VALUES];
    const categoryOrder: Record<string, number> = { l2: 0, l1: 1, cosmos: 2, other: 3 };
    return allChains.sort((a: Blockchain, b: Blockchain) => {
      const catA = getChainCategory(a);
      const catB = getChainCategory(b);
      if (categoryOrder[catA] !== categoryOrder[catB]) {
        return categoryOrder[catA] - categoryOrder[catB];
      }
      return chainNames[a].localeCompare(chainNames[b]);
    });
  }, []);

  // 计算覆盖数据
  const coverageData = useMemo(() => {
    const data: Record<OracleProvider, Record<Blockchain, boolean>> = {} as Record<
      OracleProvider,
      Record<Blockchain, boolean>
    >;

    providers.forEach((provider) => {
      const config = oracleConfigs[provider];
      data[provider] = {} as Record<Blockchain, boolean>;
      chains.forEach((chain: Blockchain) => {
        data[provider][chain] = config.supportedChains.includes(chain);
      });
    });

    return data;
  }, [providers, chains]);

  // 计算链覆盖率
  const getChainCoverage = (chain: Blockchain): number => {
    let count = 0;
    providers.forEach((provider) => {
      if (coverageData[provider][chain]) count++;
    });
    return (count / providers.length) * 100;
  };

  // 计算预言机覆盖率
  const getProviderCoverage = (provider: OracleProvider): number => {
    const config = oracleConfigs[provider];
    return (config.supportedChains.length / chains.length) * 100;
  };

  // 获取单元格颜色
  const getCellColor = (isSupported: boolean, coverage: number): string => {
    if (!isSupported) return 'bg-gray-100';
    if (coverage >= 80) return 'bg-emerald-500';
    if (coverage >= 60) return 'bg-emerald-400';
    if (coverage >= 40) return 'bg-emerald-300';
    if (coverage >= 20) return 'bg-emerald-200';
    return 'bg-emerald-100';
  };

  // 获取文字颜色
  const getTextColor = (isSupported: boolean, coverage: number): string => {
    if (!isSupported) return 'text-gray-300';
    if (coverage >= 60) return 'text-white';
    return 'text-emerald-900';
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">预言机链覆盖热力图</h3>
        <p className="text-xs text-gray-500 mt-0.5">展示各预言机对不同区块链的支持情况</p>
      </div>

      {/* 热力图 */}
      <div className="overflow-x-auto">
        <div className="min-w-max p-4">
          {/* 表头 - 链名称 */}
          <div className="flex">
            {/* 左上角空白 */}
            <div className="w-32 flex-shrink-0" />
            {/* 链标签 */}
            <div className="flex">
              {chains.map((chain: Blockchain) => (
                <div
                  key={chain}
                  className="w-8 flex-shrink-0 flex flex-col items-center"
                  title={`${chainNames[chain]} (${getChainCategory(chain).toUpperCase()})`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainColors[chain] }}
                  />
                  {showLabels && (
                    <span className="text-[10px] text-gray-500 mt-1 rotate-45 origin-left translate-y-2">
                      {chainNames[chain].slice(0, 3)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* 覆盖率列 */}
            <div className="w-16 flex-shrink-0 flex items-center justify-center ml-2">
              <span className="text-xs font-medium text-gray-500">覆盖率</span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="h-px bg-gray-200 my-2" />

          {/* 数据行 */}
          {providers.map((provider) => {
            const providerCoverage = getProviderCoverage(provider);

            return (
              <div key={provider} className="flex items-center py-1">
                {/* 预言机名称 */}
                <div className="w-32 flex-shrink-0 pr-2">
                  <span className="text-xs font-medium text-gray-700 truncate block">
                    {providerNames[provider]}
                  </span>
                </div>

                {/* 覆盖单元格 */}
                <div className="flex">
                  {chains.map((chain: Blockchain) => {
                    const isSupported = coverageData[provider][chain];
                    const chainCoverage = getChainCoverage(chain);

                    return (
                      <button
                        key={`${provider}-${chain}`}
                        onClick={() => onCellClick?.(provider, chain)}
                        className={cn(
                          'w-8 h-8 flex-shrink-0 flex items-center justify-center',
                          'transition-all duration-200 hover:scale-110 hover:z-10',
                          'border border-white/50 rounded-sm',
                          getCellColor(isSupported, chainCoverage),
                          onCellClick && isSupported && 'cursor-pointer hover:shadow-md'
                        )}
                        title={`${providerNames[provider]} - ${chainNames[chain]}: ${isSupported ? '支持' : '不支持'}`}
                      >
                        {isSupported && (
                          <span
                            className={cn(
                              'text-xs font-bold',
                              getTextColor(isSupported, chainCoverage)
                            )}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 覆盖率 */}
                <div className="w-16 flex-shrink-0 flex items-center justify-center ml-2">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      providerCoverage >= 50 ? 'text-emerald-600' : 'text-gray-500'
                    )}
                  >
                    {providerCoverage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* 分隔线 */}
          <div className="h-px bg-gray-200 my-2" />

          {/* 链覆盖率行 */}
          <div className="flex items-center">
            <div className="w-32 flex-shrink-0 pr-2">
              <span className="text-xs font-medium text-gray-500">链覆盖率</span>
            </div>
            <div className="flex">
              {chains.map((chain: Blockchain) => {
                const coverage = getChainCoverage(chain);
                return (
                  <div
                    key={`coverage-${chain}`}
                    className="w-8 flex-shrink-0 flex items-center justify-center"
                    title={`${chainNames[chain]}: ${coverage.toFixed(0)}% 的预言机支持`}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        coverage >= 50 ? 'text-emerald-600' : 'text-gray-400'
                      )}
                    >
                      {coverage >= 50 ? '●' : '○'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">覆盖率:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-100 rounded-sm" />
            <span className="text-gray-500">&lt;20%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-200 rounded-sm" />
            <span className="text-gray-500">20-40%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-300 rounded-sm" />
            <span className="text-gray-500">40-60%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-400 rounded-sm" />
            <span className="text-gray-500">60-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
            <span className="text-gray-500">80%+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChainCoverageHeatmap;
