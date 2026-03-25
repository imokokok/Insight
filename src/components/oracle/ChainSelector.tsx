'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Blockchain, OracleProvider, BLOCKCHAIN_VALUES } from '@/types/oracle';
import { chainNames, chainColors, getChainsByCategory, getChainCategory } from '@/lib/constants';
import { oracleConfigs } from '@/lib/config/oracles';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChainSelectorProps {
  selectedChains: Blockchain[];
  onChainsChange: (chains: Blockchain[]) => void;
  supportedChains?: Blockchain[];
  allowMultiSelect?: boolean;
  filterByType?: 'all' | 'l1' | 'l2' | 'cosmos';
  showOracleCount?: boolean;
  className?: string;
  placeholder?: string;
}

const categoryLabels: Record<string, string> = {
  all: '全部',
  l1: 'Layer 1',
  l2: 'Layer 2',
  cosmos: 'Cosmos',
};

// Custom comparison function for ChainSelector props
function arePropsEqual(prevProps: ChainSelectorProps, nextProps: ChainSelectorProps): boolean {
  // Compare primitive props
  if (prevProps.allowMultiSelect !== nextProps.allowMultiSelect) return false;
  if (prevProps.filterByType !== nextProps.filterByType) return false;
  if (prevProps.showOracleCount !== nextProps.showOracleCount) return false;
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.onChainsChange !== nextProps.onChainsChange) return false;

  // Compare arrays by length and content
  if (prevProps.selectedChains.length !== nextProps.selectedChains.length) return false;
  for (let i = 0; i < prevProps.selectedChains.length; i++) {
    if (prevProps.selectedChains[i] !== nextProps.selectedChains[i]) {
      return false;
    }
  }

  // Compare supportedChains
  if (prevProps.supportedChains !== nextProps.supportedChains) {
    if (!prevProps.supportedChains || !nextProps.supportedChains) return false;
    if (prevProps.supportedChains.length !== nextProps.supportedChains.length) return false;
    for (let i = 0; i < prevProps.supportedChains.length; i++) {
      if (prevProps.supportedChains[i] !== nextProps.supportedChains[i]) {
        return false;
      }
    }
  }

  return true;
}

function ChainSelectorComponent({
  selectedChains,
  onChainsChange,
  supportedChains,
  allowMultiSelect = false,
  filterByType = 'all',
  showOracleCount = false,
  className,
  placeholder = '选择链...',
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'l1' | 'l2' | 'cosmos'>(filterByType);

  // 获取可用的链列表
  const availableChains = useMemo(() => {
    let chains = supportedChains || BLOCKCHAIN_VALUES;
    if (activeFilter !== 'all') {
      const filteredByCategory = getChainsByCategory(activeFilter);
      chains = chains.filter((chain) => filteredByCategory.includes(chain));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      chains = chains.filter(
        (chain) =>
          chainNames[chain].toLowerCase().includes(query) ||
          chain.toLowerCase().includes(query)
      );
    }
    return chains;
  }, [supportedChains, activeFilter, searchQuery]);

  // 计算每条链支持的预言机数量
  const getOracleCountForChain = (chain: Blockchain): number => {
    return Object.values(oracleConfigs).filter((config) =>
      config.supportedChains.includes(chain)
    ).length;
  };

  // 处理链选择
  const handleChainSelect = useCallback((chain: Blockchain) => {
    if (allowMultiSelect) {
      if (selectedChains.includes(chain)) {
        onChainsChange(selectedChains.filter((c) => c !== chain));
      } else {
        onChainsChange([...selectedChains, chain]);
      }
    } else {
      onChainsChange([chain]);
      setIsOpen(false);
    }
  }, [allowMultiSelect, selectedChains, onChainsChange]);

  // 清除选择
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChainsChange([]);
  }, [onChainsChange]);

  // 获取选中链的显示文本
  const getSelectedLabel = (): string => {
    if (selectedChains.length === 0) return placeholder;
    if (selectedChains.length === 1) return chainNames[selectedChains[0]];
    return `已选择 ${selectedChains.length} 条链`;
  };

  return (
    <div className={cn('relative', className)}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-4 py-2.5',
          'bg-white border border-gray-200 rounded-lg',
          'hover:border-gray-300 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          isOpen && 'border-blue-500 ring-2 ring-blue-500/20'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedChains.length > 0 && !allowMultiSelect && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: chainColors[selectedChains[0]] }}
            />
          )}
          <span className={cn('text-sm truncate', selectedChains.length === 0 && 'text-gray-400')}>
            {getSelectedLabel()}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedChains.length > 0 && allowMultiSelect && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索链..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 类型筛选 */}
          <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
            {(['all', 'l1', 'l2', 'cosmos'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                  activeFilter === type
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {categoryLabels[type]}
              </button>
            ))}
          </div>

          {/* 链列表 */}
          <div className="max-h-64 overflow-y-auto py-1">
            {availableChains.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">未找到匹配的链</div>
            ) : (
              availableChains.map((chain) => {
                const isSelected = selectedChains.includes(chain);
                const oracleCount = showOracleCount ? getOracleCountForChain(chain) : 0;
                const category = getChainCategory(chain);

                return (
                  <button
                    key={chain}
                    onClick={() => handleChainSelect(chain)}
                    className={cn(
                      'flex items-center justify-between w-full px-4 py-2.5',
                      'hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chainColors[chain] }}
                      />
                      <div className="flex flex-col items-start">
                        <span className={cn('text-sm font-medium', isSelected && 'text-blue-700')}>
                          {chainNames[chain]}
                        </span>
                        <span className="text-xs text-gray-400">{category.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showOracleCount && oracleCount > 0 && (
                        <span className="text-xs text-gray-400">{oracleCount} 个预言机</span>
                      )}
                      {isSelected && allowMultiSelect && (
                        <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 底部操作栏（多选模式） */}
          {allowMultiSelect && selectedChains.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <span className="text-xs text-gray-500">已选择 {selectedChains.length} 条链</span>
              <button
                onClick={() => onChainsChange([])}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                清除全部
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export memoized component
export const ChainSelector = memo(ChainSelectorComponent, arePropsEqual);
export default ChainSelector;
