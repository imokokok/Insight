'use client';

import React, { createContext, useContext, ReactNode, RefObject } from 'react';
import { OracleProvider } from '@/types/oracle';
import { OracleSnapshot } from '@/types/oracle';

interface UIStateContextValue {
  // 加载状态
  isLoading: boolean;
  
  // 选中状态
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  hoveredOracle: OracleProvider | null;
  selectedPerformanceOracle: OracleProvider | null;
  expandedRow: number | null;
  highlightedOutlierIndex: number | null;
  
  // 全屏状态
  isChartFullscreen: boolean;
  
  // 筛选面板状态
  isFilterPanelOpen: boolean;
  
  // 收藏下拉框状态
  showFavoritesDropdown: boolean;
  
  // 快照状态
  selectedSnapshot: OracleSnapshot | null;
  showComparison: boolean;
  
  // Refs
  chartContainerRef: RefObject<HTMLDivElement | null>;
  filterPanelRef: RefObject<HTMLDivElement | null>;
  favoritesDropdownRef: RefObject<HTMLDivElement | null>;
  tableRef: RefObject<HTMLTableSectionElement | null>;
  
  // 操作方法
  setSelectedRowIndex: (index: number | null) => void;
  setHoveredRowIndex: (index: number | null) => void;
  setHoveredOracle: (oracle: OracleProvider | null) => void;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  setExpandedRow: (row: number | null) => void;
  setHighlightedOutlierIndex: (index: number | null) => void;
  setIsChartFullscreen: (fullscreen: boolean) => void;
  setIsFilterPanelOpen: (open: boolean) => void;
  setShowFavoritesDropdown: (show: boolean) => void;
  setSelectedSnapshot: (snapshot: OracleSnapshot | null) => void;
  setShowComparison: (show: boolean) => void;
}

const UIStateContext = createContext<UIStateContextValue | null>(null);

interface UIStateProviderProps {
  children: ReactNode;
  value: UIStateContextValue;
}

export function UIStateProvider({ children, value }: UIStateProviderProps) {
  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within UIStateProvider');
  }
  return context;
}
