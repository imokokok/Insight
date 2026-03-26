'use client';

import { SnapshotComparison } from '@/components/oracle/data-display/SnapshotComparison';
import { SnapshotManager } from '@/components/oracle/data-display/SnapshotManager';
import {
  type OracleProvider,
  type PriceData,
  type SnapshotStats,
  type OracleSnapshot,
} from '@/types/oracle';

import { oracleNames } from '../../constants';
import { ExportHistoryButton } from '../ExportHistoryButton';

interface HistoryTabProps {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  currentStats: SnapshotStats;
  selectedSnapshot: OracleSnapshot | null;
  setSelectedSnapshot: (snapshot: OracleSnapshot | null) => void;
  showComparison: boolean;
  setShowComparison: (show: boolean) => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: OracleSnapshot) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function HistoryTab({
  selectedSymbol,
  selectedOracles,
  priceData,
  currentStats,
  selectedSnapshot,
  setSelectedSnapshot,
  showComparison,
  setShowComparison,
  handleSaveSnapshot,
  handleSelectSnapshot,
  t,
}: HistoryTabProps) {
  return (
    <>
      {/* 导出历史数据功能入口 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t('crossOracle.historyTab.title')}</h2>
        <ExportHistoryButton
          selectedSymbol={selectedSymbol}
          selectedOracles={selectedOracles}
          oracleNames={oracleNames}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SnapshotManager
            onSaveSnapshot={handleSaveSnapshot}
            onSelectSnapshot={handleSelectSnapshot}
            selectedSnapshotId={selectedSnapshot?.id}
          />
        </div>
        <div className="lg:col-span-2">
          {showComparison && selectedSnapshot ? (
            <SnapshotComparison
              currentStats={currentStats}
              currentPriceData={priceData}
              currentSymbol={selectedSymbol}
              selectedSnapshot={selectedSnapshot}
              onClose={() => {
                setShowComparison(false);
                setSelectedSnapshot(null);
              }}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed h-full min-h-[200px] flex items-center justify-center rounded-lg">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto text-gray-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">
                  {t('crossOracle.historyTab.selectSnapshot')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('crossOracle.historyTab.selectHint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
